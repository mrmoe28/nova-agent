/**
 * Retroactive Permitting Service
 * Handles permit completion for existing solar installations
 */

import { prisma } from '@/lib/prisma';

export interface ExistingSystemInfo {
  // System Details
  installationDate: Date;
  systemSizeKw: number;
  panelCount: number;
  panelManufacturer: string;
  panelModel: string;
  panelWattage: number;

  // Inverter Info
  inverterManufacturer: string;
  inverterModel: string;
  inverterSizeKw: number;
  inverterType: 'string' | 'micro' | 'hybrid' | 'central';

  // Battery (if applicable)
  hasBattery: boolean;
  batteryManufacturer?: string;
  batteryModel?: string;
  batterySizeKwh?: number;

  // Installation Details
  installerName?: string;
  installerLicense?: string;
  installationType: 'roof_mount' | 'ground_mount' | 'carport';
  roofType?: 'composition' | 'tile' | 'metal' | 'flat';

  // Location
  propertyAddress: string;
  assessorParcelNumber?: string; // APN for permit applications

  // Documentation
  hasSystemPhotos: boolean;
  hasElectricalDiagram: boolean;
  hasRoofPhotos: boolean;
  hasInverterDatasheet: boolean;
  hasPanelDatasheet: boolean;
}

export interface PermitCompletionPlan {
  projectId: string;
  status: 'assessment' | 'document_prep' | 'submission' | 'under_review' | 'approved';

  // Required Documents
  requiredDocuments: Array<{
    type: string;
    description: string;
    status: 'missing' | 'provided' | 'needs_revision' | 'approved';
    notes?: string;
  }>;

  // Inspection Requirements
  inspectionsRequired: Array<{
    type: 'electrical' | 'structural' | 'final' | 'utility';
    description: string;
    status: 'pending' | 'scheduled' | 'passed' | 'failed';
    scheduledDate?: Date;
    inspector?: string;
  }>;

  // Compliance Issues
  complianceIssues: Array<{
    code: string; // NEC section
    description: string;
    severity: 'critical' | 'major' | 'minor';
    remediation: string;
    status: 'open' | 'resolved';
  }>;

  // Cost Estimate
  costEstimate: {
    permitFees: number;
    inspectionFees: number;
    engineeringStamp?: number;
    possibleUpgrades?: number;
    total: number;
  };

  // Timeline
  estimatedTimeline: {
    documentPrep: number; // days
    permitReview: number; // days
    inspections: number; // days
    total: number; // days
  };
}

class RetroactivePermittingService {
  /**
   * Create a project for retroactive permitting
   */
  async createRetroactiveProject(
    clientInfo: {
      name: string;
      email: string;
      phone: string;
      address: string;
    },
    systemInfo: ExistingSystemInfo
  ): Promise<string> {
    // Create project
    const project = await prisma.project.create({
      data: {
        clientName: clientInfo.name,
        email: clientInfo.email,
        phone: clientInfo.phone,
        address: clientInfo.address,
        status: 'plan', // Skip straight to plan/permit phase
      },
    });

    // Create system record from existing installation
    await prisma.system.create({
      data: {
        projectId: project.id,
        solarPanelCount: systemInfo.panelCount,
        solarPanelWattage: systemInfo.panelWattage,
        totalSolarKw: systemInfo.systemSizeKw,
        batteryKwh: systemInfo.batterySizeKwh || 0,
        batteryType: systemInfo.hasBattery ? 'lithium' : 'none',
        inverterKw: systemInfo.inverterSizeKw,
        inverterType: `${systemInfo.inverterManufacturer} ${systemInfo.inverterModel}`,
        backupDurationHrs: 0,
        criticalLoadKw: 0,
        estimatedCostUsd: 0, // Not applicable for existing systems
      },
    });

    // Create BOM items from existing equipment
    const bomItems = [
      {
        category: 'solar',
        itemName: `${systemInfo.panelManufacturer} ${systemInfo.panelModel}`,
        manufacturer: systemInfo.panelManufacturer,
        modelNumber: systemInfo.panelModel,
        quantity: systemInfo.panelCount,
        unitPriceUsd: 0,
        totalPriceUsd: 0,
        notes: 'Existing installation',
      },
      {
        category: 'inverter',
        itemName: `${systemInfo.inverterManufacturer} ${systemInfo.inverterModel}`,
        manufacturer: systemInfo.inverterManufacturer,
        modelNumber: systemInfo.inverterModel,
        quantity: 1,
        unitPriceUsd: 0,
        totalPriceUsd: 0,
        notes: 'Existing installation',
      },
    ];

    if (systemInfo.hasBattery && systemInfo.batteryManufacturer) {
      bomItems.push({
        category: 'battery',
        itemName: `${systemInfo.batteryManufacturer} ${systemInfo.batteryModel}`,
        manufacturer: systemInfo.batteryManufacturer,
        modelNumber: systemInfo.batteryModel || 'Unknown',
        quantity: 1,
        unitPriceUsd: 0,
        totalPriceUsd: 0,
        notes: 'Existing installation',
      });
    }

    for (const item of bomItems) {
      await prisma.bOMItem.create({
        data: {
          projectId: project.id,
          ...item,
        },
      });
    }

    // Create plan with retroactive permitting focus
    await prisma.plan.create({
      data: {
        projectId: project.id,
        roofType: systemInfo.roofType,
        siteSurvey: JSON.stringify({
          type: 'existing_installation',
          installationDate: systemInfo.installationDate.toISOString(),
          installer: systemInfo.installerName,
          installerLicense: systemInfo.installerLicense,
        }),
        permitStatus: 'not_started',
        permitNotes: 'Retroactive permitting for existing installation',
        installSteps: JSON.stringify([
          {
            phase: 'documentation',
            description: 'Gather existing system documentation',
            status: 'in_progress',
          },
          {
            phase: 'inspection',
            description: 'Schedule required inspections',
            status: 'pending',
          },
          {
            phase: 'submission',
            description: 'Submit retroactive permit application',
            status: 'pending',
          },
        ]),
        necChecks: JSON.stringify([]),
        warnings: 'System installed without permits - retroactive compliance required',
      },
    });

    return project.id;
  }

  /**
   * Generate permit completion plan
   */
  async generatePermitCompletionPlan(
    projectId: string,
    systemInfo: ExistingSystemInfo
  ): Promise<PermitCompletionPlan> {
    // Assess required documents
    const requiredDocuments = [
      {
        type: 'site_plan',
        description: 'Site plan showing array location and dimensions',
        status: 'missing' as const,
      },
      {
        type: 'electrical_diagram',
        description: 'Single-line electrical diagram',
        status: systemInfo.hasElectricalDiagram ? 'provided' as const : 'missing' as const,
      },
      {
        type: 'equipment_specs',
        description: 'Panel and inverter specification sheets',
        status: (systemInfo.hasInverterDatasheet && systemInfo.hasPanelDatasheet)
          ? 'provided' as const
          : 'missing' as const,
      },
      {
        type: 'system_photos',
        description: 'Photos of installed system (panels, inverter, disconnects)',
        status: systemInfo.hasSystemPhotos ? 'provided' as const : 'missing' as const,
      },
      {
        type: 'roof_photos',
        description: 'Roof condition and penetration photos',
        status: systemInfo.hasRoofPhotos ? 'provided' as const : 'missing' as const,
      },
      {
        type: 'structural_letter',
        description: 'Structural engineering letter (if required)',
        status: 'missing' as const,
        notes: 'May be required based on roof type and system size',
      },
      {
        type: 'interconnection_agreement',
        description: 'Utility interconnection application',
        status: 'missing' as const,
      },
    ];

    // Determine required inspections
    const inspectionsRequired = [
      {
        type: 'electrical' as const,
        description: 'Electrical inspection of solar PV system',
        status: 'pending' as const,
      },
      {
        type: 'final' as const,
        description: 'Final inspection by AHJ',
        status: 'pending' as const,
      },
    ];

    if (systemInfo.installationType === 'roof_mount') {
      inspectionsRequired.unshift({
        type: 'structural' as const,
        description: 'Structural inspection of roof penetrations',
        status: 'pending' as const,
      });
    }

    if (systemInfo.hasBattery) {
      inspectionsRequired.push({
        type: 'electrical' as const,
        description: 'Battery system electrical inspection',
        status: 'pending' as const,
      });
    }

    // Check for compliance issues
    const complianceIssues = await this.assessCompliance(systemInfo);

    // Calculate costs
    const costEstimate = {
      permitFees: 500, // Typical retroactive permit fee
      inspectionFees: 150 * inspectionsRequired.length,
      engineeringStamp: systemInfo.systemSizeKw > 10 ? 800 : undefined,
      possibleUpgrades: complianceIssues.filter(i => i.severity === 'critical').length * 500,
      total: 0,
    };
    costEstimate.total =
      costEstimate.permitFees +
      costEstimate.inspectionFees +
      (costEstimate.engineeringStamp || 0) +
      (costEstimate.possibleUpgrades || 0);

    // Estimate timeline
    const estimatedTimeline = {
      documentPrep: 5, // days to gather documentation
      permitReview: 15, // days for AHJ review
      inspections: 10, // days to schedule and complete
      total: 30,
    };

    return {
      projectId,
      status: 'assessment',
      requiredDocuments,
      inspectionsRequired,
      complianceIssues,
      costEstimate,
      estimatedTimeline,
    };
  }

  /**
   * Assess system for code compliance issues
   */
  private async assessCompliance(systemInfo: ExistingSystemInfo) {
    const issues: Array<{
      code: string;
      description: string;
      severity: 'critical' | 'major' | 'minor';
      remediation: string;
      status: 'open' | 'resolved';
    }> = [];

    // NEC 690.12 - Rapid Shutdown
    if (systemInfo.installationDate < new Date('2017-01-01')) {
      issues.push({
        code: 'NEC 690.12',
        description: 'System may not have compliant rapid shutdown',
        severity: 'critical',
        remediation: 'Install rapid shutdown devices at module level or array boundary',
        status: 'open',
      });
    }

    // NEC 690.13 - Disconnecting Means
    issues.push({
      code: 'NEC 690.13',
      description: 'Verify AC and DC disconnects are properly labeled and accessible',
      severity: 'major',
      remediation: 'Add labels and verify disconnect accessibility',
      status: 'open',
    });

    // System size compliance
    if (systemInfo.systemSizeKw > 10 && !systemInfo.installerLicense) {
      issues.push({
        code: 'Licensing',
        description: 'System over 10kW installed without licensed contractor',
        severity: 'critical',
        remediation: 'Obtain engineering stamp and contractor affidavit',
        status: 'open',
      });
    }

    // Grounding
    issues.push({
      code: 'NEC 690.35',
      description: 'Verify proper grounding of array and equipment',
      severity: 'major',
      remediation: 'Inspector to verify grounding during site visit',
      status: 'open',
    });

    // Arc-fault protection (systems after 2011)
    if (systemInfo.installationDate > new Date('2011-01-01')) {
      issues.push({
        code: 'NEC 690.11',
        description: 'Verify arc-fault protection if required',
        severity: 'major',
        remediation: 'Confirm inverter has built-in AFCI or add external protection',
        status: 'open',
      });
    }

    return issues;
  }

  /**
   * Generate retroactive permit application package
   */
  async generatePermitPackage(projectId: string): Promise<{
    documents: Array<{ name: string; content: string; type: string }>;
    instructions: string[];
  }> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        system: true,
        bomItems: true,
        plan: true,
      },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    const documents = [
      {
        name: 'Retroactive_Permit_Application.pdf',
        content: 'Application form for retroactive solar permit',
        type: 'application/pdf',
      },
      {
        name: 'System_Documentation.pdf',
        content: 'Compiled system specifications and photos',
        type: 'application/pdf',
      },
      {
        name: 'Cover_Letter.pdf',
        content: 'Letter explaining circumstances and requesting retroactive approval',
        type: 'application/pdf',
      },
    ];

    const instructions = [
      'Complete all sections of the retroactive permit application',
      'Include photos of: array, inverter, disconnects, roof condition, electrical panel',
      'Provide manufacturer datasheets for all major components',
      'Create single-line electrical diagram showing all system connections',
      'If system >10kW, obtain PE (Professional Engineer) stamp on drawings',
      'Schedule pre-inspection with AHJ if available',
      'Pay all applicable fees (permit, inspection, and any late filing penalties)',
      'Be prepared for possible required upgrades to meet current code',
      'Allow 2-4 weeks for permit review',
      'Coordinate inspection scheduling after permit approval',
    ];

    return { documents, instructions };
  }

  /**
   * Check permit application status
   */
  async checkPermitStatus(projectId: string) {
    const plan = await prisma.plan.findUnique({
      where: { projectId },
    });

    if (!plan) {
      throw new Error('Plan not found');
    }

    return {
      permitStatus: plan.permitStatus,
      permitNumber: plan.permitNumber,
      submitDate: plan.permitSubmitDate,
      approvalDate: plan.permitApprovalDate,
      nextSteps: this.getNextSteps(plan.permitStatus || 'not_started'),
    };
  }

  /**
   * Get next steps based on current permit status
   */
  private getNextSteps(status: string): string[] {
    const steps: Record<string, string[]> = {
      not_started: [
        'Gather all system documentation',
        'Take comprehensive photos of installation',
        'Complete permit application forms',
        'Submit application to AHJ',
      ],
      submitted: [
        'Wait for AHJ review (typically 2-4 weeks)',
        'Respond promptly to any questions or requests',
        'Prepare for possible site visit',
      ],
      under_review: [
        'Monitor application status with AHJ',
        'Address any deficiencies identified',
        'Schedule inspections once approved',
      ],
      approved: [
        'Schedule required inspections',
        'Ensure all work is accessible for inspection',
        'Complete any required corrections',
        'Obtain final approval and PTO',
      ],
      rejected: [
        'Review rejection reasons with AHJ',
        'Make required corrections or upgrades',
        'Resubmit application with changes',
      ],
    };

    return steps[status] || ['Contact your permitting specialist for guidance'];
  }
}

export const retroactivePermittingService = new RetroactivePermittingService();
