import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import BrandHeader from "@/components/BrandHeader"
import { Toaster } from "@/components/ui/sonner"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "NovaAgent ⚡ – AI Energy Planner",
  description:
    "NovaAgent helps solar professionals analyze power bills, design solar + battery systems, and generate NEC-compliant plans automatically.",
  icons: [{ rel: "icon", url: "/novaagent-logo.svg" }],
  themeColor: "#0A0F1C",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} min-h-screen bg-background text-foreground antialiased`}>
        <BrandHeader />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
        <Toaster />
      </body>
    </html>
  )
}
