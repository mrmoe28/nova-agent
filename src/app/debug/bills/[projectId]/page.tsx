"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, AlertCircle, CheckCircle2, XCircle, ChevronDown, ChevronUp } from "lucide-react";

interface ExtractedData {
  kWhUsage?: number;
  totalCost?: number;
  peakDemand?: number;
  billingPeriod?: string;
  accountNumber?: string;
  utilityCompany?: string;
}

interface Bill {
  id: string;
  fileName: string;
  fileType: string;
  ocrText: string | null;
  extractedData: ExtractedData | string | null;
  createdAt: string;
}

interface Analysis {
  monthlyUsageKwh: number;
  peakDemandKw: number;
  monthlyChargeUsd: number;
  avgCostPerKwh: number;
}

export default function BillDebugPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [bills, setBills] = useState<Bill[]>([]);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedBill, setExpandedBill] = useState<string | null>(null);

  const fetchDebugData = useCallback(async () => {
    try {
      // Fetch project with bills
      const projectRes = await fetch(`/api/projects/${projectId}`);
      const projectData = await projectRes.json();

      if (projectData.success) {
        setBills(projectData.project.bills || []);
        setAnalysis(projectData.project.analysis);
      }
    } catch (error) {
      console.error("Error fetching debug data:", error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchDebugData();
  }, [fetchDebugData]);

  const getDataSource = (bill: Bill): "real" | "fallback" | "none" => {
    if (!bill.extractedData) return "none";

    const data = typeof bill.extractedData === "string"
      ? JSON.parse(bill.extractedData)
      : bill.extractedData;

    // Check if using fallback values (1000 kWh is the demo value)
    if (data.kWhUsage === 1000 && !bill.ocrText) {
      return "fallback";
    }

    return data.kWhUsage && bill.ocrText ? "real" : "fallback";
  };

  const getSourceBadge = (source: "real" | "fallback" | "none") => {
    switch (source) {
      case "real":
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Real Data
          </Badge>
        );
      case "fallback":
        return (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            <AlertCircle className="h-3 w-3 mr-1" />
            Fallback Data
          </Badge>
        );
      case "none":
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
            <XCircle className="h-3 w-3 mr-1" />
            No Data
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading debug data...</div>
      </div>
    );
  }

  return (
    <div className="w-screen -ml-[50vw] left-1/2 relative min-h-screen bg-background">
      <div className="w-full px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Bill Analysis Debug</h1>
        <p className="text-muted-foreground">
          Verify that your energy analysis is using real data from uploaded PDFs
        </p>
      </div>

      {/* Analysis Summary */}
      {analysis && (
        <Card className="p-6 mb-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Current Analysis Results
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Monthly Usage</p>
              <p className="text-2xl font-bold">{analysis.monthlyUsageKwh} kWh</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Peak Demand</p>
              <p className="text-2xl font-bold">{analysis.peakDemandKw} kW</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Monthly Charge</p>
              <p className="text-2xl font-bold">${analysis.monthlyChargeUsd}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Avg Cost/kWh</p>
              <p className="text-2xl font-bold">${analysis.avgCostPerKwh.toFixed(3)}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Bills List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Uploaded Bills ({bills.length})</h2>

        {bills.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No bills uploaded yet</p>
          </Card>
        ) : (
          bills.map((bill) => {
            const source = getDataSource(bill);
            const isExpanded = expandedBill === bill.id;
            const extractedData = bill.extractedData
              ? typeof bill.extractedData === "string"
                ? JSON.parse(bill.extractedData)
                : bill.extractedData
              : null;

            return (
              <Card key={bill.id} className="overflow-hidden">
                <div className="p-6">
                  {/* Bill Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <FileText className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold">{bill.fileName}</h3>
                        {getSourceBadge(source)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Type: {bill.fileType.toUpperCase()} • Uploaded:{" "}
                        {new Date(bill.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedBill(isExpanded ? null : bill.id)}
                    >
                      {isExpanded ? (
                        <>
                          Hide Details
                          <ChevronUp className="ml-2 h-4 w-4" />
                        </>
                      ) : (
                        <>
                          Show Details
                          <ChevronDown className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Extracted Data Summary */}
                  {extractedData && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="bg-muted/50 rounded p-3">
                        <p className="text-xs text-muted-foreground mb-1">kWh Usage</p>
                        <p className="text-lg font-semibold">
                          {extractedData.kWhUsage || "N/A"}
                        </p>
                      </div>
                      <div className="bg-muted/50 rounded p-3">
                        <p className="text-xs text-muted-foreground mb-1">Total Cost</p>
                        <p className="text-lg font-semibold">
                          ${extractedData.totalCost || "N/A"}
                        </p>
                      </div>
                      <div className="bg-muted/50 rounded p-3">
                        <p className="text-xs text-muted-foreground mb-1">Peak Demand</p>
                        <p className="text-lg font-semibold">
                          {extractedData.peakDemand || "N/A"} kW
                        </p>
                      </div>
                      <div className="bg-muted/50 rounded p-3">
                        <p className="text-xs text-muted-foreground mb-1">Billing Period</p>
                        <p className="text-lg font-semibold">
                          {extractedData.billingPeriod || "N/A"}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="space-y-4 border-t pt-4">
                      {/* OCR Text */}
                      <div>
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          Raw OCR Text
                          {bill.ocrText ? (
                            <Badge variant="outline" className="text-xs">
                              {bill.ocrText.length} characters
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs bg-red-500/10">
                              No text extracted
                            </Badge>
                          )}
                        </h4>
                        <div className="bg-muted/50 rounded p-4 max-h-64 overflow-y-auto">
                          <pre className="text-xs font-mono whitespace-pre-wrap">
                            {bill.ocrText || "No OCR text available"}
                          </pre>
                        </div>
                      </div>

                      {/* Extracted Data JSON */}
                      {extractedData && (
                        <div>
                          <h4 className="font-semibold mb-2">Parsed Data (JSON)</h4>
                          <div className="bg-muted/50 rounded p-4 max-h-64 overflow-y-auto">
                            <pre className="text-xs font-mono">
                              {JSON.stringify(extractedData, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}

                      {/* Warnings */}
                      {source === "fallback" && (
                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-4">
                          <h4 className="font-semibold mb-2 flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                            <AlertCircle className="h-4 w-4" />
                            Using Fallback Data
                          </h4>
                          <ul className="text-sm space-y-1 text-yellow-600 dark:text-yellow-400">
                            <li>• OCR extraction failed or returned no data</li>
                            <li>• Check if PDF is text-based (not scanned image)</li>
                            <li>• Utility company format may not match parser regex</li>
                            <li>• Using demo values: 1000 kWh, $150 cost</li>
                          </ul>
                        </div>
                      )}

                      {source === "real" && (
                        <div className="bg-green-500/10 border border-green-500/30 rounded p-4">
                          <h4 className="font-semibold mb-2 flex items-center gap-2 text-green-600 dark:text-green-400">
                            <CheckCircle2 className="h-4 w-4" />
                            Real Data Extracted
                          </h4>
                          <p className="text-sm text-green-600 dark:text-green-400">
                            OCR successfully extracted text and parsed values from your PDF.
                            The energy analysis is using this real data.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Tips */}
      <Card className="p-6 mt-6 bg-muted/50">
        <h3 className="font-semibold mb-3">Debugging Tips</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            <span>
              <strong>Green badge</strong>: OCR extracted real data from your PDF
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            <span>
              <strong>Yellow badge</strong>: Using fallback demo data (OCR failed)
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            <span>
              <strong>Check OCR Text</strong>: Expand &quot;Show Details&quot; to see raw extracted text
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            <span>
              <strong>File format</strong>: PDFs work best. Images may fail in production.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            <span>
              <strong>Utility format</strong>: If your utility&apos;s bill format isn&apos;t recognized,
              the parser may need custom regex patterns.
            </span>
          </li>
        </ul>
      </Card>
      </div>
    </div>
  );
}
