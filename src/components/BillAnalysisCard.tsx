"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  Calendar, 
  Zap, 
  DollarSign, 
  TrendingUp,
  ChevronDown,
  ChevronRight,
  Eye
} from "lucide-react";

interface BillData {
  id: string;
  fileName: string;
  fileType: string;
  uploadedAt: string;
  ocrText?: string;
  extractedData?: {
    accountNumber?: string;
    serviceAddress?: string;
    billDate?: string;
    dueDate?: string;
    totalAmount?: number;
    kwhUsed?: number;
    billingPeriod?: string;
    rateSchedule?: string;
    previousReading?: number;
    currentReading?: number;
    daysInPeriod?: number;
    averageDailyUsage?: number;
  };
}

interface BillAnalysisCardProps {
  bill: BillData;
}

export function BillAnalysisCard({ bill }: BillAnalysisCardProps) {
  const [expanded, setExpanded] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getUsageInsight = () => {
    if (!bill.extractedData?.averageDailyUsage) return null;
    
    const dailyUsage = bill.extractedData.averageDailyUsage;
    if (dailyUsage < 20) return { level: 'low', color: 'text-green-600', text: 'Low usage' };
    if (dailyUsage < 40) return { level: 'medium', color: 'text-yellow-600', text: 'Average usage' };
    return { level: 'high', color: 'text-red-600', text: 'High usage' };
  };

  const usageInsight = getUsageInsight();

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">{bill.fileName}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-3 w-3 text-gray-500" />
                <span className="text-sm text-gray-600">
                  Uploaded {formatDate(bill.uploadedAt)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={bill.extractedData ? "default" : "secondary"}>
              {bill.extractedData ? "Analyzed" : "Raw Data"}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {bill.extractedData && (
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Monthly Usage */}
            {bill.extractedData.kwhUsed && (
              <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                <Zap className="h-5 w-5 text-yellow-600" />
                <div>
                  <div className="text-lg font-semibold">
                    {bill.extractedData.kwhUsed.toLocaleString()} kWh
                  </div>
                  <div className="text-xs text-gray-600">Monthly Usage</div>
                  {usageInsight && (
                    <div className={`text-xs font-medium ${usageInsight.color}`}>
                      {usageInsight.text}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Bill Amount */}
            {bill.extractedData.totalAmount && (
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600" />
                <div>
                  <div className="text-lg font-semibold">
                    {formatCurrency(bill.extractedData.totalAmount)}
                  </div>
                  <div className="text-xs text-gray-600">Total Amount</div>
                  {bill.extractedData.kwhUsed && (
                    <div className="text-xs text-gray-500">
                      ${(bill.extractedData.totalAmount / bill.extractedData.kwhUsed).toFixed(3)}/kWh
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Daily Average */}
            {bill.extractedData.averageDailyUsage && (
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="text-lg font-semibold">
                    {bill.extractedData.averageDailyUsage.toFixed(1)} kWh
                  </div>
                  <div className="text-xs text-gray-600">Daily Average</div>
                </div>
              </div>
            )}
          </div>

          {expanded && (
            <>
              <Separator className="my-4" />
              <div className="space-y-4">
                <h4 className="font-semibold text-sm uppercase tracking-wide text-gray-600">
                  Account Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {bill.extractedData.accountNumber && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Account Number</label>
                      <div className="text-sm">{bill.extractedData.accountNumber}</div>
                    </div>
                  )}
                  {bill.extractedData.serviceAddress && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Service Address</label>
                      <div className="text-sm">{bill.extractedData.serviceAddress}</div>
                    </div>
                  )}
                  {bill.extractedData.rateSchedule && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Rate Schedule</label>
                      <div className="text-sm">{bill.extractedData.rateSchedule}</div>
                    </div>
                  )}
                  {bill.extractedData.billingPeriod && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Billing Period</label>
                      <div className="text-sm">{bill.extractedData.billingPeriod}</div>
                    </div>
                  )}
                </div>

                {(bill.extractedData.previousReading || bill.extractedData.currentReading) && (
                  <>
                    <Separator className="my-4" />
                    <h4 className="font-semibold text-sm uppercase tracking-wide text-gray-600">
                      Meter Readings
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {bill.extractedData.previousReading && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Previous Reading</label>
                          <div className="text-sm">{bill.extractedData.previousReading.toLocaleString()} kWh</div>
                        </div>
                      )}
                      {bill.extractedData.currentReading && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Current Reading</label>
                          <div className="text-sm">{bill.extractedData.currentReading.toLocaleString()} kWh</div>
                        </div>
                      )}
                      {bill.extractedData.daysInPeriod && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Days in Period</label>
                          <div className="text-sm">{bill.extractedData.daysInPeriod} days</div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div className="pt-4 border-t">
                  <Button variant="outline" size="sm" className="w-full">
                    <Eye className="h-4 w-4 mr-2" />
                    View Original Bill
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      )}

      {!bill.extractedData && (
        <CardContent className="pt-0">
          <div className="text-center py-6">
            <div className="text-gray-500 mb-2">
              <FileText className="h-8 w-8 mx-auto opacity-50" />
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Bill analysis pending. Raw file uploaded successfully.
            </p>
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              View Raw File
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
