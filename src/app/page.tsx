import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Sparkles, Upload, FileText, ShieldCheck } from "lucide-react"

export default function Page() {
  return (
    <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-b from-[#0A0F1C] to-background p-6 sm:p-10">
      <div className="relative z-10 grid gap-6 md:grid-cols-2">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            NovaAgent ⚡
          </h1>
          <p className="mt-3 max-w-prose text-cyan-100/90">
            AI Energy Planner for Solar & Battery Systems. Analyze power bills,
            size PV and storage, build a BOM, run NEC checks, and generate
            professional PDFs—end to end.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="bg-[#22D3EE] text-black hover:bg-[#6EE7F9]">
              <Link href="/wizard/new">
                <Sparkles className="mr-2 h-5 w-5" />
                Start a New Energy Plan
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/projects">Open Existing Project</Link>
            </Button>
          </div>

          <ul className="mt-8 grid gap-3 text-sm text-cyan-50/80 sm:grid-cols-3">
            <li className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-cyan-300" /> Upload bills (PDF/Image/CSV)
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-cyan-300" /> NEC-aware checks & warnings
            </li>
            <li className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-cyan-300" /> One-click PDF reports
            </li>
          </ul>
        </div>

        <div className="rounded-2xl border bg-card/60 p-5 backdrop-blur">
          <h2 className="text-lg font-semibold">Quick Start</h2>
          <ol className="mt-3 list-inside list-decimal space-y-2 text-sm text-muted-foreground">
            <li>Upload customer&apos;s latest 1–12 months of power bills.</li>
            <li>Set backup duration (24/48/72h) & critical loads.</li>
            <li>Review sizing, BOM pricing, and plan warnings.</li>
            <li>Generate NovaAgent PDFs and export bundle.</li>
          </ol>
          <div className="mt-6 flex gap-2">
            <Button asChild variant="outline">
              <Link href="/wizard/new?demo=1">Try Demo Project</Link>
            </Button>
            <Button asChild>
              <Link href="/wizard/new?step=intake">Go to Intake</Link>
            </Button>
          </div>
        </div>
      </div>

      <div aria-hidden="true" className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
    </section>
  )
}
