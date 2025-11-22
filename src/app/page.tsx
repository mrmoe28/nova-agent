"use client";

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
import { cn } from "@/lib/utils";
import {
  MotionDiv,
  MotionCard,
  MotionStagger,
  MotionGradient,
  FloatingAnimation,
  fadeInUp,
  slideInFromLeft,
  slideInFromRight,
  staggerContainer,
  smoothTransition,
} from "@/components/motion";

export default function Page() {
  const features = [
    {
      icon: Upload,
      title: "Smart Bill Analysis",
      description:
        "Upload PDF, CSV, or image bills. AI-powered OCR extracts usage patterns instantly.",
      badge: "AI Powered",
      gradient: "from-violet-500/20 to-purple-500/20",
    },
    {
      icon: Sun,
      title: "System Sizing",
      description:
        "Automatically calculate optimal solar panel and battery configurations.",
      badge: "Automated",
      gradient: "from-purple-500/20 to-fuchsia-500/20",
    },
    {
      icon: Battery,
      title: "BOM Generation",
      description:
        "Generate detailed bills of materials with real-time pricing from distributors.",
      badge: "Real-time",
      gradient: "from-fuchsia-500/20 to-pink-500/20",
    },
    {
      icon: ShieldCheck,
      title: "NEC Compliance",
      description:
        "Built-in NEC 2023 checks ensure your designs meet electrical code standards.",
      badge: "Compliant",
      gradient: "from-violet-500/20 to-indigo-500/20",
    },
    {
      icon: FileText,
      title: "Professional Reports",
      description:
        "One-click PDF generation with branding, charts, and detailed specifications.",
      badge: "Branded",
      gradient: "from-purple-500/20 to-violet-500/20",
    },
    {
      icon: TrendingUp,
      title: "ROI Analysis",
      description:
        "Calculate savings, payback periods, and long-term energy cost reductions.",
      badge: "Analytics",
      gradient: "from-fuchsia-500/20 to-purple-500/20",
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
      <section className="relative overflow-hidden bg-gradient-to-b from-[#1e1b4b] via-[#312e81] to-[#4c1d95] min-h-screen">
        {/* Animated grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8b5cf620_1px,transparent_1px),linear-gradient(to_bottom,#8b5cf620_1px,transparent_1px)] bg-[size:14px_24px]" />
        
        {/* Animated gradient orbs - reduced opacity and removed blur to ensure text visibility */}
        <MotionDiv
          className="absolute top-0 right-0 w-[600px] h-[600px] bg-violet-500/10 rounded-full -z-10"
          variants={{
            initial: { scale: 0.8, opacity: 0 },
            animate: {
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.15, 0.1],
            },
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <MotionDiv
          className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/10 rounded-full -z-10"
          variants={{
            initial: { scale: 0.8, opacity: 0 },
            animate: {
              scale: [1, 1.3, 1],
              opacity: [0.1, 0.15, 0.1],
            },
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
        />
        <MotionDiv
          className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-fuchsia-500/8 rounded-full -translate-x-1/2 -translate-y-1/2 -z-10"
          variants={{
            initial: { scale: 0.8, opacity: 0 },
            animate: {
              scale: [1, 1.4, 1],
              opacity: [0.08, 0.12, 0.08],
            },
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
        />

        <div className="relative z-10 w-full px-4 py-16 sm:px-6 sm:py-24 lg:px-8 min-h-screen max-w-7xl mx-auto">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-center min-h-[calc(100vh-8rem)]">
            {/* Left Column - Hero Content */}
            <MotionDiv
              variants={slideInFromLeft}
              transition={smoothTransition}
              className="space-y-8 flex flex-col justify-center"
            >
              <div className="space-y-6">
                <MotionDiv
                  variants={fadeInUp}
                  transition={{ ...smoothTransition, delay: 0.2 }}
                >
                  <Badge
                    variant="secondary"
                    className="bg-violet-500/20 text-violet-300 border-violet-500/30 px-4 py-1.5 inline-flex items-center w-fit backdrop-blur-sm"
                  >
                    <Zap className="h-3 w-3 mr-2" />
                    AI-Powered Energy Planning
                  </Badge>
                </MotionDiv>

                <MotionDiv
                  variants={fadeInUp}
                  transition={{ ...smoothTransition, delay: 0.3 }}
                >
                  <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl leading-tight">
                    Design Solar Systems
                    <span className="block bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent mt-2">
                      in Minutes
                    </span>
                  </h1>
                </MotionDiv>

                <MotionDiv
                  variants={fadeInUp}
                  transition={{ ...smoothTransition, delay: 0.4 }}
                >
                  <p className="text-xl text-gray-200 max-w-xl leading-relaxed">
                    AI Energy Planner for Solar & Battery Systems. Analyze power
                    bills, size PV and storage, build a BOM, run NEC checks, and
                    generate professional PDFs—end to end.
                  </p>
                </MotionDiv>
              </div>

              {/* CTA Buttons */}
              <MotionDiv
                variants={fadeInUp}
                transition={{ ...smoothTransition, delay: 0.5 }}
                className="flex flex-col sm:flex-row gap-4"
              >
                <Button
                  asChild
                  size="lg"
                  className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white font-semibold shadow-2xl shadow-violet-500/50 transition-all duration-300 text-base px-8 py-6"
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
                  className="border-violet-500/30 text-white transition-all duration-300 text-base px-8 py-6 backdrop-blur-sm"
                >
                  <Link href="/projects">View Projects</Link>
                </Button>
              </MotionDiv>

              {/* Stats */}
              <MotionDiv
                variants={fadeInUp}
                transition={{ ...smoothTransition, delay: 0.6 }}
                className="flex flex-wrap gap-8 sm:gap-12 pt-6"
              >
                <div>
                  <div className="text-4xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent mb-1">
                    30min
                  </div>
                  <div className="text-sm text-gray-300">
                    Average Project Time
                  </div>
                </div>
                <div>
                  <div className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent mb-1">
                    NEC 2023
                  </div>
                  <div className="text-sm text-gray-300">
                    Compliance Built-in
                  </div>
                </div>
                <div>
                  <div className="text-4xl font-bold bg-gradient-to-r from-fuchsia-400 to-violet-400 bg-clip-text text-transparent mb-1">
                    1-Click
                  </div>
                  <div className="text-sm text-gray-300">PDF Export</div>
                </div>
              </MotionDiv>
            </MotionDiv>

            {/* Right Column - Quick Start Card */}
            <MotionDiv
              variants={slideInFromRight}
              transition={smoothTransition}
              className="relative min-h-full flex items-center justify-center p-8"
            >
              <MotionCard
                delay={0.3}
                className="w-full max-w-md"
              >
                <Card className="border-violet-500/20 shadow-2xl w-full flex flex-col rounded-2xl bg-gradient-to-br from-violet-950/90 to-purple-950/90 backdrop-blur-0">
                  <CardHeader className="flex-shrink-0 space-y-2">
                    <CardTitle className="flex items-center gap-2 text-white text-xl">
                      <FloatingAnimation>
                        <Zap className="h-5 w-5 text-violet-400" />
                      </FloatingAnimation>
                      Quick Start Guide
                    </CardTitle>
                    <CardDescription className="text-gray-300">
                      Get your first solar system designed in 4 simple steps
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-3 flex-1">
                      {steps.map((step, index) => (
                        <MotionDiv
                          key={step.number}
                          variants={fadeInUp}
                          transition={{ ...smoothTransition, delay: 0.4 + index * 0.1 }}
                          className="flex gap-4 p-4 rounded-xl bg-violet-950/30 hover:bg-violet-900/40 transition-all duration-300 border border-violet-500/20 hover:border-violet-400/40 group"
                        >
                          <div className="flex-shrink-0">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 text-white font-bold text-sm shadow-lg shadow-violet-500/30 group-hover:shadow-violet-500/50 transition-all duration-300">
                              {step.number}
                            </div>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-white mb-1">
                              {step.title}
                            </h4>
                            <p className="text-sm text-gray-300">
                              {step.description}
                            </p>
                          </div>
                        </MotionDiv>
                      ))}
                    </div>

                    <Button
                      asChild
                      size="lg"
                      className="w-full mt-6 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-700 hover:via-purple-700 hover:to-fuchsia-700 text-white font-semibold shadow-lg shadow-violet-500/40 hover:shadow-violet-500/60 transition-all duration-300"
                    >
                      <Link href="/wizard/new" className="flex items-center justify-center gap-2">
                        <Sparkles className="h-5 w-5" />
                        Start Your First Project
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </MotionCard>
            </MotionDiv>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-24 bg-background px-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <MotionDiv
            variants={fadeInUp}
            transition={smoothTransition}
            className="text-center mb-12"
          >
            <Badge
              variant="secondary"
              className="mb-4 bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20"
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
          </MotionDiv>

          <MotionStagger className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <MotionCard key={feature.title} delay={index * 0.1}>
                  <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-2xl border-2 hover:border-violet-500/50 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
                    <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300 from-violet-500/5 to-purple-500/5" />
                    <CardHeader className="relative z-10">
                      <div className="flex items-center justify-between mb-2">
                        <MotionGradient
                          gradient={feature.gradient}
                          className="rounded-lg p-3"
                        >
                          <Icon className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                        </MotionGradient>
                        <Badge variant="secondary" className="text-xs bg-violet-100 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800">
                          {feature.badge}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                        {feature.title}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {feature.description}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </MotionCard>
              );
            })}
          </MotionStagger>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff10_1px,transparent_1px),linear-gradient(to_bottom,#ffffff10_1px,transparent_1px)] bg-[size:20px_20px]" />
        <div className="mx-auto max-w-7xl text-center relative z-10">
          <MotionDiv variants={fadeInUp} transition={smoothTransition}>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl mb-4">
              Ready to Design Your Next Solar System?
            </h2>
            <p className="text-xl text-violet-50 mb-8 max-w-2xl mx-auto">
              Start planning smarter solar solutions with AI-powered tools and
              instant reports
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button
                asChild
                size="lg"
                className="bg-white text-violet-700 hover:bg-gray-100 font-semibold shadow-xl hover:shadow-2xl transition-all duration-300"
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
                className="border-white/30 text-white hover:bg-white/10 backdrop-blur-sm"
              >
                <Link href="/distributors">Browse Distributors</Link>
              </Button>
            </div>
          </MotionDiv>
        </div>
      </section>
    </div>
  );
}
