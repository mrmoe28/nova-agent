"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  Upload,
  Download,
  ExternalLink,
  Eye,
  Calendar,
  DollarSign,
  Zap,
  File,
  Image,
  FileSpreadsheet,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Bill {
  id: string;
  fileName: string;
  fileType: string;
  filePath: string;
  uploadedAt: string;
  ocrText?: string;
  extractedData?: Record<string, unknown>;
}

interface BillsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  bills: Bill[];
}

export function BillsModal({
  open,
  onOpenChange,
  projectId,
  bills,
}: BillsModalProps) {
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);

  const getFileIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'pdf':
        return <File className="h-5 w-5 text-red-600" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
        return <Image className="h-5 w-5 text-blue-600" />;
      case 'csv':
      case 'xlsx':
      case 'xls':
        return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  const getFileTypeLabel = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'pdf':
        return 'PDF Document';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
        return 'Image File';
      case 'csv':
        return 'CSV Spreadsheet';
      case 'xlsx':
      case 'xls':
        return 'Excel Spreadsheet';
      default:
        return 'Document';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getExtractedSummary = (extractedData: Record<string, unknown> | undefined) => {
    if (!extractedData) return null;

    // Try to extract common bill fields
    const summary = {
      totalAmount: extractedData.totalAmount || extractedData.total || extractedData.amount,
      kwh: extractedData.kwh || extractedData.kWhUsed || extractedData.usage,
      billingPeriod: extractedData.billingPeriod || extractedData.period,
      utility: extractedData.utility || extractedData.company,
    };

    return summary;
  };

  const handleDownloadBill = async (bill: Bill) => {
    try {
      // Create a download link for the bill file
      const link = document.createElement('a');
      link.href = bill.filePath;
      link.download = bill.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading bill:', error);
    }
  };

  const handleViewBill = (bill: Bill) => {
    // Open bill in new window/tab
    window.open(bill.filePath, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Uploaded Bills & Documents ({bills.length})
          </DialogTitle>
          <DialogDescription>
            View and manage all uploaded utility bills and related documents for this project
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
          {/* Bills List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Bills & Documents</h3>
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Upload More
              </Button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {bills.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No bills uploaded yet</p>
                  <p className="text-sm">Upload utility bills to get started</p>
                </div>
              ) : (
                bills.map((bill) => {
                  const summary = getExtractedSummary(bill.extractedData);
                  return (
                    <Card 
                      key={bill.id} 
                      className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                        selectedBill?.id === bill.id ? 'ring-2 ring-blue-500' : ''
                      }`}
                      onClick={() => setSelectedBill(bill)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="p-2 bg-gray-100 rounded-lg">
                            {getFileIcon(bill.fileType)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium truncate">{bill.fileName}</h4>
                              <Badge variant="outline" className="text-xs">
                                {getFileTypeLabel(bill.fileType)}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(bill.uploadedAt)}
                              </div>
                              {summary && (
                                <div className="flex items-center gap-4 text-xs">
                                  {summary.totalAmount && (
                                    <div className="flex items-center gap-1">
                                      <DollarSign className="h-3 w-3" />
                                      ${summary.totalAmount}
                                    </div>
                                  )}
                                  {summary.kwh && (
                                    <div className="flex items-center gap-1">
                                      <Zap className="h-3 w-3" />
                                      {summary.kwh} kWh
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewBill(bill);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadBill(bill);
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </div>

          {/* Bill Details Panel */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Bill Details</h3>
            
            {selectedBill ? (
              <div className="space-y-4">
                <Card className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    {getFileIcon(selectedBill.fileType)}
                    <div className="flex-1">
                      <h4 className="font-medium">{selectedBill.fileName}</h4>
                      <p className="text-sm text-muted-foreground">
                        {getFileTypeLabel(selectedBill.fileType)}
                      </p>
                    </div>
                  </div>
                  
                  <Separator className="my-3" />
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Uploaded:</span>
                      <span>{formatDate(selectedBill.uploadedAt)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">File Type:</span>
                      <span>{selectedBill.fileType.toUpperCase()}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <Button 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleViewBill(selectedBill)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDownloadBill(selectedBill)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>

                {/* Extracted Data */}
                {selectedBill.extractedData && (
                  <Card className="p-4">
                    <h5 className="font-medium mb-3">Extracted Data</h5>
                    <div className="space-y-2 text-sm">
                      {Object.entries(selectedBill.extractedData).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-muted-foreground capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}:
                          </span>
                          <span className="text-right">
                            {typeof value === 'number' && (key.includes('amount') || key.includes('cost')) 
                              ? formatCurrency(value) 
                              : String(value)
                            }
                          </span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* OCR Text */}
                {selectedBill.ocrText && (
                  <Card className="p-4">
                    <h5 className="font-medium mb-3">OCR Text</h5>
                    <div className="text-sm text-muted-foreground max-h-32 overflow-y-auto border rounded p-2 bg-gray-50">
                      {selectedBill.ocrText}
                    </div>
                  </Card>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a bill to view details</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
