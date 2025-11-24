"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Upload, FileText, ArrowRight, CheckCircle2 } from "lucide-react";
import FileUpload from "@/components/FileUpload";

export default function IntakePage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  const [processing, setProcessing] = useState(false);
  const [hasFiles, setHasFiles] = useState(false);

  const handleUploadComplete = (
    bills: {
      id: string;
      fileName: string;
      fileType: string;
      uploadedAt: string;
      ocrProcessed?: boolean;
    }[],
  ) => {
    setHasFiles(bills.length > 0);
  };

  const handleContinue = async () => {
    setProcessing(true);
    try {
      const analyzeResponse = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      const analyzeData = await analyzeResponse.json();

      if (analyzeData.success) {
        router.push(`/wizard/${projectId}/sizing`);
      } else {
        let errorMessage = analyzeData.error;
        if (errorMessage.includes("No extracted data found")) {
          errorMessage = `OCR Processing Issue: ${errorMessage}\n\nUsing demo data for now. To enable full OCR processing:\n1. Install Python dependencies\n2. Start the OCR service\n3. Re-upload your bills`;
        }
        alert(`Analysis Error: ${errorMessage}`);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to analyze bills");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50">
      <div className="container max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Upload className="h-8 w-8 text-teal-600" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-3">Upload Power Bills</h1>
          <p className="text-lg text-slate-600">
            Upload your power bills to analyze energy usage and calculate system requirements
          </p>
        </div>

        <Card className="bg-white border-2 border-slate-200 shadow-lg">
          <div className="p-8">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <FileText className="h-5 w-5 text-teal-600" />
                <h2 className="text-xl font-semibold text-slate-900">Supported File Types</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="font-semibold text-slate-900 mb-1">PDF Files</div>
                  <div className="text-sm text-slate-600">Best OCR accuracy</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="font-semibold text-slate-900 mb-1">Image Files</div>
                  <div className="text-sm text-slate-600">PNG, JPG, JPEG</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="font-semibold text-slate-900 mb-1">CSV Files</div>
                  <div className="text-sm text-slate-600">Direct data import</div>
                </div>
              </div>
            </div>

            <FileUpload
              projectId={projectId}
              onUploadComplete={handleUploadComplete}
            />

            {hasFiles && (
              <div className="mt-6 bg-teal-50 border-2 border-teal-200 rounded-lg p-4 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-teal-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-teal-900 mb-1">Files Uploaded Successfully</div>
                  <div className="text-sm text-teal-700">You can now analyze your bills to continue</div>
                </div>
              </div>
            )}

            <div className="mt-8 flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/projects")}
                className="bg-white border-2 border-slate-300 text-slate-700 hover:bg-slate-50 px-8 py-6 text-lg flex-1"
              >
                Save & Exit
              </Button>
              <Button
                onClick={handleContinue}
                disabled={processing || !hasFiles}
                className="bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 text-white px-8 py-6 text-lg shadow-lg disabled:opacity-50 flex-1"
              >
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    Analyze Bills & Continue
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </div>
            {!hasFiles && (
              <p className="mt-4 text-center text-sm text-slate-600">
                Please upload at least one bill to continue
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
