import PDFDocument from "pdfkit";
import { formatCurrency, formatDate } from "@/lib/utils";
import https from "https";
import http from "http";

interface ProjectData {
  clientName: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  createdAt: Date;
}

interface AnalysisData {
  monthlyUsageKwh: number;
  peakDemandKw: number | null;
  averageCostPerKwh: number;
  annualCostUsd: number;
  recommendations: string;
}

interface SystemData {
  solarPanelCount: number;
  solarPanelWattage: number;
  totalSolarKw: number;
  batteryKwh: number;
  batteryType: string;
  inverterKw: number;
  inverterType: string;
  backupDurationHrs: number;
  criticalLoadKw: number;
  estimatedCostUsd: number;
}

interface BOMItemData {
  category: string;
  itemName: string;
  manufacturer: string | null;
  modelNumber: string;
  quantity: number;
  unitPriceUsd: number;
  totalPriceUsd: number;
  notes: string | null;
  imageUrl?: string | null;
  sourceUrl?: string | null;
}

interface PlanData {
  necChecks: string;
  warnings: string | null;
  installSteps: string;
  timeline: string | null;
  laborHoursEst: number | null;
  permitNotes: string | null;
}

// Helper function to fetch image from URL
async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  return new Promise((resolve) => {
    try {
      const protocol = url.startsWith("https") ? https : http;
      protocol
        .get(url, (response) => {
          if (response.statusCode !== 200) {
            resolve(null);
            return;
          }
          const chunks: Buffer[] = [];
          response.on("data", (chunk) => chunks.push(chunk));
          response.on("end", () => resolve(Buffer.concat(chunks)));
        })
        .on("error", () => resolve(null));
    } catch {
      resolve(null);
    }
  });
}

export function generateNovaAgentPDF(
  project: ProjectData,
  analysis: AnalysisData | null,
  system: SystemData | null,
  bomItems: BOMItemData[],
  plan: PlanData | null,
): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: "LETTER" });
      const buffers: Buffer[] = [];

      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });

      // Brand colors
      const brandNavy = "#0A0F1C";
      const brandCyan = "#22D3EE";
      const textDark = "#1F2937";
      const textLight = "#6B7280";
      const backgroundGray = "#F9FAFB";

      // ========== COVER PAGE ==========
      // Full page background
      doc.fillColor(brandNavy).rect(0, 0, doc.page.width, doc.page.height).fill();

      // Diagonal accent stripe
      doc
        .fillColor(brandCyan)
        .opacity(0.1)
        .moveTo(0, 200)
        .lineTo(doc.page.width, 0)
        .lineTo(doc.page.width, 100)
        .lineTo(0, 300)
        .fill();
      doc.opacity(1);

      // Title
      doc
        .fillColor("#FFFFFF")
        .fontSize(48)
        .font("Helvetica-Bold")
        .text("NovaAgent", 70, 200, { align: "center" });

      doc
        .fontSize(20)
        .font("Helvetica")
        .fillColor(brandCyan)
        .text("⚡ SOLAR & BATTERY PROPOSAL ⚡", 70, 260, { align: "center" });

      // Client name
      doc
        .fontSize(24)
        .font("Helvetica-Bold")
        .fillColor("#FFFFFF")
        .text(project.clientName, 70, 350, { align: "center" });

      if (project.address) {
        doc
          .fontSize(12)
          .font("Helvetica")
          .fillColor(textLight)
          .text(project.address, 70, 385, { align: "center" });
      }

      // Date
      doc
        .fontSize(11)
        .fillColor(textLight)
        .text(`Prepared: ${formatDate(new Date())}`, 70, 650, {
          align: "center",
        });

      // Footer
      doc
        .fontSize(9)
        .fillColor(brandCyan)
        .text("AI-Powered Energy Planning", 70, 720, { align: "center" });

      // ========== EXECUTIVE SUMMARY PAGE ==========
      doc.addPage();

      // Header
      doc
        .fillColor(brandNavy)
        .fontSize(28)
        .font("Helvetica-Bold")
        .text("Executive Summary", 50, 50);

      let yPos = 100;

      // Client contact info box
      doc
        .fillColor(backgroundGray)
        .rect(50, yPos, 500, 80)
        .fill();

      doc.fillColor(textDark).fontSize(10).font("Helvetica");
      doc.text(`Client: ${project.clientName}`, 70, yPos + 15);
      if (project.phone) doc.text(`Phone: ${project.phone}`, 70, yPos + 30);
      if (project.email) doc.text(`Email: ${project.email}`, 70, yPos + 45);
      if (project.address) doc.text(`Address: ${project.address}`, 70, yPos + 60);

      yPos += 110;

      // ========== SIDE-BY-SIDE COMPARISON ==========
      if (analysis && system) {
        doc
          .fillColor(brandCyan)
          .fontSize(20)
          .font("Helvetica-Bold")
          .text("Energy Usage & Savings Comparison", 50, yPos);
        yPos += 40;

        const boxWidth = 230;
        const boxHeight = 280;
        const leftX = 50;
        const rightX = 310;

        // LEFT BOX - CURRENT USAGE
        doc.fillColor("#FEE2E2").rect(leftX, yPos, boxWidth, boxHeight).fill();
        doc
          .fillColor("#991B1B")
          .fontSize(16)
          .font("Helvetica-Bold")
          .text("Current Usage", leftX + 20, yPos + 20, { width: boxWidth - 40 });

        doc.fontSize(10).font("Helvetica").fillColor(textDark);
        let leftY = yPos + 60;

        doc
          .font("Helvetica-Bold")
          .text("Monthly Usage:", leftX + 20, leftY);
        doc
          .font("Helvetica")
          .text(
            `${Math.round(analysis.monthlyUsageKwh)} kWh`,
            leftX + 20,
            leftY + 15,
          );
        leftY += 45;

        doc.font("Helvetica-Bold").text("Annual Cost:", leftX + 20, leftY);
        doc
          .font("Helvetica")
          .text(formatCurrency(analysis.annualCostUsd), leftX + 20, leftY + 15);
        leftY += 45;

        doc
          .font("Helvetica-Bold")
          .text("Avg Cost per kWh:", leftX + 20, leftY);
        doc
          .font("Helvetica")
          .text(
            formatCurrency(analysis.averageCostPerKwh),
            leftX + 20,
            leftY + 15,
          );
        leftY += 45;

        doc
          .font("Helvetica-Bold")
          .text("Solar Coverage:", leftX + 20, leftY);
        doc.font("Helvetica").text("0%", leftX + 20, leftY + 15);

        // RIGHT BOX - WITH SOLAR
        doc.fillColor("#D1FAE5").rect(rightX, yPos, boxWidth, boxHeight).fill();
        doc
          .fillColor("#065F46")
          .fontSize(16)
          .font("Helvetica-Bold")
          .text("With Solar & Battery", rightX + 20, yPos + 20, {
            width: boxWidth - 40,
          });

        doc.fontSize(10).font("Helvetica").fillColor(textDark);
        let rightY = yPos + 60;

        const solarProduction = system.totalSolarKw * 4 * 30; // Rough estimate
        const solarCoverage = Math.min(
          (solarProduction / analysis.monthlyUsageKwh) * 100,
          100,
        );
        const estimatedSavings = (analysis.annualCostUsd * solarCoverage) / 100;

        doc
          .font("Helvetica-Bold")
          .text("Solar Production:", rightX + 20, rightY);
        doc
          .font("Helvetica")
          .text(`${Math.round(solarProduction)} kWh/mo`, rightX + 20, rightY + 15);
        rightY += 45;

        doc
          .font("Helvetica-Bold")
          .text("Est. Annual Savings:", rightX + 20, rightY);
        doc
          .font("Helvetica")
          .text(formatCurrency(estimatedSavings), rightX + 20, rightY + 15);
        rightY += 45;

        doc
          .font("Helvetica-Bold")
          .text("New Annual Cost:", rightX + 20, rightY);
        doc
          .font("Helvetica")
          .text(
            formatCurrency(analysis.annualCostUsd - estimatedSavings),
            rightX + 20,
            rightY + 15,
          );
        rightY += 45;

        doc
          .font("Helvetica-Bold")
          .text("Solar Coverage:", rightX + 20, rightY);
        doc
          .font("Helvetica")
          .text(`${solarCoverage.toFixed(0)}%`, rightX + 20, rightY + 15);

        yPos += boxHeight + 30;

        // System Investment
        doc
          .fillColor(brandNavy)
          .fontSize(14)
          .font("Helvetica-Bold")
          .text("System Investment", 50, yPos);
        yPos += 25;

        doc
          .fillColor(textDark)
          .fontSize(11)
          .font("Helvetica")
          .text(
            `Total System Cost: ${formatCurrency(system.estimatedCostUsd)}`,
            70,
            yPos,
          );
        yPos += 18;

        const paybackYears = system.estimatedCostUsd / estimatedSavings;
        doc.text(
          `Estimated Payback: ${paybackYears.toFixed(1)} years`,
          70,
          yPos,
        );
        yPos += 18;

        const year25Savings = estimatedSavings * 25;
        doc.text(
          `25-Year Savings: ${formatCurrency(year25Savings)}`,
          70,
          yPos,
        );
      }

      // ========== EQUIPMENT PAGES ==========
      // Find main equipment items
      const solarPanels = bomItems.filter((item) =>
        item.category.toLowerCase().includes("solar"),
      );
      const batteries = bomItems.filter((item) =>
        item.category.toLowerCase().includes("battery"),
      );
      const inverters = bomItems.filter((item) =>
        item.category.toLowerCase().includes("inverter"),
      );

      // Solar Panels Page
      if (solarPanels.length > 0 && system) {
        doc.addPage();
        const panel = solarPanels[0];

        doc
          .fillColor(brandNavy)
          .fontSize(28)
          .font("Helvetica-Bold")
          .text("Solar Panels", 50, 50);

        yPos = 110;

        // Try to fetch and display image
        if (panel.imageUrl) {
          const imageBuffer = await fetchImageBuffer(panel.imageUrl);
          if (imageBuffer) {
            try {
              doc.image(imageBuffer, 150, yPos, {
                width: 300,
                align: "center",
              });
              yPos += 230;
            } catch {
              // Image failed to load, skip
            }
          }
        }

        // Panel specifications
        doc
          .fillColor(brandCyan)
          .fontSize(18)
          .font("Helvetica-Bold")
          .text(panel.itemName, 50, yPos);
        yPos += 30;

        doc.fillColor(textDark).fontSize(11).font("Helvetica");

        if (panel.manufacturer) {
          doc
            .font("Helvetica-Bold")
            .text("Manufacturer: ", 70, yPos, { continued: true })
            .font("Helvetica")
            .text(panel.manufacturer);
          yPos += 20;
        }

        doc
          .font("Helvetica-Bold")
          .text("Model: ", 70, yPos, { continued: true })
          .font("Helvetica")
          .text(panel.modelNumber);
        yPos += 20;

        doc
          .font("Helvetica-Bold")
          .text("Quantity: ", 70, yPos, { continued: true })
          .font("Helvetica")
          .text(`${panel.quantity} panels`);
        yPos += 20;

        doc
          .font("Helvetica-Bold")
          .text("Power per Panel: ", 70, yPos, { continued: true })
          .font("Helvetica")
          .text(`${system.solarPanelWattage}W`);
        yPos += 20;

        doc
          .font("Helvetica-Bold")
          .text("Total Array Power: ", 70, yPos, { continued: true })
          .font("Helvetica")
          .text(`${system.totalSolarKw.toFixed(2)} kW`);
        yPos += 20;

        doc
          .font("Helvetica-Bold")
          .text("Unit Price: ", 70, yPos, { continued: true })
          .font("Helvetica")
          .text(formatCurrency(panel.unitPriceUsd));
        yPos += 20;

        doc
          .font("Helvetica-Bold")
          .text("Total Cost: ", 70, yPos, { continued: true })
          .font("Helvetica")
          .text(formatCurrency(panel.totalPriceUsd));

        if (panel.notes) {
          yPos += 30;
          doc
            .fillColor(textLight)
            .fontSize(9)
            .font("Helvetica")
            .text(panel.notes, 70, yPos, { width: 470 });
        }
      }

      // Battery Page
      if (batteries.length > 0 && system) {
        doc.addPage();
        const battery = batteries[0];

        doc
          .fillColor(brandNavy)
          .fontSize(28)
          .font("Helvetica-Bold")
          .text("Battery Storage", 50, 50);

        yPos = 110;

        // Try to fetch and display image
        if (battery.imageUrl) {
          const imageBuffer = await fetchImageBuffer(battery.imageUrl);
          if (imageBuffer) {
            try {
              doc.image(imageBuffer, 150, yPos, {
                width: 300,
                align: "center",
              });
              yPos += 230;
            } catch {
              // Image failed to load, skip
            }
          }
        }

        // Battery specifications
        doc
          .fillColor(brandCyan)
          .fontSize(18)
          .font("Helvetica-Bold")
          .text(battery.itemName, 50, yPos);
        yPos += 30;

        doc.fillColor(textDark).fontSize(11).font("Helvetica");

        if (battery.manufacturer) {
          doc
            .font("Helvetica-Bold")
            .text("Manufacturer: ", 70, yPos, { continued: true })
            .font("Helvetica")
            .text(battery.manufacturer);
          yPos += 20;
        }

        doc
          .font("Helvetica-Bold")
          .text("Model: ", 70, yPos, { continued: true })
          .font("Helvetica")
          .text(battery.modelNumber);
        yPos += 20;

        doc
          .font("Helvetica-Bold")
          .text("Quantity: ", 70, yPos, { continued: true })
          .font("Helvetica")
          .text(`${battery.quantity} unit(s)`);
        yPos += 20;

        doc
          .font("Helvetica-Bold")
          .text("Storage Capacity: ", 70, yPos, { continued: true })
          .font("Helvetica")
          .text(`${system.batteryKwh.toFixed(2)} kWh`);
        yPos += 20;

        doc
          .font("Helvetica-Bold")
          .text("Battery Type: ", 70, yPos, { continued: true })
          .font("Helvetica")
          .text(system.batteryType);
        yPos += 20;

        doc
          .font("Helvetica-Bold")
          .text("Backup Duration: ", 70, yPos, { continued: true })
          .font("Helvetica")
          .text(`${system.backupDurationHrs} hours`);
        yPos += 20;

        doc
          .font("Helvetica-Bold")
          .text("Unit Price: ", 70, yPos, { continued: true })
          .font("Helvetica")
          .text(formatCurrency(battery.unitPriceUsd));
        yPos += 20;

        doc
          .font("Helvetica-Bold")
          .text("Total Cost: ", 70, yPos, { continued: true })
          .font("Helvetica")
          .text(formatCurrency(battery.totalPriceUsd));

        if (battery.notes) {
          yPos += 30;
          doc
            .fillColor(textLight)
            .fontSize(9)
            .font("Helvetica")
            .text(battery.notes, 70, yPos, { width: 470 });
        }
      }

      // Inverter Page
      if (inverters.length > 0 && system) {
        doc.addPage();
        const inverter = inverters[0];

        doc
          .fillColor(brandNavy)
          .fontSize(28)
          .font("Helvetica-Bold")
          .text("Inverter", 50, 50);

        yPos = 110;

        // Try to fetch and display image
        if (inverter.imageUrl) {
          const imageBuffer = await fetchImageBuffer(inverter.imageUrl);
          if (imageBuffer) {
            try {
              doc.image(imageBuffer, 150, yPos, {
                width: 300,
                align: "center",
              });
              yPos += 230;
            } catch {
              // Image failed to load, skip
            }
          }
        }

        // Inverter specifications
        doc
          .fillColor(brandCyan)
          .fontSize(18)
          .font("Helvetica-Bold")
          .text(inverter.itemName, 50, yPos);
        yPos += 30;

        doc.fillColor(textDark).fontSize(11).font("Helvetica");

        if (inverter.manufacturer) {
          doc
            .font("Helvetica-Bold")
            .text("Manufacturer: ", 70, yPos, { continued: true })
            .font("Helvetica")
            .text(inverter.manufacturer);
          yPos += 20;
        }

        doc
          .font("Helvetica-Bold")
          .text("Model: ", 70, yPos, { continued: true })
          .font("Helvetica")
          .text(inverter.modelNumber);
        yPos += 20;

        doc
          .font("Helvetica-Bold")
          .text("Quantity: ", 70, yPos, { continued: true })
          .font("Helvetica")
          .text(`${inverter.quantity} unit(s)`);
        yPos += 20;

        doc
          .font("Helvetica-Bold")
          .text("Power Rating: ", 70, yPos, { continued: true })
          .font("Helvetica")
          .text(`${system.inverterKw.toFixed(2)} kW`);
        yPos += 20;

        doc
          .font("Helvetica-Bold")
          .text("Type: ", 70, yPos, { continued: true })
          .font("Helvetica")
          .text(system.inverterType);
        yPos += 20;

        doc
          .font("Helvetica-Bold")
          .text("Critical Load Coverage: ", 70, yPos, { continued: true })
          .font("Helvetica")
          .text(`${system.criticalLoadKw.toFixed(2)} kW`);
        yPos += 20;

        doc
          .font("Helvetica-Bold")
          .text("Unit Price: ", 70, yPos, { continued: true })
          .font("Helvetica")
          .text(formatCurrency(inverter.unitPriceUsd));
        yPos += 20;

        doc
          .font("Helvetica-Bold")
          .text("Total Cost: ", 70, yPos, { continued: true })
          .font("Helvetica")
          .text(formatCurrency(inverter.totalPriceUsd));

        if (inverter.notes) {
          yPos += 30;
          doc
            .fillColor(textLight)
            .fontSize(9)
            .font("Helvetica")
            .text(inverter.notes, 70, yPos, { width: 470 });
        }
      }

      // ========== COMPLETE BOM PAGE ==========
      if (bomItems.length > 0) {
        doc.addPage();
        yPos = 50;

        doc
          .fillColor(brandNavy)
          .fontSize(24)
          .font("Helvetica-Bold")
          .text("Complete Bill of Materials", 50, yPos);
        yPos += 40;

        // Table header
        doc.fontSize(9).font("Helvetica-Bold").fillColor(textDark);
        doc.text("Item", 50, yPos);
        doc.text("Model", 200, yPos);
        doc.text("Qty", 350, yPos);
        doc.text("Unit Price", 400, yPos);
        doc.text("Total", 500, yPos);
        yPos += 15;

        doc.strokeColor("#E5E7EB").moveTo(50, yPos).lineTo(550, yPos).stroke();
        yPos += 10;

        let totalCost = 0;
        doc.fontSize(9).font("Helvetica");

        bomItems.forEach((item) => {
          if (yPos > 720) {
            doc.addPage();
            yPos = 50;
          }

          doc.fillColor(textDark).text(item.itemName, 50, yPos, { width: 140 });
          doc.text(item.modelNumber, 200, yPos, { width: 140 });
          doc.text(item.quantity.toString(), 350, yPos);
          doc.text(formatCurrency(item.unitPriceUsd), 400, yPos);
          doc.text(formatCurrency(item.totalPriceUsd), 500, yPos);

          totalCost += item.totalPriceUsd;
          yPos += 20;
        });

        yPos += 5;
        doc.strokeColor("#E5E7EB").moveTo(50, yPos).lineTo(550, yPos).stroke();
        yPos += 15;
        doc.font("Helvetica-Bold").text("Total Equipment Cost:", 400, yPos);
        doc.text(formatCurrency(totalCost), 500, yPos);
      }

      // ========== INSTALLATION PLAN & NEC COMPLIANCE ==========
      if (plan) {
        doc.addPage();
        yPos = 50;

        doc
          .fillColor(brandNavy)
          .fontSize(24)
          .font("Helvetica-Bold")
          .text("Installation Plan & NEC Compliance", 50, yPos);
        yPos += 40;

        // NEC Checks
        const necChecks = JSON.parse(plan.necChecks);
        doc
          .fillColor(textDark)
          .fontSize(14)
          .font("Helvetica-Bold")
          .text("NEC Compliance Checks", 50, yPos);
        yPos += 25;

        doc.fontSize(9).font("Helvetica");
        necChecks.forEach(
          (check: {
            code: string;
            description: string;
            status: string;
            notes?: string;
          }) => {
            if (yPos > 700) {
              doc.addPage();
              yPos = 50;
            }

            const statusColor =
              check.status === "pass"
                ? "#10B981"
                : check.status === "warning"
                  ? "#F59E0B"
                  : "#EF4444";

            doc
              .fillColor(textDark)
              .font("Helvetica-Bold")
              .text(`${check.code}:`, 50, yPos);
            doc
              .fillColor(statusColor)
              .text(check.status.toUpperCase(), 500, yPos);
            yPos += 12;
            doc
              .fillColor(textLight)
              .font("Helvetica")
              .text(check.description, 50, yPos);
            yPos += 12;
            if (check.notes) {
              doc.fontSize(8).text(check.notes, 50, yPos, { width: 500 });
              yPos += 10;
            }
            yPos += 10;
          },
        );

        // Warnings
        if (plan.warnings) {
          const warnings = JSON.parse(plan.warnings);
          if (warnings.length > 0) {
            yPos += 10;
            doc
              .fillColor("#F59E0B")
              .fontSize(12)
              .font("Helvetica-Bold")
              .text("⚠ Warnings", 50, yPos);
            yPos += 18;
            doc.fontSize(9).font("Helvetica");
            warnings.forEach((warning: string) => {
              doc
                .fillColor(textDark)
                .text(`• ${warning}`, 60, yPos, { width: 500 });
              yPos += 15;
            });
          }
        }

        // Installation Steps
        yPos += 20;
        if (yPos > 650) {
          doc.addPage();
          yPos = 50;
        }

        doc
          .fillColor(textDark)
          .fontSize(14)
          .font("Helvetica-Bold")
          .text("Installation Steps", 50, yPos);
        yPos += 25;

        const installSteps = JSON.parse(plan.installSteps);
        doc.fontSize(9).font("Helvetica");
        installSteps.forEach((step: string, index: number) => {
          if (yPos > 720) {
            doc.addPage();
            yPos = 50;
          }
          doc
            .fillColor(textDark)
            .text(`${index + 1}. ${step}`, 50, yPos, { width: 500 });
          yPos += 15;
        });

        // Timeline and Labor
        yPos += 20;
        if (plan.timeline) {
          doc
            .fillColor(textLight)
            .font("Helvetica-Bold")
            .text("Estimated Timeline: ", 50, yPos, { continued: true })
            .font("Helvetica")
            .text(plan.timeline);
          yPos += 15;
        }
        if (plan.laborHoursEst) {
          doc
            .font("Helvetica-Bold")
            .text("Labor Hours: ", 50, yPos, { continued: true })
            .font("Helvetica")
            .text(`${plan.laborHoursEst.toFixed(1)} hours`);
          yPos += 15;
        }
        if (plan.permitNotes) {
          doc
            .font("Helvetica-Bold")
            .text("Permit Notes: ", 50, yPos)
            .font("Helvetica")
            .text(plan.permitNotes, 50, yPos + 15, { width: 500 });
        }
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
