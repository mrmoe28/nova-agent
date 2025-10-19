export interface ProjectData {
  id: string;
  clientName: string;
  address?: string;
  phone?: string;
  email?: string;
  status: ProjectStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type ProjectStatus =
  | "INTAKE"
  | "ANALYSIS"
  | "SIZING"
  | "BOM"
  | "PLAN"
  | "REVIEW"
  | "COMPLETE";

export interface BillUpload {
  fileName: string;
  fileType: "pdf" | "image" | "csv";
  filePath: string;
}

export interface AnalysisResult {
  monthlyUsageKwh: number;
  peakDemandKw?: number;
  averageCostPerKwh: number;
  annualCostUsd: number;
  recommendations: string[];
}

export interface SystemDesign {
  solarPanelCount: number;
  solarPanelWattage: number;
  totalSolarKw: number;
  batteryKwh: number;
  batteryType: "lithium" | "lead-acid";
  inverterKw: number;
  inverterType: string;
  backupDurationHrs: number;
  criticalLoadKw: number;
  estimatedCostUsd: number;
}

export interface BOMItemData {
  category: "solar" | "battery" | "inverter" | "mounting" | "electrical";
  itemName: string;
  manufacturer?: string;
  modelNumber: string;
  quantity: number;
  unitPriceUsd: number;
  totalPriceUsd: number;
  sourceUrl?: string;
  notes?: string;
}

export interface NECCheck {
  code: string;
  description: string;
  status: "pass" | "warning" | "fail";
  notes?: string;
}

export interface InstallationPlan {
  necChecks: NECCheck[];
  warnings: string[];
  installSteps: string[];
  timeline?: string;
  laborHoursEst?: number;
  permitNotes?: string;
}
