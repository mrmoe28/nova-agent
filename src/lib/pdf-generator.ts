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
        .text("SOLAR & BATTERY PROPOSAL", 70, 260, { align: "center" });

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
        const solarCoverage = analysis.monthlyUsageKwh > 0
          ? Math.min((solarProduction / analysis.monthlyUsageKwh) * 100, 100)
          : 0;
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

        const paybackYears = estimatedSavings > 0
          ? system.estimatedCostUsd / estimatedSavings
          : Infinity;
        doc.text(
          `Estimated Payback: ${paybackYears !== Infinity ? paybackYears.toFixed(1) + ' years' : 'N/A'}`,
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

      // ========== ENERGY SAVINGS GRAPH PAGE ==========
      if (analysis && system) {
        doc.addPage();

        doc
          .fillColor(brandNavy)
          .fontSize(28)
          .font("Helvetica-Bold")
          .text("Energy Savings Analysis", 50, 50);

        yPos = 120;

        const solarProduction = system.totalSolarKw * 4 * 30; // Monthly production estimate
        const solarCoverage = analysis.monthlyUsageKwh > 0
          ? Math.min((solarProduction / analysis.monthlyUsageKwh) * 100, 100)
          : 0;
        const annualSavings = (analysis.annualCostUsd * solarCoverage) / 100;
        const paybackYears = annualSavings > 0
          ? system.estimatedCostUsd / annualSavings
          : Infinity;

        // Draw savings visualization graph
        const graphX = 70;
        const graphY = yPos;
        const graphWidth = 460;
        const graphHeight = 280;

        // Background
        doc.fillColor("#F9FAFB").rect(graphX, graphY, graphWidth, graphHeight).fill();

        // Title
        doc
          .fillColor(brandCyan)
          .fontSize(16)
          .font("Helvetica-Bold")
          .text("25-Year Cumulative Savings", graphX + 20, graphY + 20);

        // Draw axes
        const chartX = graphX + 50;
        const chartY = graphY + 60;
        const chartWidth = graphWidth - 80;
        const chartHeight = graphHeight - 100;

        doc.strokeColor("#9CA3AF").lineWidth(1);
        // Y-axis
        doc.moveTo(chartX, chartY).lineTo(chartX, chartY + chartHeight).stroke();
        // X-axis
        doc.moveTo(chartX, chartY + chartHeight).lineTo(chartX + chartWidth, chartY + chartHeight).stroke();

        // Draw bars for savings over 25 years
        const years = [0, 5, 10, 15, 20, 25];
        const barWidth = chartWidth / (years.length + 1);
        const maxSavings = annualSavings * 25;

        years.forEach((year, index) => {
          const cumulativeSavings = year === 0 ? 0 : annualSavings * year;
          const barHeight = (cumulativeSavings / maxSavings) * chartHeight;
          const barX = chartX + (index + 1) * barWidth - barWidth / 2;
          const barY = chartY + chartHeight - barHeight;

          // Bar color (gradient from cyan to green)
          const barColor = year < paybackYears ? "#F59E0B" : "#10B981";
          doc.fillColor(barColor).rect(barX, barY, barWidth * 0.6, barHeight).fill();

          // Year label
          doc
            .fillColor(textDark)
            .fontSize(9)
            .font("Helvetica")
            .text(`${year}yr`, barX - 10, chartY + chartHeight + 10);

          // Value label
          if (year > 0) {
            doc
              .fillColor(textDark)
              .fontSize(8)
              .text(
                `${formatCurrency(cumulativeSavings)}`,
                barX - 20,
                barY - 15,
                { width: 60, align: "center" }
              );
          }
        });

        // Y-axis labels
        doc.fillColor(textLight).fontSize(8).font("Helvetica");
        doc.text("$0", chartX - 40, chartY + chartHeight - 5);
        doc.text(
          formatCurrency(maxSavings / 2),
          chartX - 40,
          chartY + chartHeight / 2 - 5
        );
        doc.text(formatCurrency(maxSavings), chartX - 40, chartY - 5);

        // Breakeven line
        if (paybackYears <= 25) {
          const breakEvenX = chartX + ((paybackYears / 25) * chartWidth);
          doc
            .strokeColor("#EF4444")
            .lineWidth(2)
            .dash(5, { space: 3 })
            .moveTo(breakEvenX, chartY)
            .lineTo(breakEvenX, chartY + chartHeight)
            .stroke()
            .undash();

          doc
            .fillColor("#EF4444")
            .fontSize(9)
            .font("Helvetica-Bold")
            .text(
              `Breakeven: ${paybackYears.toFixed(1)}yr`,
              breakEvenX - 35,
              chartY - 20
            );
        }

        yPos = graphY + graphHeight + 40;

        // Key metrics below graph
        const metricsBoxWidth = 145;
        const metricsX1 = 70;
        const metricsX2 = 230;
        const metricsX3 = 390;

        // Metric 1: Annual Savings
        doc.fillColor("#D1FAE5").rect(metricsX1, yPos, metricsBoxWidth, 70).fill();
        doc
          .fillColor("#065F46")
          .fontSize(11)
          .font("Helvetica-Bold")
          .text("Annual Savings", metricsX1 + 10, yPos + 15);
        doc
          .fontSize(20)
          .text(formatCurrency(annualSavings), metricsX1 + 10, yPos + 35);

        // Metric 2: Payback Period
        doc.fillColor("#FEF3C7").rect(metricsX2, yPos, metricsBoxWidth, 70).fill();
        doc
          .fillColor("#92400E")
          .fontSize(11)
          .font("Helvetica-Bold")
          .text("Payback Period", metricsX2 + 10, yPos + 15);
        doc
          .fontSize(20)
          .text(`${paybackYears.toFixed(1)} years`, metricsX2 + 10, yPos + 35);

        // Metric 3: 25-Year Savings
        doc.fillColor("#DBEAFE").rect(metricsX3, yPos, metricsBoxWidth, 70).fill();
        doc
          .fillColor("#1E40AF")
          .fontSize(11)
          .font("Helvetica-Bold")
          .text("25-Year Savings", metricsX3 + 10, yPos + 15);
        doc
          .fontSize(20)
          .text(formatCurrency(maxSavings), metricsX3 + 10, yPos + 35);
      }

      // ========== EQUIPMENT PAGES ==========
      // Find main equipment items (use exact match to avoid mixing categories)
      const solarPanels = bomItems.filter((item) =>
        item.category.toLowerCase() === "solar" || item.category.toLowerCase() === "solar_panel",
      );
      const batteries = bomItems.filter((item) =>
        item.category.toLowerCase() === "battery",
      );
      const inverters = bomItems.filter((item) =>
        item.category.toLowerCase() === "inverter",
      );
      const mountingEquipment = bomItems.filter((item) =>
        item.category.toLowerCase() === "mounting",
      );

      // Solar Panels Page
      if (solarPanels.length > 0 && system) {
        doc.addPage();
        const panel = solarPanels[0];

        // Page title at top
        doc
          .fillColor(brandNavy)
          .fontSize(28)
          .font("Helvetica-Bold")
          .text("Solar Panels", 50, 50);

        // Equipment name
        doc
          .fillColor(brandCyan)
          .fontSize(20)
          .font("Helvetica-Bold")
          .text(panel.itemName, 50, 95, { width: 500 });

        yPos = 135;

        // Try to fetch and display image (centered)
        let imageHeight = 0;
        if (panel.imageUrl) {
          const imageBuffer = await fetchImageBuffer(panel.imageUrl);
          if (imageBuffer) {
            try {
              const imgWidth = 280;
              const imgX = (doc.page.width - imgWidth) / 2; // Center image
              doc.image(imageBuffer, imgX, yPos, { width: imgWidth, fit: [imgWidth, 200] });
              imageHeight = 210; // Reserve space for image
              yPos += imageHeight;
            } catch {
              // Image failed to load, skip
            }
          }
        }

        // Add spacing after image
        yPos += 20;

        // Specifications in two-column layout
        const leftColX = 70;
        const rightColX = 320;
        const specFontSize = 11;

        doc.fillColor(textDark).fontSize(specFontSize).font("Helvetica");

        // Left column
        let leftY = yPos;

        if (panel.manufacturer) {
          doc.font("Helvetica-Bold").text("Manufacturer:", leftColX, leftY);
          doc.font("Helvetica").text(panel.manufacturer, leftColX, leftY + 15, { width: 200 });
          leftY += 40;
        }

        doc.font("Helvetica-Bold").text("Model Number:", leftColX, leftY);
        doc.font("Helvetica").text(panel.modelNumber, leftColX, leftY + 15, { width: 200 });
        leftY += 40;

        doc.font("Helvetica-Bold").text("Quantity:", leftColX, leftY);
        doc.font("Helvetica").text(`${panel.quantity} panels`, leftColX, leftY + 15);
        leftY += 40;

        doc.font("Helvetica-Bold").text("Power per Panel:", leftColX, leftY);
        doc.font("Helvetica").text(`${system.solarPanelWattage}W`, leftColX, leftY + 15);

        // Right column
        let rightY = yPos;

        doc.font("Helvetica-Bold").text("Total Array Power:", rightColX, rightY);
        doc.font("Helvetica").text(`${system.totalSolarKw.toFixed(2)} kW`, rightColX, rightY + 15);
        rightY += 40;

        doc.font("Helvetica-Bold").text("Unit Price:", rightColX, rightY);
        doc.font("Helvetica").text(formatCurrency(panel.unitPriceUsd), rightColX, rightY + 15);
        rightY += 40;

        doc.font("Helvetica-Bold").text("Total Cost:", rightColX, rightY);
        doc.fillColor(brandCyan).fontSize(16).font("Helvetica-Bold")
          .text(formatCurrency(panel.totalPriceUsd), rightColX, rightY + 15);

        // Notes at bottom (larger font)
        if (panel.notes) {
          yPos = Math.max(leftY, rightY) + 60;
          doc
            .fillColor(textLight)
            .fontSize(10)
            .font("Helvetica")
            .text(panel.notes, 70, yPos, { width: 470, align: "justify" });
        }
      }

      // Battery Page
      if (batteries.length > 0 && system) {
        doc.addPage();
        const battery = batteries[0];

        // Page title at top
        doc
          .fillColor(brandNavy)
          .fontSize(28)
          .font("Helvetica-Bold")
          .text("Battery Storage", 50, 50);

        // Equipment name
        doc
          .fillColor(brandCyan)
          .fontSize(20)
          .font("Helvetica-Bold")
          .text(battery.itemName, 50, 95, { width: 500 });

        yPos = 135;

        // Try to fetch and display image (centered)
        let imageHeight = 0;
        if (battery.imageUrl) {
          const imageBuffer = await fetchImageBuffer(battery.imageUrl);
          if (imageBuffer) {
            try {
              const imgWidth = 280;
              const imgX = (doc.page.width - imgWidth) / 2; // Center image
              doc.image(imageBuffer, imgX, yPos, { width: imgWidth, fit: [imgWidth, 200] });
              imageHeight = 210;
              yPos += imageHeight;
            } catch {
              // Image failed to load, skip
            }
          }
        }

        // Add spacing after image
        yPos += 20;

        // Specifications in two-column layout
        const leftColX = 70;
        const rightColX = 320;
        const specFontSize = 11;

        doc.fillColor(textDark).fontSize(specFontSize).font("Helvetica");

        // Left column
        let leftY = yPos;

        if (battery.manufacturer) {
          doc.font("Helvetica-Bold").text("Manufacturer:", leftColX, leftY);
          doc.font("Helvetica").text(battery.manufacturer, leftColX, leftY + 15, { width: 200 });
          leftY += 40;
        }

        doc.font("Helvetica-Bold").text("Model Number:", leftColX, leftY);
        doc.font("Helvetica").text(battery.modelNumber, leftColX, leftY + 15, { width: 200 });
        leftY += 40;

        doc.font("Helvetica-Bold").text("Quantity:", leftColX, leftY);
        doc.font("Helvetica").text(`${battery.quantity} unit(s)`, leftColX, leftY + 15);
        leftY += 40;

        doc.font("Helvetica-Bold").text("Battery Type:", leftColX, leftY);
        doc.font("Helvetica").text(system.batteryType, leftColX, leftY + 15);

        // Right column
        let rightY = yPos;

        doc.font("Helvetica-Bold").text("Storage Capacity:", rightColX, rightY);
        doc.font("Helvetica").text(`${system.batteryKwh.toFixed(2)} kWh`, rightColX, rightY + 15);
        rightY += 40;

        doc.font("Helvetica-Bold").text("Backup Duration:", rightColX, rightY);
        doc.font("Helvetica").text(`${system.backupDurationHrs} hours`, rightColX, rightY + 15);
        rightY += 40;

        doc.font("Helvetica-Bold").text("Unit Price:", rightColX, rightY);
        doc.font("Helvetica").text(formatCurrency(battery.unitPriceUsd), rightColX, rightY + 15);
        rightY += 40;

        doc.font("Helvetica-Bold").text("Total Cost:", rightColX, rightY);
        doc.fillColor(brandCyan).fontSize(16).font("Helvetica-Bold")
          .text(formatCurrency(battery.totalPriceUsd), rightColX, rightY + 15);

        // Notes at bottom (larger font)
        if (battery.notes) {
          yPos = Math.max(leftY, rightY) + 60;
          doc
            .fillColor(textLight)
            .fontSize(10)
            .font("Helvetica")
            .text(battery.notes, 70, yPos, { width: 470, align: "justify" });
        }
      }

      // Inverter Page
      if (inverters.length > 0 && system) {
        doc.addPage();
        const inverter = inverters[0];

        // Page title at top
        doc
          .fillColor(brandNavy)
          .fontSize(28)
          .font("Helvetica-Bold")
          .text("Inverter", 50, 50);

        // Equipment name
        doc
          .fillColor(brandCyan)
          .fontSize(20)
          .font("Helvetica-Bold")
          .text(inverter.itemName, 50, 95, { width: 500 });

        yPos = 135;

        // Try to fetch and display image (centered)
        let imageHeight = 0;
        if (inverter.imageUrl) {
          const imageBuffer = await fetchImageBuffer(inverter.imageUrl);
          if (imageBuffer) {
            try {
              const imgWidth = 280;
              const imgX = (doc.page.width - imgWidth) / 2; // Center image
              doc.image(imageBuffer, imgX, yPos, { width: imgWidth, fit: [imgWidth, 200] });
              imageHeight = 210;
              yPos += imageHeight;
            } catch {
              // Image failed to load, skip
            }
          }
        }

        // Add spacing after image
        yPos += 20;

        // Specifications in two-column layout
        const leftColX = 70;
        const rightColX = 320;
        const specFontSize = 11;

        doc.fillColor(textDark).fontSize(specFontSize).font("Helvetica");

        // Left column
        let leftY = yPos;

        if (inverter.manufacturer) {
          doc.font("Helvetica-Bold").text("Manufacturer:", leftColX, leftY);
          doc.font("Helvetica").text(inverter.manufacturer, leftColX, leftY + 15, { width: 200 });
          leftY += 40;
        }

        doc.font("Helvetica-Bold").text("Model Number:", leftColX, leftY);
        doc.font("Helvetica").text(inverter.modelNumber, leftColX, leftY + 15, { width: 200 });
        leftY += 40;

        doc.font("Helvetica-Bold").text("Quantity:", leftColX, leftY);
        doc.font("Helvetica").text(`${inverter.quantity} unit(s)`, leftColX, leftY + 15);
        leftY += 40;

        doc.font("Helvetica-Bold").text("Type:", leftColX, leftY);
        doc.font("Helvetica").text(system.inverterType, leftColX, leftY + 15);

        // Right column
        let rightY = yPos;

        doc.font("Helvetica-Bold").text("Power Rating:", rightColX, rightY);
        doc.font("Helvetica").text(`${system.inverterKw.toFixed(2)} kW`, rightColX, rightY + 15);
        rightY += 40;

        doc.font("Helvetica-Bold").text("Critical Load Coverage:", rightColX, rightY);
        doc.font("Helvetica").text(`${system.criticalLoadKw.toFixed(2)} kW`, rightColX, rightY + 15);
        rightY += 40;

        doc.font("Helvetica-Bold").text("Unit Price:", rightColX, rightY);
        doc.font("Helvetica").text(formatCurrency(inverter.unitPriceUsd), rightColX, rightY + 15);
        rightY += 40;

        doc.font("Helvetica-Bold").text("Total Cost:", rightColX, rightY);
        doc.fillColor(brandCyan).fontSize(16).font("Helvetica-Bold")
          .text(formatCurrency(inverter.totalPriceUsd), rightColX, rightY + 15);

        // Notes at bottom (larger font)
        if (inverter.notes) {
          yPos = Math.max(leftY, rightY) + 60;
          doc
            .fillColor(textLight)
            .fontSize(10)
            .font("Helvetica")
            .text(inverter.notes, 70, yPos, { width: 470, align: "justify" });
        }
      }

      // Mounting & Racking Page
      if (mountingEquipment.length > 0) {
        doc.addPage();
        const mounting = mountingEquipment[0];

        // Page title at top
        doc
          .fillColor(brandNavy)
          .fontSize(28)
          .font("Helvetica-Bold")
          .text("Mounting & Racking System", 50, 50);

        // Equipment name
        doc
          .fillColor(brandCyan)
          .fontSize(20)
          .font("Helvetica-Bold")
          .text(mounting.itemName, 50, 95, { width: 500 });

        yPos = 135;

        // Try to fetch and display image (centered)
        let imageHeight = 0;
        if (mounting.imageUrl) {
          const imageBuffer = await fetchImageBuffer(mounting.imageUrl);
          if (imageBuffer) {
            try {
              const imgWidth = 280;
              const imgX = (doc.page.width - imgWidth) / 2; // Center image
              doc.image(imageBuffer, imgX, yPos, { width: imgWidth, fit: [imgWidth, 200] });
              imageHeight = 210;
              yPos += imageHeight;
            } catch {
              // Image failed to load, skip
            }
          }
        }

        // Add spacing after image
        yPos += 20;

        // Specifications in two-column layout
        const leftColX = 70;
        const rightColX = 320;
        const specFontSize = 11;

        doc.fillColor(textDark).fontSize(specFontSize).font("Helvetica");

        // Left column
        let leftY = yPos;

        if (mounting.manufacturer) {
          doc.font("Helvetica-Bold").text("Manufacturer:", leftColX, leftY);
          doc.font("Helvetica").text(mounting.manufacturer, leftColX, leftY + 15, { width: 200 });
          leftY += 40;
        }

        doc.font("Helvetica-Bold").text("Model Number:", leftColX, leftY);
        doc.font("Helvetica").text(mounting.modelNumber, leftColX, leftY + 15, { width: 200 });
        leftY += 40;

        doc.font("Helvetica-Bold").text("Quantity:", leftColX, leftY);
        doc.font("Helvetica").text(`${mounting.quantity} unit(s)`, leftColX, leftY + 15);

        // Right column
        let rightY = yPos;

        doc.font("Helvetica-Bold").text("Unit Price:", rightColX, rightY);
        doc.font("Helvetica").text(formatCurrency(mounting.unitPriceUsd), rightColX, rightY + 15);
        rightY += 40;

        doc.font("Helvetica-Bold").text("Total Cost:", rightColX, rightY);
        doc.fillColor(brandCyan).fontSize(16).font("Helvetica-Bold")
          .text(formatCurrency(mounting.totalPriceUsd), rightColX, rightY + 15);

        // Notes at bottom (larger font)
        if (mounting.notes) {
          yPos = Math.max(leftY, rightY) + 60;
          doc
            .fillColor(textLight)
            .fontSize(10)
            .font("Helvetica")
            .text(mounting.notes, 70, yPos, { width: 470, align: "justify" });
        }
      }

      // ========== OTHER EQUIPMENT PAGES ==========
      // Generate individual pages for mounting, electrical, and other BOM items
      const mainCategories = ['solar', 'solar_panel', 'battery', 'inverter'];
      const otherEquipment = bomItems.filter((item) => 
        !mainCategories.includes(item.category.toLowerCase())
      );

      for (const equipment of otherEquipment) {
        doc.addPage();

        // Page title - Category name
        const categoryTitle = equipment.category.replace(/_/g, ' ').replace(/w/g, (l: string) => l.toUpperCase());
        doc
          .fillColor(brandNavy)
          .fontSize(28)
          .font("Helvetica-Bold")
          .text(categoryTitle, 50, 50);

        // Equipment name
        doc
          .fillColor(brandCyan)
          .fontSize(20)
          .font("Helvetica-Bold")
          .text(equipment.itemName, 50, 95, { width: 500 });

        yPos = 135;

        // Try to fetch and display image (centered)
        if (equipment.imageUrl) {
          const imageBuffer = await fetchImageBuffer(equipment.imageUrl);
          if (imageBuffer) {
            try {
              const imgWidth = 280;
              const imgX = (doc.page.width - imgWidth) / 2;
              doc.image(imageBuffer, imgX, yPos, { width: imgWidth, fit: [imgWidth, 200] });
              yPos += 220;
            } catch {
              // Image failed to load, skip
            }
          }
        }

        // Add spacing
        yPos += 20;

        // Specifications in two-column layout
        const leftColX = 70;
        const rightColX = 320;
        const specFontSize = 11;

        doc.fillColor(textDark).fontSize(specFontSize).font("Helvetica");

        // Left column
        let leftY = yPos;

        if (equipment.manufacturer) {
          doc.font("Helvetica-Bold").text("Manufacturer:", leftColX, leftY);
          doc.font("Helvetica").text(equipment.manufacturer, leftColX, leftY + 15, { width: 200 });
          leftY += 40;
        }

        doc.font("Helvetica-Bold").text("Model Number:", leftColX, leftY);
        doc.font("Helvetica").text(equipment.modelNumber, leftColX, leftY + 15, { width: 200 });
        leftY += 40;

        doc.font("Helvetica-Bold").text("Quantity:", leftColX, leftY);
        doc.font("Helvetica").text(equipment.quantity + " unit(s)", leftColX, leftY + 15);
        leftY += 40;

        doc.font("Helvetica-Bold").text("Category:", leftColX, leftY);
        doc.font("Helvetica").text(equipment.category.replace(/_/g, ' '), leftColX, leftY + 15);

        // Right column
        let rightY = yPos;

        doc.font("Helvetica-Bold").text("Unit Price:", rightColX, rightY);
        doc.font("Helvetica").text(formatCurrency(equipment.unitPriceUsd), rightColX, rightY + 15);
        rightY += 40;

        doc.font("Helvetica-Bold").text("Total Cost:", rightColX, rightY);
        doc.fillColor(brandCyan).fontSize(16).font("Helvetica-Bold")
          .text(formatCurrency(equipment.totalPriceUsd), rightColX, rightY + 15);

        // Notes/Specifications at bottom
        if (equipment.notes) {
          yPos = Math.max(leftY, rightY) + 60;
          doc
            .fillColor(textLight)
            .fontSize(10)
            .font("Helvetica")
            .text(equipment.notes, 70, yPos, { width: 470, align: "justify" });
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

      // ========== NEC COMPLIANCE PAGE ==========
      if (plan) {
        doc.addPage();
        yPos = 50;

        doc
          .fillColor(brandNavy)
          .fontSize(28)
          .font("Helvetica-Bold")
          .text("NEC Compliance Checks", 50, yPos);
        yPos += 50;

        // NEC Checks
        let necChecks = [];
        try {
          necChecks = JSON.parse(plan.necChecks);
        } catch (error) {
          console.error('Invalid JSON in plan.necChecks:', error);
          necChecks = [];
        }
        doc.fontSize(10).font("Helvetica");
        necChecks.forEach(
          (check: {
            code: string;
            description: string;
            status: string;
            notes?: string;
          }) => {
            if (yPos > 680) {
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
              .fontSize(11)
              .font("Helvetica-Bold")
              .text(`${check.code}:`, 50, yPos);
            doc
              .fillColor(statusColor)
              .fontSize(10)
              .text(check.status.toUpperCase(), 480, yPos);
            yPos += 15;
            doc
              .fillColor(textDark)
              .fontSize(10)
              .font("Helvetica")
              .text(check.description, 50, yPos, { width: 500 });
            yPos += 15;
            if (check.notes) {
              doc
                .fillColor(textLight)
                .fontSize(9)
                .text(check.notes, 50, yPos, { width: 500 });
              yPos += 12;
            }
            yPos += 15;
          },
        );

        // Warnings Section
        if (plan.warnings) {
          let warnings = [];
          try {
            warnings = JSON.parse(plan.warnings);
          } catch (error) {
            console.error('Invalid JSON in plan.warnings:', error);
            warnings = [];
          }
          if (warnings.length > 0) {
            if (yPos > 600) {
              doc.addPage();
              yPos = 50;
            }
            yPos += 20;
            
            // Warning header with background
            doc.fillColor("#FEF3C7").rect(50, yPos - 5, 500, 35).fill();
            doc
              .fillColor("#92400E")
              .fontSize(16)
              .font("Helvetica-Bold")
              .text("⚠ Warnings", 60, yPos + 5);
            yPos += 45;
            
            doc.fontSize(10).font("Helvetica");
            warnings.forEach((warning: string) => {
              if (yPos > 700) {
                doc.addPage();
                yPos = 50;
              }
              doc
                .fillColor(textDark)
                .text(`• ${warning}`, 60, yPos, { width: 480 });
              yPos += 18;
            });
          }
        }
      }

      // ========== INSTALLATION TIMELINE PAGE ==========
      if (plan) {
        doc.addPage();
        yPos = 50;

        doc
          .fillColor(brandNavy)
          .fontSize(28)
          .font("Helvetica-Bold")
          .text("Installation Timeline & Process", 50, yPos);
        yPos += 50;

        // Timeline Overview Section
        doc
          .fillColor(brandCyan)
          .fontSize(18)
          .font("Helvetica-Bold")
          .text("Project Timeline Overview", 50, yPos);
        yPos += 30;

        // Timeline phases with visual timeline
        const phases = [
          { name: "Permitting & Approvals", duration: "2-4 weeks", icon: "📋" },
          { name: "Equipment Procurement", duration: "1-2 weeks", icon: "📦" },
          { name: "Installation", duration: plan.timeline || "1-2 weeks", icon: "🔧" },
          { name: "Inspection & Testing", duration: "3-5 days", icon: "✓" },
          { name: "Utility Interconnection", duration: "1-3 weeks", icon: "⚡" },
        ];

        phases.forEach((phase, index) => {
          if (yPos > 680) {
            doc.addPage();
            yPos = 50;
          }

          // Phase box
          doc.fillColor("#F0F9FF").rect(50, yPos, 500, 45).fill();
          
          doc
            .fillColor(brandNavy)
            .fontSize(12)
            .font("Helvetica-Bold")
            .text(`${phase.icon} Phase ${index + 1}: ${phase.name}`, 65, yPos + 10);
          
          doc
            .fillColor(brandCyan)
            .fontSize(11)
            .font("Helvetica")
            .text(phase.duration, 450, yPos + 10);
          
          yPos += 55;
        });

        yPos += 10;

        // Permitting Process
        doc
          .fillColor(brandCyan)
          .fontSize(18)
          .font("Helvetica-Bold")
          .text("Permitting Process", 50, yPos);
        yPos += 30;

        const permitSteps = [
          "Submit building permit application to local AHJ",
          "Provide system design drawings and equipment specifications",
          "Address any plan review comments or corrections",
          "Obtain approved building permit",
          "Schedule pre-installation inspection (if required)",
        ];

        doc.fillColor(textDark).fontSize(10).font("Helvetica");
        permitSteps.forEach((step, index) => {
          doc.text(`${index + 1}. ${step}`, 70, yPos, { width: 470 });
          yPos += 18;
        });

        if (plan.permitNotes) {
          yPos += 10;
          doc.fillColor("#FEF3C7").rect(50, yPos, 500, 60).fill();
          doc
            .fillColor("#92400E")
            .fontSize(10)
            .font("Helvetica-Bold")
            .text("📋 Permit Notes:", 65, yPos + 10);
          doc
            .font("Helvetica")
            .text(plan.permitNotes, 65, yPos + 25, { width: 470 });
          yPos += 70;
        }

        // Installation Steps
        if (yPos > 600) {
          doc.addPage();
          yPos = 50;
        } else {
          yPos += 20;
        }

        doc
          .fillColor(brandCyan)
          .fontSize(18)
          .font("Helvetica-Bold")
          .text("Installation Steps", 50, yPos);
        yPos += 30;

        let installSteps = [];
        try {
          installSteps = JSON.parse(plan.installSteps);
        } catch (error) {
          console.error('Invalid JSON in plan.installSteps:', error);
          installSteps = [];
        }
        doc.fontSize(10).font("Helvetica").fillColor(textDark);
        installSteps.forEach((step: any, index: number) => {
          if (yPos > 700) {
            doc.addPage();
            yPos = 50;
          }
          // Handle both string format and object format with title property
          const stepText = typeof step === "string" ? step : (step.title || step.name || String(step));
          doc.text(`${index + 1}. ${stepText}`, 70, yPos, { width: 470 });
          yPos += 18;
        });

        // Labor estimate
        if (plan.laborHoursEst) {
          yPos += 15;
          doc
            .fillColor(textLight)
            .font("Helvetica-Bold")
            .text("Estimated Labor: ", 70, yPos, { continued: true })
            .font("Helvetica")
            .text(`${plan.laborHoursEst.toFixed(1)} hours`);
          yPos += 25;
        }

        // Interconnection Process
        if (yPos > 580) {
          doc.addPage();
          yPos = 50;
        } else {
          yPos += 20;
        }

        doc
          .fillColor(brandCyan)
          .fontSize(18)
          .font("Helvetica-Bold")
          .text("Utility Interconnection Process", 50, yPos);
        yPos += 30;

        const interconnectionSteps = [
          "Submit interconnection application to utility company",
          "Provide system specifications and signed contract",
          "Utility reviews application and grid impact",
          "Receive interconnection agreement and approval",
          "Complete installation and pass final inspection",
          "Utility installs bi-directional meter (if required)",
          "Receive Permission to Operate (PTO)",
          "System commissioning and activation",
        ];

        doc.fillColor(textDark).fontSize(10).font("Helvetica");
        interconnectionSteps.forEach((step, index) => {
          if (yPos > 700) {
            doc.addPage();
            yPos = 50;
          }
          doc.text(`${index + 1}. ${step}`, 70, yPos, { width: 470 });
          yPos += 18;
        });

        // Total timeline summary
        yPos += 20;
        if (yPos > 680) {
          doc.addPage();
          yPos = 50;
        }

        doc.fillColor("#DBEAFE").rect(50, yPos, 500, 60).fill();
        doc
          .fillColor("#1E40AF")
          .fontSize(13)
          .font("Helvetica-Bold")
          .text("Total Project Duration: 6-12 weeks", 65, yPos + 10);
        doc
          .fontSize(10)
          .font("Helvetica")
          .fillColor("#1E3A8A")
          .text(
            "Timeline may vary based on permitting authority, utility responsiveness, and equipment availability.",
            65,
            yPos + 30,
            { width: 470 }
          );
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
