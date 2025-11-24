/**
 * Permit Office Lookup Service
 * Finds the Authority Having Jurisdiction (AHJ) based on customer address
 */

export interface PermitOffice {
  ahjName: string;
  jurisdiction: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  fees: {
    buildingPermit: number;
    electricalPermit: number;
    planReview: number;
    interconnectionFee?: number;
    adminProcessing?: number;
  };
  notes?: string;
  requiresOnlineSubmission: boolean;
  onlinePortalUrl?: string;
  processingTimeBusinessDays: number;
}

/**
 * Parse address to extract city, county, and state
 */
export function parseAddress(address: string): {
  street?: string;
  city?: string;
  county?: string;
  state?: string;
  zip?: string;
} {
  // Basic address parsing - can be enhanced with a geocoding API
  const parts = address.split(',').map(s => s.trim());
  
  if (parts.length < 2) {
    return {};
  }

  const street = parts[0];
  const cityState = parts[1];
  const zipMatch = address.match(/\b\d{5}(?:-\d{4})?\b/);
  const stateMatch = address.match(/\b[A-Z]{2}\b/);

  return {
    street,
    city: cityState.replace(/\s+[A-Z]{2}\s*\d{5}.*$/, '').trim(),
    state: stateMatch ? stateMatch[0] : undefined,
    zip: zipMatch ? zipMatch[0] : undefined,
  };
}

/**
 * Georgia County to AHJ mapping
 * This should be expanded with actual jurisdictions
 */
const GEORGIA_JURISDICTIONS: Record<string, PermitOffice> = {
  'fulton': {
    ahjName: 'Fulton County Building Department',
    jurisdiction: 'Fulton County, GA',
    phone: '(404) 612-6600',
    website: 'https://www.fultoncountyga.gov/services/building-permits',
    fees: {
      buildingPermit: 350,
      electricalPermit: 150,
      planReview: 200,
      interconnectionFee: 100,
      adminProcessing: 85,
    },
    requiresOnlineSubmission: true,
    onlinePortalUrl: 'https://aca-prod.accela.com/FULTON',
    processingTimeBusinessDays: 10,
    notes: 'Solar permits require stamped structural calculations',
  },
  'dekalb': {
    ahjName: 'DeKalb County Building Department',
    jurisdiction: 'DeKalb County, GA',
    phone: '(404) 371-2000',
    website: 'https://www.dekalbcountyga.gov/planning-sustainability/building-permits',
    fees: {
      buildingPermit: 325,
      electricalPermit: 140,
      planReview: 175,
      interconnectionFee: 100,
      adminProcessing: 75,
    },
    requiresOnlineSubmission: true,
    onlinePortalUrl: 'https://epermits.dekalbcountyga.gov',
    processingTimeBusinessDays: 7,
  },
  'cobb': {
    ahjName: 'Cobb County Building Safety',
    jurisdiction: 'Cobb County, GA',
    phone: '(770) 528-2000',
    website: 'https://www.cobbcounty.org/building-safety/permits',
    fees: {
      buildingPermit: 300,
      electricalPermit: 125,
      planReview: 175,
      interconnectionFee: 100,
      adminProcessing: 85,
    },
    requiresOnlineSubmission: false,
    processingTimeBusinessDays: 5,
  },
  'gwinnett': {
    ahjName: 'Gwinnett County Building Inspections',
    jurisdiction: 'Gwinnett County, GA',
    phone: '(678) 518-6020',
    website: 'https://www.gwinnettcounty.com/web/gwinnett/departments/planningdevelopment/buildinginspections',
    fees: {
      buildingPermit: 275,
      electricalPermit: 135,
      planReview: 150,
      interconnectionFee: 100,
      adminProcessing: 75,
    },
    requiresOnlineSubmission: true,
    onlinePortalUrl: 'https://epermits.gwinnettcounty.com',
    processingTimeBusinessDays: 7,
  },
  'atlanta': {
    ahjName: 'City of Atlanta Building Department',
    jurisdiction: 'City of Atlanta, GA',
    phone: '(404) 865-8520',
    website: 'https://www.atlantaga.gov/government/departments/city-planning/office-of-buildings',
    fees: {
      buildingPermit: 400,
      electricalPermit: 175,
      planReview: 225,
      interconnectionFee: 125,
      adminProcessing: 100,
    },
    requiresOnlineSubmission: true,
    onlinePortalUrl: 'https://aca-prod.accela.com/ATLANTA',
    processingTimeBusinessDays: 14,
    notes: 'City of Atlanta requires additional fire marshal review',
  },
};

/**
 * Default/fallback permit office for unknown jurisdictions
 */
const DEFAULT_GEORGIA_AHJ: PermitOffice = {
  ahjName: 'County Building Department',
  jurisdiction: 'Georgia',
  fees: {
    buildingPermit: 300,
    electricalPermit: 125,
    planReview: 175,
    interconnectionFee: 100,
    adminProcessing: 85,
  },
  requiresOnlineSubmission: false,
  processingTimeBusinessDays: 10,
  notes: 'Default fees - verify with local jurisdiction',
};

/**
 * Lookup permit office by customer address
 */
export async function lookupPermitOffice(address: string): Promise<PermitOffice> {
  const parsed = parseAddress(address);
  
  if (!parsed.city && !parsed.state) {
    return DEFAULT_GEORGIA_AHJ;
  }

  // For Georgia addresses, try to match jurisdiction
  if (parsed.state === 'GA') {
    const cityLower = parsed.city?.toLowerCase() || '';
    
    // Check for exact city/county match
    for (const [key, office] of Object.entries(GEORGIA_JURISDICTIONS)) {
      if (cityLower.includes(key)) {
        return office;
      }
    }
  }

  // TODO: Integrate with external geocoding/jurisdiction APIs
  // - Google Civic Information API
  // - SolarAPP+ API for automated permit processing
  // - State-specific building department databases

  return DEFAULT_GEORGIA_AHJ;
}

/**
 * Calculate total permit fees for a jurisdiction
 */
export function calculateTotalFees(office: PermitOffice): number {
  const fees = office.fees;
  return (
    fees.buildingPermit +
    fees.electricalPermit +
    fees.planReview +
    (fees.interconnectionFee || 0) +
    (fees.adminProcessing || 0)
  );
}

/**
 * Format permit office information for display
 */
export function formatPermitOfficeInfo(office: PermitOffice): string {
  const totalFees = calculateTotalFees(office);
  const submissionType = office.requiresOnlineSubmission ? 'Online' : 'In-Person/Mail';
  
  return `
${office.ahjName}
${office.jurisdiction}
${office.phone || ''}
${office.website || ''}

Permit Fees:
- Building Permit: $${office.fees.buildingPermit}
- Electrical Permit: $${office.fees.electricalPermit}
- Plan Review: $${office.fees.planReview}
- Interconnection Fee: $${office.fees.interconnectionFee || 0}
- Admin Processing: $${office.fees.adminProcessing || 0}
Total: $${totalFees}

Submission: ${submissionType}
${office.onlinePortalUrl ? `Portal: ${office.onlinePortalUrl}` : ''}
Processing Time: ${office.processingTimeBusinessDays} business days

${office.notes || ''}
  `.trim();
}

