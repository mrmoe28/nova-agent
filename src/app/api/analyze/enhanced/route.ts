/**
 * Enhanced Bill Analysis API Endpoint
 * Integrates OCR processing, bill parsing, tariff lookup, and validation
 * for comprehensive bill analysis with accuracy tracking and monitoring
 */

import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from 'uuid';
import { Prisma } from '@prisma/client';
import { billParser } from "@/lib/bill-parser";
import { tariffService } from "@/lib/tariff-service";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  BillAnalysisResponse,
  SystemAlert,
  EnergyAnalysisError,
  BillParsingError,
  TariffLookupError,
  ParsedBillData,
  LoadProfile
} from "@/types/energy";

interface AnalyzeRequest {
  projectId: string;
  billFiles: Array<{
    fileName: string;
    filePath: string;
    fileType: string;
  }>;
  location?: {
    latitude: number;
    longitude: number;
    zipCode?: string;
    state?: string;
  };
  options?: {
    skipTariffLookup?: boolean;
    confidenceThreshold?: number;
    enableDetailedLogging?: boolean;
  };
}

/**
 * Enhanced Bill Analysis Endpoint
 * POST /api/analyze/enhanced
 */
export async function POST(request: NextRequest) {
  const correlationId = uuidv4();
  const startTime = Date.now();

  try {
    logger.info({ correlationId }, 'Enhanced bill analysis started');

    const body: AnalyzeRequest = await request.json();
    const { projectId, billFiles, location, options = {} } = body;

    // Validate request
    if (!projectId) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'MISSING_PROJECT_ID',
          message: 'Project ID is required',
          recoverable: false
        }
      } satisfies BillAnalysisResponse, { status: 400 });
    }

    if (!billFiles || billFiles.length === 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'NO_BILLS_PROVIDED',
          message: 'At least one bill file is required',
          recoverable: false
        }
      } satisfies BillAnalysisResponse, { status: 400 });
    }

    // Initialize result containers
    const parsedBills: ParsedBillData[] = [];
    const systemAlerts: SystemAlert[] = [];
    let overallConfidence = 0;
    let totalVariance = 0;

    // Process each bill file
    for (const billFile of billFiles) {
      try {
        logger.info({ 
          fileName: billFile.fileName, 
          correlationId 
        }, 'Processing bill file');

        // Step 1: OCR and Parse Bill
        const billResult = await billParser.processBill(
          billFile.filePath,
          billFile.fileName,
          billFile.fileType,
          correlationId
        );

        const { ocrResult, parsedData, validation } = billResult;

        // Check confidence thresholds
        const confidenceThreshold = options.confidenceThreshold || 0.7;
        if (validation.confidence < confidenceThreshold) {
          systemAlerts.push({
            id: uuidv4(),
            projectId,
            type: 'ocr_low_confidence',
            severity: validation.confidence < 0.5 ? 'error' : 'warning',
            message: `Low confidence bill parsing: ${(validation.confidence * 100).toFixed(1)}%`,
            details: { 
              fileName: billFile.fileName, 
              confidence: validation.confidence,
              ocrConfidence: ocrResult.confidence,
              parseConfidence: parsedData.parseConfidence
            },
            suggestedActions: [
              'Upload a clearer image or PDF',
              'Verify extracted data manually',
              'Check for complex bill layouts'
            ],
            status: 'open',
            createdAt: new Date()
          });
        }

        // Check for parsing errors
        if (parsedData.errors.length > 0) {
          systemAlerts.push({
            id: uuidv4(),
            projectId,
            type: 'bill_parsing_error',
            severity: 'error',
            message: `Bill parsing errors detected: ${parsedData.errors.join(', ')}`,
            details: { 
              fileName: billFile.fileName, 
              errors: parsedData.errors,
              warnings: parsedData.warnings
            },
            suggestedActions: [
              'Review bill layout for missing information',
              'Upload additional bill pages if incomplete',
              'Verify critical fields manually'
            ],
            status: 'open',
            createdAt: new Date()
          });
        }

        // Save enhanced bill data to database
        await prisma.enhancedBill.create({
          data: {
            projectId,
            originalBillId: billFile.fileName, // Would reference actual Bill ID
            parsedData: parsedData as unknown as Prisma.InputJsonValue,
            lineItems: parsedData.lineItems as unknown as Prisma.InputJsonValue,
            ocrResult: ocrResult as unknown as Prisma.InputJsonValue,
            parseConfidence: parsedData.parseConfidence,
            totalVariance: parsedData.totalVariance,
            validationResult: validation as unknown as Prisma.InputJsonValue,
            rateSchedule: parsedData.rateSchedule,
            processingMethod: ocrResult.processingMethod,
            processingTime: ocrResult.processingTime,
            correlationId
          }
        });

        parsedBills.push(parsedData);

        // Update running totals
        overallConfidence += validation.confidence;
        totalVariance += parsedData.totalVariance;

        logger.info({
          fileName: billFile.fileName,
          confidence: validation.confidence,
          variance: parsedData.totalVariance,
          correlationId
        }, 'Bill processing completed');

      } catch (error) {
        logger.error({
          fileName: billFile.fileName,
          error: error instanceof Error ? error.message : 'Unknown error',
          correlationId
        }, 'Bill processing failed');

        // Add error alert
        systemAlerts.push({
          id: uuidv4(),
          projectId,
          type: 'bill_parsing_error',
          severity: 'error',
          message: `Failed to process bill: ${billFile.fileName}`,
          details: { 
            fileName: billFile.fileName,
            error: error instanceof Error ? error.message : 'Unknown error'
          },
          suggestedActions: [
            'Check file format and quality',
            'Retry with different OCR settings',
            'Process manually if needed'
          ],
          status: 'open',
          createdAt: new Date()
        });

        // Continue processing other bills
        continue;
      }
    }

    // Calculate averages
    const billCount = parsedBills.length;
    if (billCount === 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'NO_BILLS_PROCESSED',
          message: 'No bills could be processed successfully',
          recoverable: true
        },
        warnings: [`${billFiles.length} bill(s) failed to process`],
        metadata: {
          processingTime: Date.now() - startTime,
          correlationId
        }
      } satisfies BillAnalysisResponse, { status: 422 });
    }

    overallConfidence /= billCount;
    totalVariance /= billCount;

    // Step 2: Tariff Lookup (if enabled and we have utility info)
    let tariff = null;
    if (!options.skipTariffLookup && parsedBills.length > 0) {
      const firstBill = parsedBills[0];
      
      if (firstBill.utilityName || firstBill.rateSchedule) {
        try {
          logger.info({
            utilityName: firstBill.utilityName,
            rateSchedule: firstBill.rateSchedule,
            correlationId
          }, 'Starting tariff lookup');

          if (firstBill.rateSchedule && firstBill.utilityName) {
            tariff = await tariffService.findTariffBySchedule(
              firstBill.utilityName,
              firstBill.rateSchedule,
              location?.zipCode
            );
          } else {
            const tariffs = await tariffService.findTariffs({
              utilityName: firstBill.utilityName,
              zipCode: location?.zipCode,
              state: location?.state,
              sector: 'residential'
            });
            tariff = tariffs.length > 0 ? tariffs[0] : null;
          }

          if (tariff) {
            logger.info({
              tariffId: tariff.id,
              tariffName: tariff.tariffName,
              correlationId
            }, 'Tariff found');

            // Validate tariff against bill data
            const tariffValidation = await tariffService.validateTariffMatch(
              tariff,
              {
                utilityName: firstBill.utilityName,
                rateSchedule: firstBill.rateSchedule,
                serviceAddress: firstBill.serviceAddress
              }
            );

            if (!tariffValidation.isMatch || tariffValidation.confidence < 0.7) {
              systemAlerts.push({
                id: uuidv4(),
                projectId,
                type: 'tariff_unavailable',
                severity: 'warning',
                message: `Tariff match confidence is low: ${(tariffValidation.confidence * 100).toFixed(1)}%`,
                details: {
                  tariffId: tariff.id,
                  matchConfidence: tariffValidation.confidence,
                  reasons: tariffValidation.reasons
                },
                suggestedActions: [
                  'Verify utility name and rate schedule',
                  'Check service address for territory matching',
                  'Consider manual tariff selection'
                ],
                status: 'open',
                createdAt: new Date()
              });
            }

            // Update enhanced bills with tariff association
            await prisma.enhancedBill.updateMany({
              where: { projectId, correlationId },
              data: { tariffId: tariff.id }
            });
          } else {
            systemAlerts.push({
              id: uuidv4(),
              projectId,
              type: 'tariff_unavailable',
              severity: 'warning',
              message: 'No matching tariff found for utility',
              details: {
                utilityName: firstBill.utilityName,
                rateSchedule: firstBill.rateSchedule,
                location: location
              },
              suggestedActions: [
                'Verify utility name spelling',
                'Check if utility is supported',
                'Use manual tariff entry'
              ],
              status: 'open',
              createdAt: new Date()
            });
          }

        } catch (error) {
          logger.warn({
            error: error instanceof Error ? error.message : 'Unknown error',
            correlationId
          }, 'Tariff lookup failed');

          if (error instanceof TariffLookupError) {
            systemAlerts.push({
              id: uuidv4(),
              projectId,
              type: 'tariff_unavailable',
              severity: 'warning',
              message: error.message,
              details: { 
                utilityName: error.utilityName,
                originalError: error.details
              },
              suggestedActions: [
                'Check internet connectivity',
                'Retry tariff lookup later',
                'Use manual tariff entry'
              ],
              status: 'open',
              createdAt: new Date()
            });
          }
        }
      }
    }

    // Step 3: Generate Load Profile (basic monthly from bills)
    let loadProfile = null;
    try {
      if (parsedBills.length >= 3) { // Need at least 3 bills for meaningful profile
        const monthlyDataPoints = parsedBills.map(bill => ({
          timestamp: bill.billDate,
          kwhUsage: bill.totalKwh,
          kwDemand: bill.peakKw,
          isEstimated: bill.billingPeriod.isEstimated
        }));

        const annualKwh = parsedBills.reduce((sum, bill) => sum + bill.totalKwh, 0);
        const peakKw = Math.max(...parsedBills.map(bill => bill.peakKw || 0));
        const avgMonthlyUsage = annualKwh / 12; // Normalize to 12 months
        const loadFactor = avgMonthlyUsage / (peakKw * 24 * 30); // Simplified calculation

        loadProfile = await prisma.loadProfile.create({
          data: {
            projectId,
            profileType: 'monthly',
            dataPoints: monthlyDataPoints as unknown as Prisma.InputJsonValue,
            annualKwh: annualKwh * (12 / parsedBills.length), // Annualize
            peakKw: peakKw,
            loadFactor: Math.min(loadFactor, 1), // Cap at 1.0
            dataCompleteness: parsedBills.length / 12, // Percentage of year covered
            estimationMethod: 'bill_disaggregation',
            confidence: overallConfidence * (parsedBills.length / 12) // Reduce if incomplete
          }
        });

        logger.info({
          profileId: loadProfile.id,
          dataCompleteness: loadProfile.dataCompleteness,
          correlationId
        }, 'Load profile created');
      }
    } catch (error) {
      logger.warn({
        error: error instanceof Error ? error.message : 'Unknown error',
        correlationId
      }, 'Load profile creation failed');
    }

    // Step 4: Save Project Metrics
    try {
      await prisma.projectMetrics.upsert({
        where: { projectId },
        create: {
          projectId,
          billParsingAccuracy: overallConfidence,
          ocrConfidence: overallConfidence,
          totalBillVariance: totalVariance,
          detectedAnomalies: systemAlerts.filter(alert => alert.severity === 'error').length,
          overallConfidence: overallConfidence,
          riskFactors: systemAlerts.map(alert => alert.message),
          recommendationsQuality: overallConfidence > 0.8 ? 'high' : overallConfidence > 0.6 ? 'medium' : 'low'
        },
        update: {
          billParsingAccuracy: overallConfidence,
          ocrConfidence: overallConfidence,
          totalBillVariance: totalVariance,
          detectedAnomalies: systemAlerts.filter(alert => alert.severity === 'error').length,
          overallConfidence: overallConfidence,
          riskFactors: systemAlerts.map(alert => alert.message),
          recommendationsQuality: overallConfidence > 0.8 ? 'high' : overallConfidence > 0.6 ? 'medium' : 'low'
        }
      });
    } catch (error) {
      logger.warn({
        error: error instanceof Error ? error.message : 'Unknown error',
        correlationId
      }, 'Failed to save project metrics');
    }

    // Step 5: Save System Alerts
    if (systemAlerts.length > 0) {
      try {
        await prisma.systemAlert.createMany({
          data: systemAlerts.map(alert => ({
            ...alert,
            details: alert.details as unknown as Prisma.InputJsonValue
          }))
        });
        
        logger.info({
          alertCount: systemAlerts.length,
          severities: systemAlerts.reduce((acc, alert) => {
            acc[alert.severity] = (acc[alert.severity] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          correlationId
        }, 'System alerts created');
      } catch (error) {
        logger.warn({
          error: error instanceof Error ? error.message : 'Unknown error',
          correlationId
        }, 'Failed to save system alerts');
      }
    }

    // Step 6: Generate Recommendations
    const recommendations: string[] = [];

    if (overallConfidence < 0.7) {
      recommendations.push('Review bill parsing results for accuracy - confidence is below recommended threshold');
    }

    if (totalVariance > 0.05) {
      recommendations.push('Verify line item extraction - bill totals show high variance');
    }

    if (!tariff) {
      recommendations.push('Consider adding tariff information for more accurate system sizing');
    }

    if (parsedBills.length < 12) {
      recommendations.push(`Upload more bills for complete analysis - currently have ${parsedBills.length} of 12 months`);
    }

    const hasHighUsage = parsedBills.some(bill => bill.totalKwh > 2000);
    if (hasHighUsage) {
      recommendations.push('High energy usage detected - consider energy efficiency measures before solar sizing');
    }

    // Prepare response
    const response: BillAnalysisResponse = {
      success: true,
      data: {
        parsedBills,
        validation: {
          isValid: overallConfidence >= 0.5 && totalVariance <= 0.1,
          confidence: overallConfidence,
          totalVariance,
          toleranceExceeded: totalVariance > 0.02,
          missingFields: [], // Would aggregate from individual bills
          anomalies: systemAlerts.map(alert => ({
            type: alert.type,
            severity: alert.severity === 'critical' ? 'error' : alert.severity as 'info' | 'warning' | 'error',
            message: alert.message,
            suggestedAction: alert.suggestedActions[0]
          }))
        },
        loadProfile: loadProfile ? {
          ...loadProfile,
          profileType: loadProfile.profileType as 'monthly' | 'hourly' | '15_minute',
          dataPoints: loadProfile.dataPoints as unknown as LoadProfile['dataPoints']
        } as LoadProfile : undefined,
        tariff: tariff || undefined,
        recommendations
      },
      warnings: systemAlerts
        .filter(alert => alert.severity === 'warning')
        .map(alert => alert.message),
      metadata: {
        processingTime: Date.now() - startTime,
        confidence: overallConfidence,
        correlationId
      }
    };

    logger.info({
      projectId,
      billCount: parsedBills.length,
      overallConfidence,
      alertCount: systemAlerts.length,
      processingTime: Date.now() - startTime,
      correlationId
    }, 'Enhanced bill analysis completed successfully');

    return NextResponse.json(response);

  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      correlationId
    }, 'Enhanced bill analysis failed');

    // Determine error type and create appropriate response
    let errorCode = 'ANALYSIS_FAILED';
    let recoverable = true;
    let status = 500;

    if (error instanceof BillParsingError) {
      errorCode = 'BILL_PARSING_FAILED';
      status = 422;
    } else if (error instanceof TariffLookupError) {
      errorCode = 'TARIFF_LOOKUP_FAILED';
      status = 422;
    } else if (error instanceof EnergyAnalysisError) {
      errorCode = error.code;
      recoverable = error.recoverable;
      status = recoverable ? 422 : 500;
    }

    return NextResponse.json({
      success: false,
      error: {
        code: errorCode,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        recoverable,
        details: error instanceof EnergyAnalysisError ? error.details : undefined
      },
      metadata: {
        processingTime: Date.now() - startTime,
        correlationId
      }
    } satisfies BillAnalysisResponse, { status });
  }
}
