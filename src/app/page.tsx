import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Upload,
  FileText,
  ShieldCheck,
  Zap,
  Battery,
  Sun,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { getPageConfig, type PageConfig } from "@/lib/page-config";
import { cn } from "@/lib/utils";

// Get page configuration - can be made dynamic based on route, user preferences, etc.
const pageConfig: PageConfig = getPageConfig("default");

export default function Page() {
  const features = [
    {
      icon: Upload,
      title: "Smart Bill Analysis",
      description:
        "Upload PDF, CSV, or image bills. AI-powered OCR extracts usage patterns instantly.",
      badge: "AI Powered",
    },
    {
      icon: Sun,
      title: "System Sizing",
      description:
        "Automatically calculate optimal solar panel and battery configurations.",
      badge: "Automated",
    },
    {
      icon: Battery,
      title: "BOM Generation",
      description:
        "Generate detailed bills of materials with real-time pricing from distributors.",
      badge: "Real-time",
    },
    {
      icon: ShieldCheck,
      title: "NEC Compliance",
      description:
        "Built-in NEC 2023 checks ensure your designs meet electrical code standards.",
      badge: "Compliant",
    },
    {
      icon: FileText,
      title: "Professional Reports",
      description:
        "One-click PDF generation with branding, charts, and detailed specifications.",
      badge: "Branded",
    },
    {
      icon: TrendingUp,
      title: "ROI Analysis",
      description:
        "Calculate savings, payback periods, and long-term energy cost reductions.",
      badge: "Analytics",
    },
  ];

  const steps = [
    {
      number: "01",
      title: "Upload Bills",
      description: "Upload customer power bills for the past 1-12 months",
    },
    {
      number: "02",
      title: "Configure System",
      description: "Set backup duration and critical load requirements",
    },
    {
      number: "03",
      title: "Review & Plan",
      description: "Review sizing, BOM pricing, and compliance warnings",
    },
    {
      number: "04",
      title: "Generate PDF",
      description: "Export professional reports with one click",
    },
  ];

  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#0A0F1C] via-[#0f1829] to-background min-h-screen w-screen -ml-[50vw] left-1/2">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f15_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f15_1px,transparent_1px)] bg-[size:14px_24px]" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-600/20 rounded-full blur-[100px]" />

        <div className="relative w-full px-4 py-16 sm:px-6 sm:py-24 lg:px-8 min-h-screen">
          <div className="grid gap-0 lg:grid-cols-2 lg:gap-0 items-stretch min-h-[calc(100vh-8rem)]">
            {/* Left Column - Hero Content */}
            <div className="space-y-8 bg-gradient-to-b from-[#0A0F1C] via-[#0f1829] to-[#0A0F1C] p-8 sm:p-12 lg:p-16 flex flex-col justify-center min-h-full">
              <div className="space-y-4">
                <Badge
                  variant="secondary"
                  className="bg-cyan-500/10 text-cyan-300 border-cyan-500/20 px-3 py-1"
                >
                  <Zap className="h-3 w-3 mr-1" />
                  AI-Powered Energy Planning
                </Badge>

                <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
                  Design Solar Systems
                  <span className="block bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                    in Minutes
                  </span>
                </h1>

                <p className="text-lg text-gray-300 max-w-2xl">
                  AI Energy Planner for Solar & Battery Systems. Analyze power
                  bills, size PV and storage, build a BOM, run NEC checks, and
                  generate professional PDFs—end to end.
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-wrap gap-4">
                <Button
                  asChild
                  size="lg"
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all duration-200"
                >
                  <Link href="/wizard/new" className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Start New Project
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="border-cyan-500/30 text-white hover:bg-cyan-500/10"
                >
                  <Link href="/projects">View Projects</Link>
                </Button>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-8 pt-4">
                <div>
                  <div className="text-3xl font-bold text-cyan-400">30min</div>
                  <div className="text-sm text-gray-400">
                    Average Project Time
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-cyan-400">
                    NEC 2023
                  </div>
                  <div className="text-sm text-gray-400">
                    Compliance Built-in
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-cyan-400">
                    1-Click
                  </div>
                  <div className="text-sm text-gray-400">PDF Export</div>
                </div>
              </div>
            </div>

            {/* Right Column - Quick Start Card */}
            <div className={cn("relative min-h-full flex items-stretch", pageConfig.theme.rightPanel.backgroundColor)}>
              <Card className={cn("border-gray-200 shadow-2xl w-full flex flex-col", pageConfig.theme.rightPanel.backgroundColor)}>
                <CardHeader className="flex-shrink-0">
                  <CardTitle className={cn("flex items-center gap-2", pageConfig.theme.rightPanel.textColor)}>
                    <Zap className={cn("h-5 w-5", pageConfig.theme.rightPanel.accentColor)} />
                    Quick Start Guide
                  </CardTitle>
                  <CardDescription className={cn(pageConfig.theme.rightPanel.textColor, "opacity-80")}>
                    Get your first solar system designed in 4 simple steps
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-4 flex-1">
                    {steps.map((step, index) => (
                      <div
                        key={step.number}
                        className={cn(
                          "flex gap-4 p-3 rounded-lg transition-colors duration-200",
                          pageConfig.theme.rightPanel.backgroundColor === "bg-white"
                            ? "bg-gray-50 hover:bg-gray-100"
                            : "bg-white/10 hover:bg-white/20"
                        )}
                      >
                        <div className="flex-shrink-0">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-white font-bold">
                            {step.number}
                          </div>
                        </div>
                        <div className="flex-1">
                          <h4 className={cn("font-semibold", pageConfig.theme.rightPanel.textColor)}>
                            {step.title}
                          </h4>
                          <p className={cn("text-sm", pageConfig.theme.rightPanel.textColor, "opacity-80")}>
                            {step.description}
                          </p>
                        </div>
                        {index < steps.length - 1 && (
                          <div className="flex items-center">
                            <ArrowRight className={cn("h-4 w-4", pageConfig.theme.rightPanel.textColor, "opacity-60")} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <Button
                    asChild
                    size="lg"
                    className="w-full mt-4 bg-cyan-600 hover:bg-cyan-700 flex-shrink-0"
                  >
                    <Link href="/wizard/new">Start Your First Project</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-24 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge
              variant="secondary"
              className="mb-4 bg-cyan-500/10 text-cyan-600 border-cyan-500/20"
            >
              Features
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
              Everything You Need for Solar Design
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Comprehensive tools to streamline your solar and battery system
              planning workflow
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={feature.title}
                  className="group relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:scale-[1.02]"
                >
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <div className="rounded-lg bg-cyan-50 dark:bg-cyan-950/20 p-3">
                        <Icon className="h-6 w-6 text-cyan-600" />
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {feature.badge}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-cyan-600 to-blue-700">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl mb-4">
            Ready to Design Your Next Solar System?
          </h2>
          <p className="text-xl text-cyan-50 mb-8 max-w-2xl mx-auto">
            Start planning smarter solar solutions with AI-powered tools and
            instant reports
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="bg-white text-cyan-700 hover:bg-gray-100 font-semibold shadow-lg"
            >
              <Link href="/wizard/new" className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Create Project Now
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-white/30 text-white hover:bg-white/10"
            >
              <Link href="/distributors">Browse Distributors</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
