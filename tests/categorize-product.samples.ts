#!/usr/bin/env tsx

import { categorizeProduct } from "@/lib/categorize-product";
import type { EquipmentCategory } from "@prisma/client";

type Sample = {
  label: string;
  name: string;
  description?: string;
  sourceUrl?: string;
  expected: EquipmentCategory;
};

// Representative Renewable Outdoors-style samples
const samples: Sample[] = [
  {
    label: "Battery – collection URL",
    name: "EG4 LL-S Lithium Battery 48V 100Ah",
    sourceUrl:
      "https://renewableoutdoors.com/collections/batteries/products/eg4-ll-s-lithium-battery-48v-100ah",
    expected: "BATTERY",
  },
  {
    label: "Rigid solar panel – collection URL",
    name: "Rigid 400W Monocrystalline Solar Panel",
    sourceUrl:
      "https://renewableoutdoors.com/collections/rigid-solar-panels/products/rigid-400w-monocrystalline-solar-panel",
    expected: "SOLAR_PANEL",
  },
  {
    label: "Hybrid inverter – collection URL",
    name: "EG4 18kPV Hybrid Inverter All-In-One",
    description:
      "EG4 18kPV Hybrid Inverter | 48V Split Phase 120/240VAC | All-in-one hybrid inverter",
    sourceUrl:
      "https://renewableoutdoors.com/collections/hybrid-inverters/products/eg4-18kpv-hybrid-inverter-all-in-one-solar-inverter-18000w-pv-input-12000w-output-48v-120-240v-split-phase",
    expected: "INVERTER",
  },
];

function run() {
  console.log("\n=== Categorize Product Samples ===\n");

  for (const sample of samples) {
    const urlText = sample.sourceUrl
      ? new URL(sample.sourceUrl).pathname.replace(/[/_-]/g, " ")
      : "";

    const combinedName = [sample.name, urlText].filter(Boolean).join(" ");

    const category = categorizeProduct(
      combinedName,
      sample.description ?? null,
    );

    const pass = category === sample.expected;

    console.log(
      `${pass ? "✓" : "✗"} ${sample.label}: expected ${sample.expected}, got ${category}`,
    );

    if (!pass) {
      process.exitCode = 1;
    }
  }
}

run();


