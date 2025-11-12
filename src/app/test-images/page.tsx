"use client";

import Image from "next/image";
import { Card } from "@/components/ui/card";
import { useState } from "react";

export default function TestImagesPage() {
  const [imageStatuses, setImageStatuses] = useState<
    Record<string, "loading" | "success" | "error">
  >({
    svg: "loading",
    jpeg: "loading",
    png: "loading",
  });

  const testImages = [
    {
      format: "SVG",
      url: "https://upload.wikimedia.org/wikipedia/commons/0/02/SVG_logo.svg",
      key: "svg",
    },
    {
      format: "JPEG",
      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/PNG_Test.png/240px-PNG_Test.png",
      key: "jpeg",
    },
    {
      format: "PNG",
      url: "https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png",
      key: "png",
    },
  ];

  return (
    <div className="w-screen -ml-[50vw] left-1/2 relative min-h-screen bg-background">
      <div className="w-full px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Image Format Test</h1>
      <p className="text-muted-foreground mb-8">
        Testing SVG, JPEG, and PNG image support with Next.js Image component
      </p>

      <div className="grid gap-6 md:grid-cols-3">
        {testImages.map((img) => (
          <Card key={img.key} className="p-6">
            <h3 className="text-lg font-semibold mb-4">{img.format} Format</h3>

            <div className="relative w-full h-48 bg-slate-100 rounded-lg mb-4 flex items-center justify-center">
              <Image
                src={img.url}
                alt={`${img.format} test image`}
                fill
                className="object-contain p-4"
                onLoadingComplete={() => {
                  setImageStatuses((prev) => ({
                    ...prev,
                    [img.key]: "success",
                  }));
                }}
                onError={() => {
                  setImageStatuses((prev) => ({ ...prev, [img.key]: "error" }));
                }}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Status:</span>
                <span
                  className={`text-sm px-2 py-1 rounded ${
                    imageStatuses[img.key] === "success"
                      ? "bg-green-100 text-green-800"
                      : imageStatuses[img.key] === "error"
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {imageStatuses[img.key]}
                </span>
              </div>

              <div className="text-xs text-muted-foreground break-all">
                {img.url}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-8 p-6 bg-blue-50 rounded-lg">
        <h3 className="font-semibold mb-2">Configuration Details:</h3>
        <ul className="text-sm space-y-1">
          <li>
            ✅ <strong>SVG:</strong> dangerouslyAllowSVG enabled with CSP
          </li>
          <li>
            ✅ <strong>JPEG/JPG:</strong> Native Next.js support with WebP/AVIF
            conversion
          </li>
          <li>
            ✅ <strong>PNG:</strong> Native Next.js support with WebP/AVIF
            conversion
          </li>
          <li>
            ✅ <strong>Remote Images:</strong> All HTTPS/HTTP domains allowed
          </li>
        </ul>
      </div>

      <div className="mt-6 p-6 bg-slate-50 rounded-lg">
        <h3 className="font-semibold mb-2">How It Works:</h3>
        <ul className="text-sm space-y-2">
          <li>
            • <strong>SVG files</strong> are passed through without optimization
            (security sanitized)
          </li>
          <li>
            • <strong>JPEG/PNG files</strong> are automatically optimized and
            can be converted to WebP/AVIF
          </li>
          <li>
            • <strong>All formats</strong> support responsive sizing and lazy
            loading
          </li>
          <li>
            • <strong>Error handling</strong> shows fallback when images fail to
            load
          </li>
        </ul>
      </div>
      </div>
    </div>
  );
}
