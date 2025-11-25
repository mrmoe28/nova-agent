"use client";

import Link from "next/link";
import { motion } from "framer-motion";
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
    <div className="-mx-4 sm:-mx-6">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#0A0F1C] via-[#0f1829] to-background min-h-screen">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f15_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f15_1px,transparent_1px)] bg-[size:14px_24px]" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-600/20 rounded-full blur-[100px]" />

        <div className="relative w-full px-4 py-16 sm:px-6 sm:py-24 lg:px-8 min-h-screen max-w-7xl mx-auto">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-center min-h-[calc(100vh-8rem)]">
            {/* Left Column - Hero Content */}
            <div className="space-y-8 flex flex-col justify-center">
              <div className="space-y-6">
                <Badge
                  variant="secondary"
                  className="bg-cyan-500/10 text-cyan-300 border-cyan-500/20 px-3 py-1 inline-flex items-center w-fit"
                >
                  <Zap className="h-3 w-3 mr-1" />
                  AI-Powered Energy Planning
                </Badge>

                <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl leading-tight">
                  Design Solar Systems
                  <span className="block bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mt-2">
                    in Minutes
                  </span>
                </h1>

                <p className="text-xl text-gray-300 max-w-xl leading-relaxed">
                  AI Energy Planner for Solar & Battery Systems. Analyze power
                  bills, size PV and storage, build a BOM, run NEC checks, and
                  generate professional PDFs—end to end.
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  asChild
                  size="lg"
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold shadow-xl shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-all duration-200 text-base px-8 py-6"
                >
                  <Link href="/wizard/new" className="flex items-center justify-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Start New Project
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="border-cyan-500/30 text-white hover:bg-cyan-500/10 hover:border-cyan-500/50 transition-all duration-200 text-base px-8 py-6"
                >
                  <Link href="/projects">View Projects</Link>
                </Button>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-8 sm:gap-12 pt-6">
                <div>
                  <div className="text-4xl font-bold text-cyan-400 mb-1">30min</div>
                  <div className="text-sm text-gray-400">
                    Average Project Time
                  </div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-cyan-400 mb-1">
                    NEC 2023
                  </div>
                  <div className="text-sm text-gray-400">
                    Compliance Built-in
                  </div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-cyan-400 mb-1">
                    1-Click
                  </div>
                  <div className="text-sm text-gray-400">PDF Export</div>
                </div>
              </div>
            </div>

            {/* Right Column - Quick Start Card */}
            <div className={cn("relative min-h-full flex items-center justify-center p-8")}>
              <Card className={cn("border-gray-800/50 shadow-2xl w-full max-w-md flex flex-col rounded-2xl bg-[#0f1829]/80 backdrop-blur-sm")}>
                <CardHeader className="flex-shrink-0 space-y-2">
                  <CardTitle className="flex items-center gap-2 text-white text-xl">
                    <Zap className="h-5 w-5 text-cyan-400" />
                    Quick Start Guide
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Get your first solar system designed in 4 simple steps
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-3 flex-1">
                    {steps.map((step, index) => (
                      <motion.div
                        key={step.number}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className="flex gap-4 p-4 rounded-xl bg-[#0A0F1C]/60 hover:bg-[#0A0F1C]/80 transition-all duration-200 border border-gray-800/30 hover:border-cyan-500/30"
                      >
                        <div className="flex-shrink-0">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-white font-bold text-sm shadow-lg shadow-cyan-500/20">
                            {step.number}
                          </div>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-white mb-1">
                            {step.title}
                          </h4>
                          <p className="text-sm text-gray-400">
                            {step.description}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <Button
                    asChild
                    size="lg"
                    className="w-full mt-6 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all duration-200"
                  >
                    <Link href="/wizard/new" className="flex items-center justify-center gap-2">
                      <Sparkles className="h-5 w-5" />
                      Start Your First Project
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-24 bg-background px-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
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
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <Card
                    className="group relative overflow-hidden transition-all duration-200 hover:shadow-xl hover:scale-[1.02] border-2 hover:border-primary/50"
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
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Existing Installation Section */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-background to-orange-950/10 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-2 items-center">
            {/* Left Column - Content */}
            <div className="space-y-6">
              <Badge
                variant="secondary"
                className="bg-orange-500/10 text-orange-600 border-orange-500/20"
              >
                <ShieldCheck className="h-3 w-3 mr-1" />
                Already Have Solar?
              </Badge>

              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Get Your Existing System
                <span className="block bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent mt-2">
                  Permitted & Compliant
                </span>
              </h2>

              <p className="text-lg text-muted-foreground leading-relaxed">
                Many homeowners have solar systems installed without proper permits due to DIY installations,
                unlicensed contractors, or incomplete paperwork. We provide a streamlined workflow to bring
                existing installations into compliance.
              </p>

              <div className="space-y-3 pt-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center mt-0.5">
                    <ShieldCheck className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">NEC Code Compliance</h4>
                    <p className="text-sm text-muted-foreground">
                      Automatic compliance checking and remediation recommendations
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center mt-0.5">
                    <FileText className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Document Preparation</h4>
                    <p className="text-sm text-muted-foreground">
                      Complete permit application packages with all required documentation
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center mt-0.5">
                    <TrendingUp className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Cost & Timeline Estimates</h4>
                    <p className="text-sm text-muted-foreground">
                      Transparent pricing for permit fees, inspections, and required upgrades
                    </p>
                  </div>
                </div>
              </div>

              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold shadow-xl shadow-orange-500/30 hover:shadow-orange-500/50 transition-all duration-200"
              >
                <Link href="/existing-installation" className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5" />
                  Complete Your Permits
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            {/* Right Column - Stats Card */}
            <div className="relative">
              <Card className="border-orange-500/20 shadow-2xl bg-gradient-to-br from-orange-950/20 to-red-950/20 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <FileText className="h-5 w-5 text-orange-500" />
                    Retroactive Permitting
                  </CardTitle>
                  <CardDescription>
                    Typical timeline and costs for permit completion
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-background/50 border border-orange-500/10">
                      <div className="text-3xl font-bold text-orange-500 mb-1">3-8</div>
                      <div className="text-sm text-muted-foreground">Weeks to Complete</div>
                    </div>
                    <div className="p-4 rounded-lg bg-background/50 border border-orange-500/10">
                      <div className="text-3xl font-bold text-orange-500 mb-1">$3-4K</div>
                      <div className="text-sm text-muted-foreground">Average Cost</div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                      What's Included
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                        <span>Compliance assessment & code checks</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                        <span>Document preparation & submission</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                        <span>Inspection scheduling & coordination</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                        <span>Final approval & PTO processing</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20 mt-4">
                    <p className="text-sm text-orange-800 dark:text-orange-200 leading-relaxed">
                      <strong>Peace of Mind:</strong> Protect your investment, maintain insurance coverage,
                      and avoid issues when selling your home.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-cyan-600 to-blue-700 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl text-center">
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
    </div>
  );
}
