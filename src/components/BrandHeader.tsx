"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FolderOpen, Building2, Zap, LayoutDashboard, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

export default function BrandHeader() {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "Distributors",
      href: "/distributors",
      icon: Building2,
    },
    {
      label: "Projects",
      href: "/projects",
      icon: FolderOpen,
    },
    {
      label: "PTO Agent",
      href: "https://ptoagent.app/",
      icon: ExternalLink,
      external: true,
    },
  ];

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <header className="sticky top-0 z-50 border-b bg-gradient-to-r from-[#0A0F1C] to-[#0f1829] backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        {/* Logo and Brand */}
        <Link
          href="/"
          className="flex items-center gap-3 group transition-transform duration-200 hover:scale-105"
        >
          <div className="relative h-10 w-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 p-2 shadow-lg shadow-cyan-500/20 transition-shadow duration-200 group-hover:shadow-cyan-500/40">
            <Zap className="h-full w-full text-white" />
          </div>
          <div className="leading-tight hidden sm:block">
            <div className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              NovaAgent
              <Badge
                variant="secondary"
                className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-[10px] px-1.5 py-0"
              >
                AI
              </Badge>
            </div>
            <div className="text-xs text-cyan-200/60">
              Solar & Battery Energy Planner
            </div>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = !item.external && isActive(item.href);

            return (
              <Button
                key={item.href}
                asChild
                variant="ghost"
                size="sm"
                className={cn(
                  "relative text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200",
                  active && "text-white bg-white/10",
                )}
              >
                <Link 
                  href={item.href} 
                  className="flex items-center gap-2"
                  {...(item.external && { target: "_blank", rel: "noopener noreferrer" })}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                  {active && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full" />
                  )}
                </Link>
              </Button>
            );
          })}

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* CTA Button */}
          <Button
            asChild
            size="sm"
            className={cn(
              "bg-gradient-to-r from-cyan-500 to-blue-600",
              "hover:from-cyan-600 hover:to-blue-700",
              "text-white font-semibold",
              "shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40",
              "transition-all duration-200",
              "ml-2",
            )}
          >
            <Link href="/wizard/new" className="flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Project</span>
              <span className="sm:hidden">New</span>
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
