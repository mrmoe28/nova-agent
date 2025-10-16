"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Plus, FolderOpen } from "lucide-react"

export default function BrandHeader() {
  return (
    <header className="border-b bg-[#0A0F1C]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="relative h-9 w-9">
            <Image
              src="/novaagent-logo.svg"
              alt="NovaAgent logo"
              fill
              priority
            />
          </div>
          <div className="leading-tight">
            <div className="text-lg font-semibold tracking-tight text-white">
              NovaAgent ⚡
            </div>
            <div className="text-xs text-cyan-200/80">
              AI Energy Planner for Solar & Battery Systems
            </div>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="secondary"
            className="bg-white/10 text-white hover:bg-white/20"
          >
            <Link href="/wizard/new">
              <Plus className="mr-2 h-4 w-4" /> New Project
            </Link>
          </Button>
          <Button
            asChild
            className="bg-[#22D3EE] text-black hover:bg-[#6EE7F9]"
          >
            <Link href="/projects">
              <FolderOpen className="mr-2 h-4 w-4" /> Open Project
            </Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
