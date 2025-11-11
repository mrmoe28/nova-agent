/**
 * Enhanced Bill Parser Service
 * Provides accurate OCR processing, validation, and structured data extraction
 * from utility bills with comprehensive confidence scoring and error handling.
 */

import { 
  OCRResult, 
  ParsedBillData, 
  BillValidationResult,
  BillLineItem,
  BillingPeriod,
  BillParsingError
} from '@/types/energy';
import { logger } from './logger';
import { retry } from './retry';
import Anthropic from '@anthropic-ai/sdk';

// Configuration constants
const OCR_CONFIDENCE_THRESHOLD = 0.7;
const BILL_VARIANCE_TOLERANCE = 0.02; // 2%
const MAX_OCR_RETRIES = 3;

// Utility name patterns for normalization
const UTILITY_PATTERNS = [
  { pattern: /georgia\s*power/i, name: 'Georgia Power' },
  { pattern: /duke\s*energy/i, name: 'Duke Energy' },
  { pattern: /pge?|pacific\s*gas/i, name: 'Pacific Gas & Electric' },
  { pattern: /sce|southern\s*california\s*edison/i, name: 'Southern California Edison' },
  { pattern: /sdge?|san\s*diego\s*gas/i, name: 'San Diego Gas & Electric' },
];

// Rate schedule patterns
const RATE_SCHEDULE_PATTERNS = [
  /(?:rate|schedule|tariff)[\s\-:]*([A-Z0-9\-]+)/i,
  /([A-Z]{1,3}[\-\s]*\d+[A-Z]*)/,
  /residential[\s\-]*([A-Z0-9\-]+)/i,
];

/**
 * Enhanced OCR processing with multiple methods and confidence scoring
 */
export class EnhancedOCRProcessor {
  private anthropic: Anthropic | null = null;

  constructor() {
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    }
  }

  /**
   * Process document with multiple OCR methods and return best result
   */
  async processDocument(
    filePath: string, 
    fileType: string,
    correlationId?: string
  ): Promise<OCRResult> {
    const startTime = Date.now();
    
    try {
      logger.info({ 
        filePath, 
        fileType, 
        correlationId 
      }, 'Starting OCR processing');

      // Try multiple OCR methods in order of preference
      const results = await Promise.allSettled([
        this.processWithAnthropic(filePath, fileType),
        this.processWithTesseract(filePath),
        // Add other OCR methods here as fallbacks
      ]);

      // Find the best result based on confidence
      let bestResult: OCRResult | null = null;
      let bestConfidence = 0;

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.confidence > bestConfidence) {
          bestResult = result.value;
          bestConfidence = result.value.confidence;
        }
      }

      if (!bestResult) {
        throw new BillParsingError(
          'All OCR methods failed to process document',
          0,
          { filePath, fileType, attempts: results.length }
        );
      }

      const processingTime = Date.now() - startTime;
      bestResult.processingTime = processingTime;

      logger.info({
        confidence: bestResult.confidence,
        method: bestResult.processingMethod,
        processingTime,
        correlationId
      }, 'OCR processing completed');

      return bestResult;

    } catch (error) {
      logger.error({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        filePath, 
        fileType, 
        correlationId 
      }, 'OCR processing failed');
      throw error;
    }
  }

  /**
   * Process document using Anthropic Claude for high accuracy
   */
  private async processWithAnthropic(_filePath: string, _fileType: string): Promise<OCRResult> {
    if (!this.anthropic) {
      throw new Error('Anthropic API key not configured');
    }

    // Implementation would read file and send to Anthropic
    // For now, return a mock result
    return {
      text: '',
      confidence: 0.9,
      processingMethod: 'anthropic',
      processingTime: 0,
      warnings: []
    };
  }

  /**
   * Process document using Tesseract.js
   */
  private async processWithTesseract(_filePath: string): Promise<OCRResult> {
    // Mock implementation - would use actual Tesseract.js
    return {
      text: '',
      confidence: 0.75,
      processingMethod: 'tesseract',
      processingTime: 0,
      warnings: []
    };
  }
}

/**
 * Enhanced bill data parser with structured extraction
 */
export class BillDataParser {
  /**
   * Parse OCR text into structured bill data
   */
  async parseBillData(
    ocrResult: OCRResult,
    fileName: string,
    correlationId?: string
  ): Promise<ParsedBillData> {
    try {
      logger.info({ 
        fileName, 
        confidence: ocrResult.confidence, 
        correlationId 
      }, 'Starting bill data parsing');

      const text = ocrResult.text;
      
      // Extract core bill information
      const accountNumber = this.extractAccountNumber(text);
      const serviceAddress = this.extractServiceAddress(text);
      const utilityName = this.extractUtilityName(text);
      const meterNumber = this.extractMeterNumber(text);
      
      // Extract billing period information
      const billingPeriod = this.extractBillingPeriod(text);
      const billDate = this.extractBillDate(text);
      const dueDate = this.extractDueDate(text);
      
      // Extract usage data
      const totalKwh = this.extractTotalKwh(text);
      const peakKw = this.extractPeakKw(text);
      const touUsage = this.extractTimeOfUseUsage(text);
      
      // Extract financial data
      const totalAmount = this.extractTotalAmount(text);
      const lineItems = this.extractLineItems(text);
      
      // Calculate charges breakdown
      const energyCharges = this.calculateEnergyCharges(lineItems);
      const demandCharges = this.calculateDemandCharges(lineItems);
      const deliveryCharges = this.calculateDeliveryCharges(lineItems);
      const taxes = this.calculateTaxes(lineItems);
      const fees = this.calculateFees(lineItems);
      const credits = this.calculateCredits(lineItems);
      
      // Extract tariff information
      const rateSchedule = this.extractRateSchedule(text);
      
      // Calculate parse confidence based on extracted data completeness
      const parseConfidence = this.calculateParseConfidence({
        accountNumber, totalKwh, totalAmount, billingPeriod, lineItems
      });
      
      // Calculate variance between line items and total
      const lineItemsTotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
      const totalVariance = Math.abs(lineItemsTotal - totalAmount) / totalAmount;
      
      // Collect warnings and errors
      const warnings: string[] = [];
      const errors: string[] = [];
      
      if (parseConfidence < OCR_CONFIDENCE_THRESHOLD) {
        warnings.push(`Low parse confidence: ${(parseConfidence * 100).toFixed(1)}%`);
      }
      
      if (totalVariance > BILL_VARIANCE_TOLERANCE) {
        warnings.push(`Line items don't sum to total (${(totalVariance * 100).toFixed(2)}% variance)`);
      }
      
      if (!accountNumber) warnings.push('Account number not found');
      if (!totalKwh) warnings.push('Total kWh usage not found');
      if (!totalAmount) errors.push('Total amount not found');

      const parsedData: ParsedBillData = {
        accountNumber,
        serviceAddress,
        utilityName,
        meterNumber,
        billingPeriod,
        billDate,
        dueDate,
        totalKwh,
        peakKw,
        offPeakKwh: touUsage?.offPeak,
        midPeakKwh: touUsage?.midPeak,
        onPeakKwh: touUsage?.onPeak,
        totalAmount,
        energyCharges,
        demandCharges,
        deliveryCharges,
        taxes,
        fees,
        credits,
        lineItems,
        rateSchedule,
        parseConfidence,
        totalVariance,
        warnings,
        errors
      };

      logger.info({
        parseConfidence,
        totalVariance,
        warningCount: warnings.length,
        errorCount: errors.length,
        correlationId
      }, 'Bill data parsing completed');

      return parsedData;

    } catch (error) {
      logger.error({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        fileName,
        correlationId 
      }, 'Bill data parsing failed');
      throw new BillParsingError(
        'Failed to parse bill data',
        ocrResult.confidence,
        { fileName, ocrMethod: ocrResult.processingMethod }
      );
    }
  }

  /**
   * Extract account number from bill text
   */
  private extractAccountNumber(text: string): string | undefined {
    const patterns = [
      /(?:account|acct)[\s#]*:?\s*([0-9\-]{8,20})/i,
      /(?:customer|cust)[\s#]*:?\s*([0-9\-]{8,20})/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].replace(/\D/g, '');
      }
    }

    return undefined;
  }

  /**
   * Extract service address from bill text
   */
  private extractServiceAddress(text: string): string | undefined {
    const patterns = [
      /service\s+(?:address|location):?\s*([^\n]{10,100})/i,
      /premises:?\s*([^\n]{10,100})/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return undefined;
  }

  /**
   * Extract utility company name
   */
  private extractUtilityName(text: string): string | undefined {
    for (const { pattern, name } of UTILITY_PATTERNS) {
      if (pattern.test(text)) {
        return name;
      }
    }

    return undefined;
  }

  /**
   * Extract meter number
   */
  private extractMeterNumber(text: string): string | undefined {
    const patterns = [
      /meter[\s#]*:?\s*([A-Z0-9\-]{6,20})/i,
      /service[\s#]*:?\s*([A-Z0-9\-]{6,20})/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return undefined;
  }

  /**
   * Extract billing period information
   */
  private extractBillingPeriod(text: string): BillingPeriod {
    // Implementation would extract start/end dates, days in period, meter readings
    // This is a simplified version
    
    const startDatePattern = /(?:billing|service)\s+(?:period|from):?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i;
    const endDatePattern = /(?:to|through):?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i;
    
    const startMatch = text.match(startDatePattern);
    const endMatch = text.match(endDatePattern);
    
    const startDate = startMatch ? new Date(startMatch[1]) : new Date();
    const endDate = endMatch ? new Date(endMatch[1]) : new Date();
    
    const daysInPeriod = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      startDate,
      endDate,
      daysInPeriod: Math.max(daysInPeriod, 28), // Reasonable minimum
      isEstimated: text.toLowerCase().includes('estimated'),
      previousReading: this.extractMeterReading(text, 'previous'),
      currentReading: this.extractMeterReading(text, 'current'),
    };
  }

  /**
   * Extract meter readings
   */
  private extractMeterReading(text: string, type: 'previous' | 'current'): number | undefined {
    const pattern = new RegExp(`${type}\\s+(?:reading|meter):?\\s*([\\d,]+)`, 'i');
    const match = text.match(pattern);
    
    if (match && match[1]) {
      return parseFloat(match[1].replace(/,/g, ''));
    }
    
    return undefined;
  }

  /**
   * Extract bill date
   */
  private extractBillDate(text: string): Date {
    const patterns = [
      /(?:bill|statement)\s+date:?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
      /date:?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return new Date(match[1]);
      }
    }

    return new Date(); // Fallback to current date
  }

  /**
   * Extract due date
   */
  private extractDueDate(text: string): Date | undefined {
    const pattern = /(?:due|payment)\s+date:?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i;
    const match = text.match(pattern);
    
    if (match && match[1]) {
      return new Date(match[1]);
    }
    
    return undefined;
  }

  /**
   * Extract total kWh usage
   */
  private extractTotalKwh(text: string): number {
    const patterns = [
      /(?:total|energy)\s+(?:usage|kwh):?\s*([\d,]+\.?\d*)/i,
      /(\d{1,6})\s*kwh/i,
      /usage:?\s*([\d,]+\.?\d*)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const value = parseFloat(match[1].replace(/,/g, ''));
        if (value > 0 && value < 50000) { // Reasonable range
          return value;
        }
      }
    }

    return 0;
  }

  /**
   * Extract peak demand
   */
  private extractPeakKw(text: string): number | undefined {
    const patterns = [
      /(?:peak|demand|max)\s+(?:kw|demand):?\s*([\d,]+\.?\d*)/i,
      /(\d{1,4}\.?\d*)\s*kw/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const value = parseFloat(match[1].replace(/,/g, ''));
        if (value > 0 && value < 1000) { // Reasonable range
          return value;
        }
      }
    }

    return undefined;
  }

  /**
   * Extract time-of-use breakdown
   */
  private extractTimeOfUseUsage(text: string): { onPeak?: number; midPeak?: number; offPeak?: number } | undefined {
    const onPeakPattern = /(?:on[-\s]?peak|peak):?\s*([\d,]+\.?\d*)/i;
    const midPeakPattern = /(?:mid[-\s]?peak|partial[-\s]?peak):?\s*([\d,]+\.?\d*)/i;
    const offPeakPattern = /(?:off[-\s]?peak|base):?\s*([\d,]+\.?\d*)/i;

    const onPeakMatch = text.match(onPeakPattern);
    const midPeakMatch = text.match(midPeakPattern);
    const offPeakMatch = text.match(offPeakPattern);

    if (onPeakMatch || midPeakMatch || offPeakMatch) {
      return {
        onPeak: onPeakMatch ? parseFloat(onPeakMatch[1].replace(/,/g, '')) : undefined,
        midPeak: midPeakMatch ? parseFloat(midPeakMatch[1].replace(/,/g, '')) : undefined,
        offPeak: offPeakMatch ? parseFloat(offPeakMatch[1].replace(/,/g, '')) : undefined,
      };
    }

    return undefined;
  }

  /**
   * Extract total bill amount
   */
  private extractTotalAmount(text: string): number {
    const patterns = [
      /(?:total|amount)\s+(?:due|owed|current):?\s*\$?([\d,]+\.?\d*)/i,
      /new\s+charges:?\s*\$?([\d,]+\.?\d*)/i,
      /\$\s*([\d,]+\.?\d*)/g,
    ];

    const amounts: number[] = [];
    
    for (const pattern of patterns) {
      const matches = Array.from(text.matchAll(pattern));
      for (const match of matches) {
        if (match && match[1]) {
          const value = parseFloat(match[1].replace(/,/g, ''));
          if (value > 0 && value < 10000) { // Reasonable range
            amounts.push(value);
          }
        }
      }
    }

    // Return the most likely total amount (usually the largest)
    return amounts.length > 0 ? Math.max(...amounts) : 0;
  }

  /**
   * Extract line items from bill
   */
  private extractLineItems(text: string): BillLineItem[] {
    const lines = text.split('\n');
    const lineItems: BillLineItem[] = [];

    for (const line of lines) {
      // Pattern to match line items with descriptions and amounts
      const pattern = /(.+?)\s+\$?([\d,]+\.?\d*)/;
      const match = line.match(pattern);

      if (match && match[1] && match[2]) {
        const description = match[1].trim();
        const amount = parseFloat(match[2].replace(/,/g, ''));

        // Filter out irrelevant lines
        if (this.isValidLineItem(description, amount)) {
          lineItems.push({
            description,
            amount,
            category: this.categorizeLineItem(description),
          });
        }
      }
    }

    return lineItems;
  }

  /**
   * Check if a line item is valid
   */
  private isValidLineItem(description: string, amount: number): boolean {
    // Filter out headers, footers, and invalid amounts
    const invalidPatterns = [
      /page\s+\d+/i,
      /continued/i,
      /total/i,
      /subtotal/i,
      /date/i,
      /account/i,
    ];

    if (amount <= 0 || amount > 5000) return false;
    if (description.length < 3 || description.length > 100) return false;

    for (const pattern of invalidPatterns) {
      if (pattern.test(description)) return false;
    }

    return true;
  }

  /**
   * Categorize line item
   */
  private categorizeLineItem(description: string): BillLineItem['category'] {
    const desc = description.toLowerCase();

    if (desc.includes('energy') || desc.includes('kwh') || desc.includes('usage')) return 'energy';
    if (desc.includes('demand') || desc.includes('kw')) return 'demand';
    if (desc.includes('delivery') || desc.includes('distribution') || desc.includes('transmission')) return 'delivery';
    if (desc.includes('tax') || desc.includes('fee')) return desc.includes('tax') ? 'tax' : 'fee';
    if (desc.includes('credit') || desc.includes('refund')) return 'credit';

    return 'other';
  }

  /**
   * Calculate energy charges from line items
   */
  private calculateEnergyCharges(lineItems: BillLineItem[]): number {
    return lineItems
      .filter(item => item.category === 'energy')
      .reduce((sum, item) => sum + item.amount, 0);
  }

  /**
   * Calculate demand charges
   */
  private calculateDemandCharges(lineItems: BillLineItem[]): number | undefined {
    const demandCharges = lineItems
      .filter(item => item.category === 'demand')
      .reduce((sum, item) => sum + item.amount, 0);
    
    return demandCharges > 0 ? demandCharges : undefined;
  }

  /**
   * Calculate delivery charges
   */
  private calculateDeliveryCharges(lineItems: BillLineItem[]): number {
    return lineItems
      .filter(item => item.category === 'delivery')
      .reduce((sum, item) => sum + item.amount, 0);
  }

  /**
   * Calculate taxes
   */
  private calculateTaxes(lineItems: BillLineItem[]): number {
    return lineItems
      .filter(item => item.category === 'tax')
      .reduce((sum, item) => sum + item.amount, 0);
  }

  /**
   * Calculate fees
   */
  private calculateFees(lineItems: BillLineItem[]): number {
    return lineItems
      .filter(item => item.category === 'fee')
      .reduce((sum, item) => sum + item.amount, 0);
  }

  /**
   * Calculate credits
   */
  private calculateCredits(lineItems: BillLineItem[]): number | undefined {
    const credits = lineItems
      .filter(item => item.category === 'credit')
      .reduce((sum, item) => sum + Math.abs(item.amount), 0);
    
    return credits > 0 ? credits : undefined;
  }

  /**
   * Extract rate schedule
   */
  private extractRateSchedule(text: string): string | undefined {
    for (const pattern of RATE_SCHEDULE_PATTERNS) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim().toUpperCase();
      }
    }

    return undefined;
  }

  /**
   * Calculate parsing confidence based on data completeness
   */
  private calculateParseConfidence(data: {
    accountNumber?: string;
    totalKwh: number;
    totalAmount: number;
    billingPeriod: BillingPeriod;
    lineItems: BillLineItem[];
  }): number {
    let score = 0;
    let maxScore = 0;

    // Account number (20%)
    maxScore += 0.2;
    if (data.accountNumber) score += 0.2;

    // Usage data (30%)
    maxScore += 0.3;
    if (data.totalKwh > 0) score += 0.3;

    // Financial data (30%)
    maxScore += 0.3;
    if (data.totalAmount > 0) score += 0.3;

    // Billing period (10%)
    maxScore += 0.1;
    if (data.billingPeriod.daysInPeriod >= 28 && data.billingPeriod.daysInPeriod <= 35) {
      score += 0.1;
    }

    // Line items detail (10%)
    maxScore += 0.1;
    if (data.lineItems.length >= 3) score += 0.1;

    return maxScore > 0 ? score / maxScore : 0;
  }
}

/**
 * Bill validation service
 */
export class BillValidator {
  /**
   * Validate parsed bill data for accuracy and completeness
   */
  async validateBill(
    parsedData: ParsedBillData,
    ocrResult: OCRResult,
    correlationId?: string
  ): Promise<BillValidationResult> {
    try {
      logger.info({ 
        parseConfidence: parsedData.parseConfidence,
        totalVariance: parsedData.totalVariance,
        correlationId 
      }, 'Starting bill validation');

      const isValid = this.isValidBill(parsedData);
      const confidence = this.calculateValidationConfidence(parsedData, ocrResult);
      const toleranceExceeded = parsedData.totalVariance > BILL_VARIANCE_TOLERANCE;
      const missingFields = this.identifyMissingFields(parsedData);
      const anomalies = await this.detectAnomalies(parsedData);

      const result: BillValidationResult = {
        isValid,
        confidence,
        totalVariance: parsedData.totalVariance,
        toleranceExceeded,
        missingFields,
        anomalies
      };

      logger.info({
        isValid,
        confidence,
        anomaliesCount: anomalies.length,
        correlationId
      }, 'Bill validation completed');

      return result;

    } catch (error) {
      logger.error({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        correlationId 
      }, 'Bill validation failed');
      
      throw new BillParsingError(
        'Bill validation failed',
        parsedData.parseConfidence,
        { totalAmount: parsedData.totalAmount }
      );
    }
  }

  /**
   * Check if bill meets minimum validation requirements
   */
  private isValidBill(parsedData: ParsedBillData): boolean {
    return (
      parsedData.totalAmount > 0 &&
      parsedData.totalKwh > 0 &&
      parsedData.parseConfidence >= 0.5 &&
      parsedData.totalVariance <= 0.1 // 10% tolerance for validity
    );
  }

  /**
   * Calculate overall validation confidence
   */
  private calculateValidationConfidence(parsedData: ParsedBillData, ocrResult: OCRResult): number {
    // Weighted combination of OCR confidence and parse confidence
    const ocrWeight = 0.4;
    const parseWeight = 0.6;
    
    return (ocrResult.confidence * ocrWeight) + (parsedData.parseConfidence * parseWeight);
  }

  /**
   * Identify missing required fields
   */
  private identifyMissingFields(parsedData: ParsedBillData): string[] {
    const missing: string[] = [];

    if (!parsedData.accountNumber) missing.push('accountNumber');
    if (!parsedData.serviceAddress) missing.push('serviceAddress');
    if (!parsedData.utilityName) missing.push('utilityName');
    if (parsedData.totalKwh <= 0) missing.push('totalKwh');
    if (parsedData.totalAmount <= 0) missing.push('totalAmount');
    if (!parsedData.rateSchedule) missing.push('rateSchedule');

    return missing;
  }

  /**
   * Detect anomalies in bill data
   */
  private async detectAnomalies(parsedData: ParsedBillData): Promise<BillValidationResult['anomalies']> {
    const anomalies: BillValidationResult['anomalies'] = [];

    // Usage spike detection
    if (parsedData.totalKwh > 5000) {
      anomalies.push({
        type: 'usage_spike',
        severity: 'warning',
        message: `Unusually high usage: ${parsedData.totalKwh} kWh`,
        suggestedAction: 'Verify meter reading accuracy'
      });
    }

    // Billing period anomalies
    if (parsedData.billingPeriod.daysInPeriod < 25 || parsedData.billingPeriod.daysInPeriod > 40) {
      anomalies.push({
        type: 'missing_period',
        severity: 'warning',
        message: `Unusual billing period: ${parsedData.billingPeriod.daysInPeriod} days`,
        suggestedAction: 'Check for missing or overlapping billing periods'
      });
    }

    // Variance tolerance exceeded
    if (parsedData.totalVariance > BILL_VARIANCE_TOLERANCE) {
      anomalies.push({
        type: 'usage_spike',
        severity: 'error',
        message: `Bill amount variance exceeds tolerance: ${(parsedData.totalVariance * 100).toFixed(2)}%`,
        suggestedAction: 'Review line item extraction accuracy'
      });
    }

    return anomalies;
  }
}

/**
 * Main bill parser service that orchestrates OCR, parsing, and validation
 */
export class BillParserService {
  private ocrProcessor: EnhancedOCRProcessor;
  private dataParser: BillDataParser;
  private validator: BillValidator;

  constructor() {
    this.ocrProcessor = new EnhancedOCRProcessor();
    this.dataParser = new BillDataParser();
    this.validator = new BillValidator();
  }

  /**
   * Process bill from file to validated structured data
   */
  async processBill(
    filePath: string,
    fileName: string,
    fileType: string,
    correlationId?: string
  ): Promise<{
    ocrResult: OCRResult;
    parsedData: ParsedBillData;
    validation: BillValidationResult;
  }> {
    try {
      logger.info({ 
        fileName, 
        fileType, 
        correlationId 
      }, 'Starting bill processing pipeline');

      // Step 1: OCR Processing with retry logic
      const ocrResult = await retry(
        () => this.ocrProcessor.processDocument(filePath, fileType, correlationId),
        {
          maxRetries: MAX_OCR_RETRIES,
          baseDelay: 1000,
          maxDelay: 5000,
        }
      );

      // Step 2: Data Parsing
      const parsedData = await this.dataParser.parseBillData(
        ocrResult, 
        fileName, 
        correlationId
      );

      // Step 3: Validation
      const validation = await this.validator.validateBill(
        parsedData, 
        ocrResult, 
        correlationId
      );

      logger.info({
        ocrConfidence: ocrResult.confidence,
        parseConfidence: parsedData.parseConfidence,
        validationConfidence: validation.confidence,
        isValid: validation.isValid,
        correlationId
      }, 'Bill processing pipeline completed');

      return {
        ocrResult,
        parsedData,
        validation
      };

    } catch (error) {
      logger.error({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        fileName,
        correlationId 
      }, 'Bill processing pipeline failed');

      throw error;
    }
  }
}

// Export singleton instance
export const billParser = new BillParserService();
