"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import FileUpload from "@/components/FileUpload";
import {
  MotionDiv,
  MotionCard,
  fadeInUp,
  smoothTransition,
} from "@/components/motion";

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
      // Analyze the extracted data (OCR already processed during upload)
      const analyzeResponse = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      const analyzeData = await analyzeResponse.json();

      if (analyzeData.success) {
        router.push(`/wizard/${projectId}/sizing`);
      } else {
        // Provide more helpful error messages
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
    <div className="w-screen -ml-[50vw] left-1/2 relative min-h-screen bg-gradient-to-b from-background to-gray-50 dark:to-gray-900">
      <div className="w-full max-w-4xl mx-auto px-4 py-8">
      <MotionDiv variants={fadeInUp} transition={smoothTransition} className="mb-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent">
          Bill Upload & Intake
        </h1>
        <p className="mt-2 text-muted-foreground">
          Upload power bills (PDF, images, or CSV) for analysis
        </p>
      </MotionDiv>

      <MotionCard delay={0.1}>
        <Card className="glass-card p-6">
        <FileUpload
          projectId={projectId}
          onUploadComplete={handleUploadComplete}
        />

        <div className="mt-6 flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/projects")}
            className="flex-1"
          >
            Save & Exit
          </Button>
          <Button
            onClick={handleContinue}
            disabled={processing || !hasFiles}
            className="flex-1 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-700 hover:via-purple-700 hover:to-fuchsia-700 text-white shadow-lg shadow-violet-500/30"
          >
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              "Analyze Bills & Continue"
            )}
          </Button>
        </div>
        {!hasFiles && (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Please upload at least one bill to continue
          </p>
        )}
      </Card>
      </div>
    </div>
  );
}
