# Permit Office Integration Guide

## Overview

The Installation Progress Tracking system now includes intelligent permit office lookup and verification based on customer address, along with integration support for external PTO (Permission To Operate) agent services.

## Features

### 1. Address-Based Permit Office Lookup

The system can automatically identify the correct Authority Having Jurisdiction (AHJ) based on the customer's address.

**Supported Jurisdictions (Georgia):**
- Fulton County
- DeKalb County
- Cobb County
- Gwinnett County
- City of Atlanta

Each jurisdiction includes:
- Official name and contact information
- Jurisdiction-specific permit fees
- Online portal URLs (if available)
- Processing time estimates
- Special requirements and notes

### 2. Jurisdiction-Specific Permit Fees

Instead of using generic Georgia fees, the system provides actual fees for each jurisdiction:

**Example - Fulton County:**
- Building Permit: $350
- Electrical Permit: $150
- Plan Review: $200
- Interconnection Fee: $100
- Admin Processing: $85
- **Total: $885**

**Example - City of Atlanta:**
- Building Permit: $400
- Electrical Permit: $175
- Plan Review: $225
- Interconnection Fee: $125
- Admin Processing: $100
- **Total: $1,025**

### 3. PTO Agent Integration

Integrate with external permit submission services by configuring the PTO Agent URL.

## Configuration

### Set PTO Agent URL

Add to your `.env.local` file:

```bash
NEXT_PUBLIC_PTO_AGENT_URL=https://your-pto-agent.com/projects
```

This will display a direct link to your PTO agent service in the permit tracking interface.

### Expand Jurisdiction Database

To add more jurisdictions, edit `src/lib/permit-office-lookup.ts`:

```typescript
const GEORGIA_JURISDICTIONS: Record<string, PermitOffice> = {
  'your-county': {
    ahjName: 'Your County Building Department',
    jurisdiction: 'Your County, GA',
    phone: '(555) 123-4567',
    website: 'https://yourcounty.gov/permits',
    fees: {
      buildingPermit: 300,
      electricalPermit: 125,
      planReview: 175,
      interconnectionFee: 100,
      adminProcessing: 85,
    },
    requiresOnlineSubmission: true,
    onlinePortalUrl: 'https://permits.yourcounty.gov',
    processingTimeBusinessDays: 7,
    notes: 'Any special requirements',
  },
};
```

## Usage

### In the Progress Page

1. **Navigate to Project**: Click on any project to view details
2. **Click "Track Progress"**: Opens the installation progress page
3. **View Permits Tab**: Shows permit tracking interface

### Lookup Permit Office

1. Click the **"Find by Address"** button
2. The system automatically:
   - Parses the customer address
   - Identifies the jurisdiction
   - Displays correct permit fees
   - Shows online portal links
   - Auto-fills AHJ information

### Access PTO Agent

If configured, a **"Open PTO Agent"** button appears with direct access to your external permit submission service.

## API Endpoints

### POST /api/permits/lookup

Lookup permit office by address.

**Request:**
```json
{
  "address": "123 Main St, Atlanta, GA 30303"
}
```

**Response:**
```json
{
  "success": true,
  "office": {
    "ahjName": "City of Atlanta Building Department",
    "jurisdiction": "City of Atlanta, GA",
    "phone": "(404) 865-8520",
    "website": "https://www.atlantaga.gov",
    "onlinePortalUrl": "https://aca-prod.accela.com/ATLANTA",
    "fees": {
      "buildingPermit": 400,
      "electricalPermit": 175,
      "planReview": 225,
      "interconnectionFee": 125,
      "adminProcessing": 100
    },
    "totalFees": 1025,
    "processingTimeBusinessDays": 14,
    "notes": "City of Atlanta requires additional fire marshal review"
  }
}
```

## Future Enhancements

### Planned Integrations

1. **Google Civic Information API**: Automated jurisdiction lookup for any US address
2. **SolarAPP+**: Instant online permit processing for qualifying installations
3. **State Building Department APIs**: Real-time fee verification and permit status tracking
4. **Automated Permit Submission**: Direct submission through online portals
5. **Document Generation**: Auto-generate required permit documents

### Multi-State Support

The system architecture supports expansion to other states:
- Add state-specific fee configurations
- Implement state-specific permit requirements
- Connect to state building department databases

## Troubleshooting

### "Default fees" shown instead of jurisdiction fees

**Cause**: Address not recognized or not in supported jurisdictions.

**Solution**:
1. Verify customer address is complete and accurate
2. Add the jurisdiction to `GEORGIA_JURISDICTIONS` in `permit-office-lookup.ts`
3. Consider integrating with a geocoding API for better address parsing

### PTO Agent link not appearing

**Cause**: `NEXT_PUBLIC_PTO_AGENT_URL` not set.

**Solution**:
1. Add the environment variable to `.env.local`
2. Restart the development server
3. Verify the variable starts with `NEXT_PUBLIC_` (required for client-side access)

### Incorrect permit fees

**Cause**: Jurisdiction fees may be outdated or address mapped to wrong jurisdiction.

**Solution**:
1. Verify the jurisdiction's official website for current fees
2. Update fees in `permit-office-lookup.ts`
3. Consider periodic fee verification process

## Support

For questions or issues:
1. Check the [Main README](./README.md)
2. Review the [Installation Progress Tracking Plan](./installation-progress-tracking.plan.md)
3. Examine `src/lib/permit-office-lookup.ts` for jurisdiction data

