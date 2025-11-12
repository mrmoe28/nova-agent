import PDFDocument from "pdfkit";
import { formatCurrency, formatDate } from "@/lib/utils";

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
}

interface PlanData {
  necChecks: string;
  warnings: string | null;
  installSteps: string;
  timeline: string | null;
  laborHoursEst: number | null;
  permitNotes: string | null;
}

export function generateNovaAgentPDF(
  project: ProjectData,
  analysis: AnalysisData | null,
  system: SystemData | null,
  bomItems: BOMItemData[],
  plan: PlanData | null,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
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

      // Header with branding
      doc.fillColor(brandNavy).rect(0, 0, doc.page.width, 100).fill();

      doc
        .fillColor("#FFFFFF")
        .fontSize(28)
        .font("Helvetica-Bold")
        .text("NovaAgent ⚡", 50, 30);

      doc
        .fontSize(11)
        .font("Helvetica")
        .fillColor(brandCyan)
        .text("AI Energy Planner for Solar & Battery Systems", 50, 65);

      // Project info box
      doc
        .fillColor(textDark)
        .fontSize(20)
        .font("Helvetica-Bold")
        .text("Energy System Plan", 50, 130);

      doc.fontSize(10).font("Helvetica");
      doc
        .fillColor(textLight)
        .text(`Generated: ${formatDate(new Date())}`, 50, 155);

      // Client Information
      let yPos = 190;
      doc
        .fillColor(textDark)
        .fontSize(14)
        .font("Helvetica-Bold")
        .text("Client Information", 50, yPos);
      yPos += 25;

      doc.fontSize(10).font("Helvetica");
      doc.fillColor(textDark).text(`Name: ${project.clientName}`, 50, yPos);
      yPos += 15;
      if (project.address) {
        doc.text(`Address: ${project.address}`, 50, yPos);
        yPos += 15;
      }
      if (project.phone) {
        doc.text(`Phone: ${project.phone}`, 50, yPos);
        yPos += 15;
      }
      if (project.email) {
        doc.text(`Email: ${project.email}`, 50, yPos);
        yPos += 15;
      }

      // Usage Analysis
      if (analysis) {
        yPos += 20;
        doc
          .fillColor(brandCyan)
          .fontSize(14)
          .font("Helvetica-Bold")
          .text("Usage Analysis", 50, yPos);
        yPos += 25;

        doc.fontSize(10).font("Helvetica").fillColor(textDark);
        doc.text(
          `Monthly Average Usage: ${Math.round(analysis.monthlyUsageKwh)} kWh`,
          50,
          yPos,
        );
        yPos += 15;
        if (analysis.peakDemandKw) {
          doc.text(
            `Peak Demand: ${analysis.peakDemandKw.toFixed(1)} kW`,
            50,
            yPos,
          );
          yPos += 15;
        }
        doc.text(
          `Average Cost per kWh: ${formatCurrency(analysis.averageCostPerKwh)}`,
          50,
          yPos,
        );
        yPos += 15;
        doc.text(
          `Annual Energy Cost: ${formatCurrency(analysis.annualCostUsd)}`,
          50,
          yPos,
        );
        yPos += 20;

        const recommendations = JSON.parse(analysis.recommendations);
        if (recommendations.length > 0) {
          doc
            .fillColor(textLight)
            .fontSize(9)
            .text("Recommendations:", 50, yPos);
          yPos += 15;
          recommendations.forEach((rec: string) => {
            doc.text(`• ${rec}`, 60, yPos, { width: 500 });
            yPos += 12;
          });
        }
      }

      // System Design
      if (system) {
        yPos += 20;
        if (yPos > 650) {
          doc.addPage();
          yPos = 50;
        }

        doc
          .fillColor(brandCyan)
          .fontSize(14)
          .font("Helvetica-Bold")
          .text("System Design", 50, yPos);
        yPos += 25;

        doc.fontSize(10).font("Helvetica").fillColor(textDark);
        doc.text(
          `Solar Array: ${system.solarPanelCount} × ${system.solarPanelWattage}W panels = ${system.totalSolarKw.toFixed(2)} kW`,
          50,
          yPos,
        );
        yPos += 15;
        doc.text(
          `Battery Storage: ${system.batteryKwh.toFixed(2)} kWh (${system.batteryType})`,
          50,
          yPos,
        );
        yPos += 15;
        doc.text(
          `Inverter: ${system.inverterKw.toFixed(2)} kW ${system.inverterType}`,
          50,
          yPos,
        );
        yPos += 15;
        doc.text(
          `Backup Duration: ${system.backupDurationHrs} hours`,
          50,
          yPos,
        );
        yPos += 15;
        doc.text(
          `Critical Load Coverage: ${system.criticalLoadKw.toFixed(2)} kW`,
          50,
          yPos,
        );
        yPos += 20;
        doc
          .font("Helvetica-Bold")
          .text(
            `Estimated System Cost: ${formatCurrency(system.estimatedCostUsd)}`,
            50,
            yPos,
          );
        yPos += 10;
      }

      // Bill of Materials
      if (bomItems.length > 0) {
        yPos += 20;
        if (yPos > 600) {
          doc.addPage();
          yPos = 50;
        }

        doc
          .fillColor(brandCyan)
          .fontSize(14)
          .font("Helvetica-Bold")
          .text("Bill of Materials", 50, yPos);
        yPos += 25;

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

      // Installation Plan & NEC Compliance
      if (plan) {
        doc.addPage();
        yPos = 50;

        doc
          .fillColor(brandCyan)
          .fontSize(14)
          .font("Helvetica-Bold")
          .text("Installation Plan & NEC Compliance", 50, yPos);
        yPos += 25;

        // NEC Checks
        const necChecks = JSON.parse(plan.necChecks);
        doc
          .fillColor(textDark)
          .fontSize(12)
          .font("Helvetica-Bold")
          .text("NEC Compliance Checks", 50, yPos);
        yPos += 20;

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
              .fontSize(11)
              .font("Helvetica-Bold")
              .text("⚠ Warnings", 50, yPos);
            yPos += 15;
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
        yPos += 15;
        if (yPos > 650) {
          doc.addPage();
          yPos = 50;
        }

        doc
          .fillColor(textDark)
          .fontSize(12)
          .font("Helvetica-Bold")
          .text("Installation Steps", 50, yPos);
        yPos += 20;

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
        yPos += 15;
        if (plan.timeline) {
          doc
            .fillColor(textLight)
            .text(`Estimated Timeline: ${plan.timeline}`, 50, yPos);
          yPos += 12;
        }
        if (plan.laborHoursEst) {
          doc.text(
            `Labor Hours: ${plan.laborHoursEst.toFixed(1)} hours`,
            50,
            yPos,
          );
          yPos += 12;
        }
        if (plan.permitNotes) {
          doc.text(`Permit Notes: ${plan.permitNotes}`, 50, yPos, {
            width: 500,
          });
        }
      }

      // Note: Footer/page numbering removed due to bufferedPageRange() issues in serverless
      // Page numbers can be added back with on-page-create approach if needed

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
