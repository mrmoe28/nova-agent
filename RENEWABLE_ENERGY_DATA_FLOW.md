# Renewable Energy Extraction - Data Flow Diagram

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER UPLOADS BILL FILE                          │
│                    (PDF/Image with renewable info)                      │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          OCR TEXT EXTRACTION                            │
│   performOCR() → Claude AI / pdf-parse / Tesseract.js                  │
│   Returns: { text, confidence, pageCount }                             │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        PARSE EXTRACTED TEXT                             │
│                    parseBillText(text: string)                          │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  EXISTING FIELDS          │  NEW RENEWABLE FIELDS             │   │
│  │  ──────────────────       │  ────────────────────             │   │
│  │  • Utility Company        │  • Renewable Type                 │   │
│  │  • Account Number         │    - solar/wind/hydro/            │   │
│  │  • Billing Period         │      geothermal/biomass           │   │
│  │  • Usage (kWh, kW)        │  • Capacity (kW)                  │   │
│  │  • Charges                │    - Auto MW→kW conversion        │   │
│  │  • Daily Usage            │  • Capacity Unit                  │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    VALIDATE RENEWABLE SOURCE DATA                       │
│          validateRenewableSource(renewableSource?)                      │
│                                                                         │
│  Checks:                          Returns:                             │
│  ✓ Valid type (solar/wind/etc)    • isValid: boolean                  │
│  ✓ Capacity range (0-100k kW)     • errors: string[]                  │
│  ✓ Unit validation                • warnings: string[]                │
│                                                                         │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    CALCULATE CAPACITY & PRODUCTION                      │
│    calculateCapacity(type, capacityKw, customFactor?)                  │
│                                                                         │
│  Capacity Factors:               Returns:                              │
│  • Solar:      20%               • sourceType                          │
│  • Wind:       35%               • nameplateCapacityKw                 │
│  • Hydro:      50%               • capacityFactor                      │
│  • Geothermal: 80%               • effectiveCapacityKw                 │
│  • Biomass:    70%               • annualProductionKwh                 │
│                                                                         │
│  Formula:                                                              │
│  effectiveCapacityKw = nameplateKw × capacityFactor                   │
│  annualProductionKwh = effectiveCapacityKw × 8760 hrs                 │
│                                                                         │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        STORE IN DATABASE                                │
│                    (Prisma ORM → PostgreSQL)                            │
│                                                                         │
│  Analysis Table:                                                       │
│  • renewableType: string                                               │
│  • renewableCapacityKw: number                                         │
│  • annualProductionKwh: number                                         │
│  • capacityFactor: number                                              │
│                                                                         │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       DISPLAY TO USER / PDF REPORT                      │
│  • Show renewable system details                                       │
│  • Display production estimates                                        │
│  • Include in system sizing recommendations                            │
│  • Add to PDF report generation                                        │
└─────────────────────────────────────────────────────────────────────────┘
```

## Pattern Matching Examples

### Renewable Type Detection

```
INPUT TEXT EXAMPLES:
─────────────────────────────────────────────────────────────────
"Renewable source: solar"              →  type: "solar"
"Solar panel system installed"         →  type: "solar"
"Wind turbine power generation"        →  type: "wind"
"On-site geothermal energy"           →  type: "geothermal"
"Biomass installation"                 →  type: "biomass"
"Hydro power system"                   →  type: "hydro"

PATTERNS USED:
─────────────────────────────────────────────────────────────────
Pattern 1: /(?:renewable|generation)\s*(?:source|type|energy)[:\s]*(solar|wind|...)/gi
Pattern 2: /(solar|wind|hydro|geothermal|biomass)\s*(?:panel|turbine|power|...)/gi
Pattern 3: /(?:installed|on-site)\s*(solar|wind|...)/gi
Pattern 4: /(solar|wind|...)\s*(?:installation|array|farm)/gi
```

### Capacity Detection & Conversion

```
INPUT TEXT EXAMPLES:
─────────────────────────────────────────────────────────────────
"Capacity: 5.5 kW"                     →  capacity: 5.5 kW
"System Size: 2.5 MW"                  →  capacity: 2500 kW (converted)
"750 kilowatt installation"            →  capacity: 750 kW
"Nameplate: 10 MW solar"               →  capacity: 10000 kW (converted)
"Installed capacity: 3.2 megawatt"     →  capacity: 3200 kW (converted)

PATTERNS USED:
─────────────────────────────────────────────────────────────────
Pattern 1: /(?:capacity|rated|nameplate)[:\s]*(\d+(?:\.\d+)?)\s*(kW|MW|...)/gi
Pattern 2: /(\d+(?:\.\d+)?)\s*(kW|MW|...)\s*(?:capacity|system|...)/gi
Pattern 3: /(?:system\s*size|installed\s*capacity)[:\s]*(\d+(?:\.\d+)?)\s*(kW|MW)/gi
Pattern 4: /(\d+(?:\.\d+)?)\s*(kW|MW)\s*(?:solar|wind|...)/gi

CONVERSION LOGIC:
─────────────────────────────────────────────────────────────────
if (unit.startsWith('mw') || unit === 'megawatt') {
  capacityValue = rawCapacity * 1000;  // MW to kW
  capacityUnit = 'kW';
} else {
  capacityValue = rawCapacity;
  capacityUnit = 'kW';
}
```

## Validation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│           validateRenewableSource(renewableSource)              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
                     ┌───────────────┐
                     │ Data exists?  │
                     └───────┬───────┘
                             │
                ┌────────────┴────────────┐
                │ No                      │ Yes
                ▼                         ▼
        ┌───────────────┐        ┌──────────────────┐
        │ Return valid  │        │  Validate Type   │
        │ with warning  │        │  (solar/wind/etc)│
        └───────────────┘        └────────┬─────────┘
                                          │
                                ┌─────────┴──────────┐
                                │ Valid?             │
                                ▼                    ▼
                           ┌─────────┐         ┌─────────┐
                           │  OK     │         │ ERROR   │
                           └────┬────┘         └─────────┘
                                │
                                ▼
                        ┌──────────────────┐
                        │ Validate Capacity│
                        │  (0 < x ≤ 100k)  │
                        └────────┬─────────┘
                                 │
                       ┌─────────┴──────────────┐
                       │                        │
                       ▼                        ▼
                  ┌─────────┐            ┌─────────┐
                  │  OK     │            │ ERROR/  │
                  │         │            │ WARNING │
                  └────┬────┘            └─────────┘
                       │
                       ▼
               ┌──────────────────┐
               │  Validate Unit   │
               │   (kW variants)  │
               └────────┬─────────┘
                        │
                        ▼
                ┌──────────────────┐
                │ Return Validation│
                │   { isValid,     │
                │     errors,      │
                │     warnings }   │
                └──────────────────┘
```

## Capacity Calculation Flow

```
┌───────────────────────────────────────────────────────────────────┐
│  calculateCapacity(sourceType, nameplateKw, customFactor?)       │
└─────────────────────────────┬─────────────────────────────────────┘
                              │
                              ▼
                   ┌────────────────────┐
                   │ Custom factor      │
                   │ provided?          │
                   └──────┬─────────────┘
                          │
              ┌───────────┴───────────┐
              │ No                    │ Yes
              ▼                       ▼
    ┌───────────────────┐    ┌────────────────┐
    │ Use default       │    │ Validate range │
    │ capacity factor   │    │   (0 < x ≤ 1)  │
    │                   │    └────────┬───────┘
    │ Solar:   0.20     │             │
    │ Wind:    0.35     │    ┌────────┴────────┐
    │ Hydro:   0.50     │    │ Valid?          │
    │ Geo:     0.80     │    ▼                 ▼
    │ Biomass: 0.70     │  ┌────┐        ┌────────┐
    │ Unknown: 0.20     │  │ OK │        │ THROW  │
    └────────┬──────────┘  └──┬─┘        │ ERROR  │
             │                │          └────────┘
             └────────────────┘
                      │
                      ▼
         ┌──────────────────────────────┐
         │ Calculate Effective Capacity │
         │                              │
         │ effectiveKw = nameplateKw    │
         │             × capacityFactor │
         └──────────────┬───────────────┘
                        │
                        ▼
         ┌──────────────────────────────┐
         │ Calculate Annual Production  │
         │                              │
         │ annualKwh = effectiveKw      │
         │           × 8760 hours       │
         └──────────────┬───────────────┘
                        │
                        ▼
         ┌──────────────────────────────┐
         │ Return CapacityCalculation   │
         │  {                           │
         │    sourceType,               │
         │    nameplateCapacityKw,      │
         │    capacityFactor,           │
         │    effectiveCapacityKw,      │
         │    annualProductionKwh       │
         │  }                           │
         └──────────────────────────────┘
```

## Example: Complete Processing Pipeline

### Input Bill Text
```
Georgia Power
Account Number: 02608-44013
Service Period: Aug 29, 2025 - Sept 30, 2025
Total kWh Used: 1250
Total Due: $144.00

Renewable Generation: Solar Panel System
Installed Capacity: 5.5 kW
On-site Solar Energy Production
```

### Step-by-Step Processing

```
STEP 1: OCR TEXT EXTRACTION
────────────────────────────────────────────────────────────
performOCR(filePath, 'pdf')
  → Claude AI extraction
  → Returns: { text: "Georgia Power...", confidence: 0.98 }

STEP 2: PARSE TEXT
────────────────────────────────────────────────────────────
parseBillText(text)

  Existing fields extracted:
  ✓ utilityCompany: "Georgia Power"
  ✓ accountNumber: "02608-44013"
  ✓ billingPeriod: { start: "Aug 29, 2025", end: "Sept 30, 2025" }
  ✓ usage: { kwh: 1250 }
  ✓ charges: { total: 144.00 }

  NEW renewable fields extracted:
  ✓ Pattern match: "Solar Panel System" → type: "solar"
  ✓ Pattern match: "5.5 kW" → capacity: 5.5, unit: "kW"

  Returns:
  {
    utilityCompany: "Georgia Power",
    accountNumber: "02608-44013",
    billingPeriod: { start: "Aug 29, 2025", end: "Sept 30, 2025" },
    usage: { kwh: 1250 },
    charges: { total: 144.00 },
    renewableSource: {
      type: "solar",
      capacity: 5.5,
      capacityUnit: "kW"
    }
  }

STEP 3: VALIDATE RENEWABLE SOURCE
────────────────────────────────────────────────────────────
validateRenewableSource(parsedData.renewableSource)

  Checks:
  ✓ Type "solar" is valid (in allowed list)
  ✓ Capacity 5.5 kW is within range (0 < 5.5 ≤ 100,000)
  ✓ Unit "kW" is expected

  Returns:
  {
    isValid: true,
    errors: [],
    warnings: []
  }

STEP 4: CALCULATE PRODUCTION
────────────────────────────────────────────────────────────
calculateCapacity("solar", 5.5)

  Lookup capacity factor:
  → Solar default: 0.20 (20%)

  Calculate effective capacity:
  → 5.5 kW × 0.20 = 1.1 kW

  Calculate annual production:
  → 1.1 kW × 8760 hours = 9,636 kWh/year

  Returns:
  {
    sourceType: "solar",
    nameplateCapacityKw: 5.5,
    capacityFactor: 0.20,
    effectiveCapacityKw: 1.1,
    annualProductionKwh: 9636
  }

STEP 5: STORE IN DATABASE
────────────────────────────────────────────────────────────
await prisma.analysis.create({
  data: {
    projectId: projectId,
    renewableType: "solar",
    renewableCapacityKw: 5.5,
    annualProductionKwh: 9636,
    capacityFactor: 0.20,
    ...otherFields
  }
})

STEP 6: DISPLAY TO USER
────────────────────────────────────────────────────────────
UI Dashboard:
  "Your solar system (5.5 kW) is estimated to produce
   9,636 kWh annually, offsetting approximately 64% of
   your current usage."

PDF Report:
  • Renewable Energy: Solar Panel System
  • Nameplate Capacity: 5.5 kW
  • Capacity Factor: 20%
  • Estimated Annual Production: 9,636 kWh
  • Grid Usage Offset: 64%
```

## Error Handling Flow

```
┌────────────────────────────────────────────────────────────┐
│                     Error Scenarios                        │
└────────────────────────────┬───────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
┌──────────────────┐ ┌──────────────┐  ┌─────────────────┐
│ No renewable     │ │ Invalid type │  │ Invalid capacity│
│ data found       │ │ extracted    │  │ value           │
└────────┬─────────┘ └──────┬───────┘  └────────┬────────┘
         │                  │                    │
         ▼                  ▼                    ▼
┌──────────────────┐ ┌──────────────┐  ┌─────────────────┐
│ renewableSource  │ │ validation   │  │ validation      │
│ = undefined      │ │ isValid=false│  │ isValid=false   │
│                  │ │ errors=[...] │  │ errors=[...]    │
│ Continue without │ │              │  │                 │
│ renewable data   │ │ Log error &  │  │ Log error &     │
│                  │ │ skip calc    │  │ skip calc       │
└──────────────────┘ └──────────────┘  └─────────────────┘
```

---

**Last Updated:** November 11, 2025
