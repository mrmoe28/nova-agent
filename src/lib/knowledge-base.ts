/**
 * Knowledge Base System
 *
 * Provides context and knowledge to the AI assistant from:
 * 1. App documentation (CLAUDE.md, workflow guides)
 * 2. Solar energy calculations and formulas
 * 3. NEC compliance requirements
 * 4. Equipment catalog data
 *
 * This allows the assistant to answer questions accurately about the NovaAgent app.
 */

import fs from "fs";
import path from "path";
import { createLogger } from "./logger";

const logger = createLogger("knowledge-base");

export interface KnowledgeSection {
  topic: string;
  content: string;
  keywords: string[];
}

export class KnowledgeBase {
  private sections: KnowledgeSection[] = [];
  private initialized = false;

  /**
   * Initialize the knowledge base by loading all documentation
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    logger.info("Initializing knowledge base");

    try {
      // Load app documentation
      await this.loadAppDocumentation();

      // Load solar calculation knowledge
      this.loadSolarKnowledge();

      // Load NEC compliance knowledge
      this.loadNECKnowledge();

      // Load workflow knowledge
      this.loadWorkflowKnowledge();

      this.initialized = true;
      logger.info(
        { sectionCount: this.sections.length },
        "Knowledge base initialized",
      );
    } catch (error) {
      logger.error({ error }, "Failed to initialize knowledge base");
      throw error;
    }
  }

  /**
   * Load app documentation from CLAUDE.md and other files
   */
  private async loadAppDocumentation(): Promise<void> {
    try {
      // Only load files in Node.js runtime (not during browser execution)
      if (typeof window === "undefined") {
        const claudeMdPath = path.join(process.cwd(), "CLAUDE.md");
        if (fs.existsSync(claudeMdPath)) {
          const content = fs.readFileSync(claudeMdPath, "utf-8");
          this.sections.push({
            topic: "App Documentation",
            content,
            keywords: [
              "novaagent",
              "solar",
              "battery",
              "wizard",
              "workflow",
              "project",
              "bill",
              "bom",
              "nec",
              "pdf",
              "scraping",
              "distributor",
              "equipment",
            ],
          });
          logger.info("Loaded CLAUDE.md documentation");
        }
      }
    } catch (error) {
      logger.warn({ error }, "Failed to load CLAUDE.md");
    }
  }

  /**
   * Load solar energy calculation knowledge
   */
  private loadSolarKnowledge(): void {
    const content = `
# Solar Energy Calculations

## System Sizing Fundamentals

### Solar Panel Sizing
To calculate the required solar array size:
1. **Daily Energy Need (kWh/day)**: Take monthly kWh usage and divide by 30
2. **Peak Sun Hours**: Average hours of optimal sunlight per day (varies by location)
   - Arizona: 5.5 hours
   - California: 5.0 hours
   - Florida: 5.0 hours
   - Seattle: 3.5 hours
   - Default: 4.0 hours
3. **Solar Array Size (kW)**: Daily kWh ÷ Peak Sun Hours × Sizing Factor
   - Sizing Factor typically 1.2 (120%) to account for losses
4. **Number of Panels**: Array Size (kW) ÷ Panel Wattage (typically 400W)

**Formula**:
\`\`\`
Solar kW = (Monthly kWh / 30 / Peak Sun Hours) × 1.2
Panel Count = Solar kW × 1000 / Panel Wattage
\`\`\`

### Battery Sizing
Battery capacity should be sized for backup needs:
1. **Critical Load (kW)**: Power needed during outage
2. **Backup Duration (hours)**: How long backup is needed
3. **Battery Capacity (kWh)**: Critical Load × Duration × Overhead
   - Overhead typically 1.25 (25%) for depth of discharge and efficiency
4. **Battery Cost**: Capacity × $800/kWh (average)

**Formula**:
\`\`\`
Battery kWh = Critical Load (kW) × Backup Hours × 1.25
\`\`\`

### Inverter Sizing
Inverter must handle peak loads:
1. **Peak Load (kW)**: Maximum simultaneous power draw
2. **Inverter Size (kW)**: Peak Load × 1.25 (25% oversizing for safety)
3. **Inverter Cost**: Inverter kW × $1200/kW (average)

**Formula**:
\`\`\`
Inverter kW = Peak Load × 1.25
\`\`\`

## Cost Estimation
- **Solar**: $2.50/watt installed (includes panels, mounting, wiring)
- **Battery**: $800/kWh (includes BMS, installation)
- **Inverter**: $1200/kW (includes installation)
- **Base Installation**: $5000 (permits, labor, design)

## Energy Efficiency Factors
- **System Losses**: 20% (inverter efficiency, wiring, shading, temperature)
- **Battery Round-trip Efficiency**: 90% (charge/discharge losses)
- **Panel Degradation**: 0.5-0.7% per year
`;

    this.sections.push({
      topic: "Solar Calculations",
      content,
      keywords: [
        "solar",
        "sizing",
        "calculation",
        "kwh",
        "kw",
        "panel",
        "battery",
        "inverter",
        "formula",
        "cost",
        "peak sun hours",
        "efficiency",
      ],
    });

    logger.info("Loaded solar calculation knowledge");
  }

  /**
   * Load NEC compliance knowledge
   */
  private loadNECKnowledge(): void {
    const content = `
# National Electrical Code (NEC) Compliance

## Key NEC Articles for Solar + Battery Systems

### NEC Article 690: Solar Photovoltaic (PV) Systems
**690.8 - Circuit Sizing and Current**
- PV circuit conductors must be sized for 125% of maximum circuit current
- Overcurrent devices must be rated for at least 125% of continuous current

**690.12 - Rapid Shutdown**
- PV systems must have rapid shutdown capability
- Controlled conductors must be reduced to 80V or less within 30 seconds
- Required for rooftop and building-integrated PV systems

**690.13 - Photovoltaic System Disconnecting Means**
- Must disconnect all current-carrying conductors
- Must be readily accessible
- Must indicate ON/OFF position clearly
- Required for both AC and DC sides

**690.15 - Disconnection of Photovoltaic Equipment**
- Means to disconnect equipment from all sources of power
- Must be grouped and identified

### NEC Article 705: Interconnected Electric Power Production Sources
**705.12 - Point of Connection**
- Interconnection point must be clearly marked
- Busbars must not be overloaded (120% rule or adjustments)
- Supply-side connections must meet specific requirements

**705.20 - Disconnecting Means**
- Each source of power must have a disconnect
- Must be grouped with other disconnects
- Permanent plaque required showing all power sources

### NEC Article 706: Energy Storage Systems (Batteries)
**706.10 - Directory**
- Directory required showing location of disconnects
- Must be permanently affixed at service equipment

**706.20 - Disconnecting Means**
- Must disconnect all power sources to battery
- Must be readily accessible
- Must indicate position (on/off)

**706.30 - Working Space**
- Adequate working clearance around equipment
- Minimum 3 feet clearance in front of equipment
- 30 inches width clearance

**706.31 - Ventilation**
- Adequate ventilation for heat dissipation
- Special requirements for lead-acid batteries (hydrogen gas)

## Common Compliance Checklist
✅ Rapid shutdown system installed (NEC 690.12)
✅ DC and AC disconnects installed and labeled (NEC 690.13)
✅ Warning labels affixed to all equipment (NEC 690.17)
✅ Grounding and bonding completed per NEC 690.41-690.47
✅ Battery disconnect installed (NEC 706.20)
✅ Working clearances maintained (NEC 706.30)
✅ Point of interconnection labeled (NEC 705.12)
✅ Conductor sizing verified (NEC 690.8)
✅ Overcurrent protection properly sized (NEC 690.9)
`;

    this.sections.push({
      topic: "NEC Compliance",
      content,
      keywords: [
        "nec",
        "code",
        "compliance",
        "article",
        "690",
        "705",
        "706",
        "rapid shutdown",
        "disconnect",
        "safety",
        "grounding",
        "wiring",
        "regulation",
      ],
    });

    logger.info("Loaded NEC compliance knowledge");
  }

  /**
   * Load NovaAgent workflow knowledge
   */
  private loadWorkflowKnowledge(): void {
    const content = `
# NovaAgent Workflow Guide

## Project Wizard Steps

### Step 1: Client Intake (/wizard/new)
**Purpose**: Create a new project and capture client information

**Required Information**:
- Client name
- Property address
- Contact phone number
- Contact email address

**What Happens**:
- New project created in database with status "intake"
- Project ID generated (used throughout wizard)
- User redirected to Step 2 (Bill Upload)

### Step 2: Bill Upload (/wizard/[projectId]/intake)
**Purpose**: Upload and process power bills for energy analysis

**Supported File Types**:
- PDF files (recommended - best OCR accuracy)
- Image files (PNG, JPG, JPEG)
- CSV files (direct data import)

**What Happens**:
1. File uploaded to /tmp/uploads/[projectId]/
2. OCR immediately extracts text from PDF/image
3. Data parsing extracts:
   - Monthly kWh usage
   - Peak demand (kW)
   - Total cost ($)
   - Account number
   - Billing period
   - Utility company name
4. Extracted data stored in database (Bill table)
5. User can upload multiple bills for 12-month analysis

**Common Issues**:
- Image OCR disabled in production (use PDF files)
- Files deleted after processing (serverless limitation)
- OCR confidence varies by bill format

### Step 3: Analysis
**Purpose**: Analyze uploaded bills and calculate usage patterns

**API Endpoint**: POST /api/analyze
**What Happens**:
1. Aggregates data from all uploaded bills
2. Calculates monthly average kWh usage
3. Identifies peak demand periods
4. Calculates average cost per kWh
5. Estimates annual energy cost
6. Creates Analysis record in database
7. Generates recommendations for system sizing

**Recommendations Include**:
- Estimated solar array size needed
- Battery capacity recommendations
- Potential annual savings
- Return on investment timeline

### Step 4: System Sizing (/wizard/[projectId]/sizing)
**Purpose**: Design solar + battery system specifications

**User Inputs**:
- Solar panel count (calculated from analysis)
- Solar panel wattage (default: 400W)
- Battery capacity (kWh)
- Battery type (lithium or lead-acid)
- Inverter size (kW)
- Inverter type (string or microinverter)
- Critical load (kW) - for backup sizing
- Backup duration (hours)

**API Endpoint**: POST /api/size
**What Happens**:
1. Validates sizing against usage analysis
2. Calculates total system capacity
3. Estimates installation cost
4. Creates System record in database
5. Provides warnings for over/undersizing

**Best Practices**:
- Size solar 120% of average usage (allows for future growth)
- Battery should cover critical loads for desired backup duration
- Inverter should be 125% of peak load

### Step 5: BOM Generation (/wizard/[projectId]/bom)
**Purpose**: Create detailed bill of materials with pricing

**API Endpoint**: POST /api/bom
**What Happens**:
1. Queries equipment catalog from distributor database
2. Matches equipment specifications to system design
3. Calculates quantities needed
4. Pulls current pricing from scraped data
5. Adds installation materials (mounting, wiring, electrical)
6. Creates BOMItem records for each line item
7. Calculates total project cost

**BOM Categories**:
- Solar panels
- Batteries
- Inverters
- Charge controllers (if needed)
- Mounting hardware
- Electrical components (breakers, disconnects, wire)
- Monitoring equipment

### Step 6: Review & PDF (/wizard/[projectId]/review)
**Purpose**: Review complete system design and generate PDF report

**API Endpoint**: POST /api/pdf
**What Happens**:
1. Aggregates all project data (client, bills, analysis, system, BOM)
2. Performs NEC compliance checks (Articles 690, 705, 706)
3. Generates installation plan with timeline
4. Creates professional PDF report with:
   - Cover page with NovaAgent branding
   - Client and property information
   - Usage analysis with charts
   - System specifications
   - Complete bill of materials with pricing
   - NEC compliance checklist
   - Installation timeline and steps
   - Labor hour estimates
5. Stores PDF (or returns for download)
6. Updates project status to "complete"

**PDF Contents**:
- Executive summary
- Usage analysis breakdown
- System design specifications
- Equipment list with images
- Cost breakdown
- NEC compliance documentation
- Installation plan
- Warranty information

## Data Flow Summary
\`\`\`
Client Info → Bills → Analysis → System Design → BOM → Final PDF
   ↓           ↓         ↓           ↓            ↓        ↓
Project    Bill DB   Analysis   System DB    BOMItem   Plan DB
\`\`\`

## Project Status Flow
\`\`\`
intake → analysis → sizing → bom → plan → review → complete
\`\`\`
`;

    this.sections.push({
      topic: "NovaAgent Workflow",
      content,
      keywords: [
        "workflow",
        "wizard",
        "step",
        "project",
        "client",
        "bill",
        "upload",
        "analysis",
        "sizing",
        "bom",
        "review",
        "pdf",
        "process",
        "how to",
      ],
    });

    logger.info("Loaded workflow knowledge");
  }

  /**
   * Search knowledge base for relevant context
   */
  search(query: string, maxResults = 3): KnowledgeSection[] {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/);

    // Score each section based on keyword and content matching
    const scored = this.sections.map((section) => {
      let score = 0;

      // Check keyword matches (higher weight)
      for (const keyword of section.keywords) {
        if (queryLower.includes(keyword)) {
          score += 10;
        }
      }

      // Check query word matches in content
      for (const word of queryWords) {
        if (word.length > 3 && section.content.toLowerCase().includes(word)) {
          score += 1;
        }
      }

      // Check topic match
      if (section.topic.toLowerCase().includes(queryLower)) {
        score += 15;
      }

      return { section, score };
    });

    // Sort by score and return top results
    return scored
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map((item) => item.section);
  }

  /**
   * Get all topics available in knowledge base
   */
  getTopics(): string[] {
    return this.sections.map((s) => s.topic);
  }

  /**
   * Get the complete context for the AI assistant system prompt
   */
  getSystemContext(): string {
    return `You are NovaAgent Assistant, an AI helper for the NovaAgent solar + battery system design application.

Your role is to help users:
1. Navigate the app workflow and understand features
2. Search for specific equipment in the catalog
3. Understand solar/battery calculations and sizing
4. Explain NEC compliance requirements
5. Answer questions about power bills, energy usage, and system design

You have access to:
- Complete app documentation and workflows
- Solar energy calculation formulas and best practices
- NEC compliance requirements (Articles 690, 705, 706)
- Equipment catalog from multiple distributors
- Current pricing and availability data

Be helpful, concise, and accurate. If you don't know something, say so clearly.
When explaining calculations, show the formulas and provide examples.
When discussing NEC requirements, cite the specific article numbers.`;
  }
}

/**
 * Singleton instance
 */
let knowledgeBaseInstance: KnowledgeBase | null = null;

export async function getKnowledgeBase(): Promise<KnowledgeBase> {
  if (!knowledgeBaseInstance) {
    knowledgeBaseInstance = new KnowledgeBase();
    await knowledgeBaseInstance.initialize();
  }
  return knowledgeBaseInstance;
}
