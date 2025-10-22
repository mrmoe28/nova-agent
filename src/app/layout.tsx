import type { Metadata, Viewport } from "next";
import "./globals.css";
import BrandHeader from "@/components/BrandHeader";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "NovaAgent ⚡ – AI Energy Planner",
  description:
    "NovaAgent helps solar professionals analyze power bills, design solar + battery systems, and generate NEC-compliant plans automatically.",
  icons: [{ rel: "icon", url: "/novaagent-logo.svg" }],
};

export const viewport: Viewport = {
  themeColor: "#0A0F1C",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body
        className="min-h-screen bg-background text-foreground antialiased font-sans"
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <BrandHeader />
          <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
