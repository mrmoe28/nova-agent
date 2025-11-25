# Retroactive Permitting - Existing Solar Installations

Complete solution for customers who already have solar installed but need permits completed.

## Overview

Many homeowners have solar systems installed without proper permits due to:
- DIY installations
- Unlicensed contractors
- Incomplete paperwork
- Sale of home with unpermitted solar
- System expansion without permits

This feature provides a streamlined workflow to bring existing installations into compliance.

---

## Features

### 1. Specialized Intake Process
- **Page:** `/existing-installation`
- Captures existing system details without requiring new design
- Skips unnecessary sizing calculations
- Focuses on documentation and compliance

### 2. Compliance Assessment
- Automatic NEC code compliance checking
- Identifies potential issues before submission
- Categorizes issues by severity (critical/major/minor)
- Provides remediation recommendations

### 3. Cost & Timeline Estimation
- Permit fees
- Inspection fees
- Engineering stamps (if required)
- Possible upgrade costs
- Realistic timelines for completion

### 4. Document Management
- Tracks required documentation
- Identifies what's missing
- Provides templates and examples
- Manages submission packages

### 5. Status Tracking
- Real-time permit status
- Next steps guidance
- Inspection scheduling
- Final approval tracking

---

## How It Works

### Client Journey

```
1. Client visits /existing-installation
   ↓
2. Fills out system information form
   ↓
3. System generates permit completion plan
   ↓
4. Reviews costs, timeline, and requirements
   ↓
5. Specialist prepares permit application
   ↓
6. Submits to Authority Having Jurisdiction (AHJ)
   ↓
7. Schedules and completes inspections
   ↓
8. Obtains final approval and PTO
```

### What Information Is Collected

**Client Details:**
- Name, contact information
- Property address

**System Information:**
- Installation date (approximate)
- System size (kW)
- Number and type of panels
- Inverter details
- Battery (if applicable)
- Installer information (if known)

**Documentation Status:**
- Photos available
- Electrical diagrams
- Equipment datasheets
- Roof condition photos

---

## API Endpoints

### Create Retroactive Project
```
POST /api/retroactive-permitting/create
```

**Request Body:**
```json
{
  "clientInfo": {
    "name": "John Smith",
    "email": "john@example.com",
    "phone": "555-1234",
    "address": "123 Main St, Atlanta, GA 30301"
  },
  "systemInfo": {
    "installationDate": "2020-06-15",
    "systemSizeKw": 8.5,
    "panelCount": 22,
    "panelManufacturer": "Canadian Solar",
    "panelModel": "CS6K-400MS",
    "panelWattage": 400,
    "inverterManufacturer": "SolarEdge",
    "inverterModel": "SE7600H-US",
    "inverterSizeKw": 7.6,
    "inverterType": "string",
    "hasBattery": false,
    "installationType": "roof_mount",
    "roofType": "composition",
    "propertyAddress": "123 Main St, Atlanta, GA 30301",
    "hasSystemPhotos": true,
    "hasElectricalDiagram": false,
    "hasRoofPhotos": true,
    "hasInverterDatasheet": true,
    "hasPanelDatasheet": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "projectId": "cm...",
  "plan": {
    "status": "assessment",
    "requiredDocuments": [...],
    "inspectionsRequired": [...],
    "complianceIssues": [...],
    "costEstimate": {
      "permitFees": 500,
      "inspectionFees": 300,
      "engineeringStamp": 0,
      "possibleUpgrades": 500,
      "total": 1300
    },
    "estimatedTimeline": {
      "documentPrep": 5,
      "permitReview": 15,
      "inspections": 10,
      "total": 30
    }
  }
}
```

### Check Permit Status
```
GET /api/retroactive-permitting/status?projectId=xxx
```

**Response:**
```json
{
  "success": true,
  "status": {
    "permitStatus": "under_review",
    "permitNumber": "SOL-2025-1234",
    "submitDate": "2025-01-15T00:00:00Z",
    "nextSteps": [
      "Monitor application status with AHJ",
      "Respond promptly to any questions",
      "Prepare for possible site visit"
    ]
  }
}
```

---

## Code Compliance Checks

### Automatic NEC Assessments

| Code | Check | Severity |
|------|-------|----------|
| **NEC 690.12** | Rapid shutdown compliance | Critical |
| **NEC 690.13** | Disconnecting means labeled | Major |
| **NEC 690.35** | Proper grounding | Major |
| **NEC 690.11** | Arc-fault protection (2011+) | Major |
| **Licensing** | System >10kW by licensed contractor | Critical |

### Common Issues Found

1. **Missing Rapid Shutdown (NEC 690.12)**
   - Required for systems after 2017
   - Remediation: Install module-level or array-level shutdown devices
   - Cost: $500-$2,000

2. **Improper Labeling (NEC 690.13)**
   - AC and DC disconnects must be clearly labeled
   - Remediation: Add compliant labels
   - Cost: $50-$200

3. **Grounding Issues (NEC 690.35)**
   - Equipment must be properly grounded
   - Remediation: Inspector verification or corrective work
   - Cost: $0-$500

4. **Arc-Fault Protection (NEC 690.11)**
   - Required for systems after 2011
   - Remediation: Verify inverter has AFCI or add protection
   - Cost: $0-$800

5. **Licensing Violations**
   - Systems >10kW require licensed contractor
   - Remediation: PE stamp and contractor affidavit
   - Cost: $800-$1,500

---

## Required Documentation

### Standard Documents

1. **Site Plan**
   - Property layout
   - Array location and dimensions
   - Setbacks and clearances
   - Status: ❌ Usually missing

2. **Electrical Diagram**
   - Single-line diagram
   - System connections
   - Overcurrent protection
   - Status: ⚠️  Often incomplete

3. **Equipment Specs**
   - Panel datasheet with certifications
   - Inverter datasheet with UL listing
   - Battery specs (if applicable)
   - Status: ✅ Often available online

4. **Installation Photos**
   - Array photos from multiple angles
   - Inverter and disconnect photos
   - Roof penetrations and flashing
   - Electrical panel connections
   - Status: ⚠️  Quality varies

5. **Structural Letter**
   - PE stamp for roof loading
   - Required for systems >10kW or tile roofs
   - Status: ❌ Usually missing

6. **Interconnection Agreement**
   - Utility application
   - Net metering agreement
   - Status: ⚠️  May be pending

### Document Preparation Service

We provide:
- Site plan creation from photos/measurements
- Single-line diagram generation
- Equipment specification compilation
- Professional photo documentation
- Structural analysis coordination
- Complete permit application packages

---

## Cost Structure

### Typical Cost Breakdown

| Item | Range | Average |
|------|-------|---------|
| **Permit Fees** | $300-$800 | $500 |
| **Inspection Fees** | $200-$500 | $300 |
| **Engineering Stamp** | $500-$1,500 | $800 |
| **Rapid Shutdown Upgrade** | $500-$2,000 | $1,000 |
| **Labeling/Minor Fixes** | $50-$300 | $150 |
| **Professional Services** | $500-$2,000 | $1,000 |
| **TOTAL** | **$2,050-$7,100** | **$3,750** |

### Factors Affecting Cost

- **System Size:** Larger systems (>10kW) require PE stamps
- **Installation Date:** Older systems may need more upgrades
- **Current Code:** Systems may not meet current requirements
- **AHJ Requirements:** Some jurisdictions are stricter
- **Documentation:** More missing docs = higher prep costs
- **Compliance Issues:** Critical issues add upgrade costs

---

## Timeline Expectations

### Phase Breakdown

**1. Initial Assessment (1-2 days)**
- System documentation review
- Code compliance assessment
- Cost and timeline estimation

**2. Document Preparation (3-10 days)**
- Depends on available documentation
- May require site visits
- Engineering coordination if needed

**3. Permit Submission (1 day)**
- Submit application package
- Pay applicable fees

**4. Permit Review (10-30 days)**
- AHJ review time varies by jurisdiction
- May require plan corrections
- Respond to questions promptly

**5. Inspections (5-15 days)**
- Schedule electrical inspection
- Structural inspection (if required)
- Final inspection
- Corrections if needed

**6. Final Approval (1-5 days)**
- AHJ issues approval
- Utility issues PTO
- System legal and compliant

**Total Timeline: 3-8 weeks**

---

## Benefits

### For Homeowners

1. **Peace of Mind**
   - System properly permitted and inspected
   - Insurance coverage maintained
   - No issues when selling home

2. **Financial Protection**
   - Preserve solar tax credits (if applicable)
   - Maintain equipment warranties
   - Avoid fines or forced removal

3. **Safety Assurance**
   - Professional inspection verification
   - Code-compliant installation
   - Fire and electrical safety

4. **Property Value**
   - Permitted systems add value
   - Easier home sales
   - No disclosure issues

### For Solar Professionals

1. **New Revenue Stream**
   - Service for existing installations
   - Recurring permit services
   - Inspection coordination

2. **Risk Mitigation**
   - Help clients avoid legal issues
   - Document system compliance
   - Professional liability protection

3. **Customer Acquisition**
   - Serve DIY market
   - Help distressed homeowners
   - Referral opportunities

---

## Special Cases

### DIY Installations
- Most common retroactive permit scenario
- Often missing professional stamps
- May need electrical contractor involvement
- Typically require more documentation

### Unpermitted Contractor Work
- Contractor liability concerns
- May need new contractor of record
- Could require warranty issues
- Additional PE review recommended

### Home Sale Discoveries
- Urgency to complete before closing
- May negotiate with buyer
- Expedited service available
- Escrow holdbacks possible

### System Expansions
- Original system may be unpermitted
- Both phases need permits
- Cumulative capacity limits
- Utility approval required

### Inherited Systems
- Previous owner didn't permit
- Documentation often incomplete
- May need system verification
- Possible equipment obsolescence

---

## Best Practices

### For Successful Retroactive Permitting

1. **Be Honest**
   - Full disclosure to AHJ
   - Don't hide issues
   - Cooperative approach works best

2. **Document Everything**
   - Take comprehensive photos
   - Save all equipment paperwork
   - Record installation details
   - Keep communication records

3. **Act Quickly**
   - Don't wait for enforcement
   - Proactive is better than reactive
   - Fines increase with time

4. **Professional Help**
   - Use experienced permit specialists
   - Licensed electrician review
   - PE stamp when required

5. **Budget for Unknowns**
   - Unexpected issues may arise
   - Code upgrades may be required
   - Contingency fund recommended

---

## Legal Considerations

### Liability

- Homeowner ultimately responsible
- Contractor liability if work done by them
- PE stamp transfers professional liability
- Insurance may require permits

### Enforcement

- AHJ can require removal if non-compliant
- Fines for unpermitted work vary by jurisdiction
- Stop-work orders until permits obtained
- Criminal penalties possible in extreme cases

### Disclosure

- Must disclose unpermitted work when selling
- Title insurance may require permits
- Buyer can back out or renegotiate
- Escrow holdbacks common

---

## Success Stories

### Case Study 1: DIY Installation
**Problem:** Homeowner installed 6kW system himself, no permits
**Solution:** Retroactive permit with electrical contractor verification
**Outcome:** Approved in 4 weeks, $2,800 total cost
**Result:** System legal, home sold successfully

### Case Study 2: Unlicensed Contractor
**Problem:** 10kW system by unlicensed installer, discovered during home sale
**Solution:** PE review, corrections, new permit application
**Outcome:** Required rapid shutdown upgrade, approved in 6 weeks
**Result:** $5,200 cost, sale completed

### Case Study 3: Inherited System
**Problem:** Bought home with unpermitted 8kW system from 2015
**Solution:** Full documentation package, retroactive application
**Outcome:** Needed labeling and grounding corrections
**Result:** $3,100 cost, system now compliant

---

## FAQs

**Q: Will I get in trouble for unpermitted solar?**
A: AHJs prefer cooperation. Proactive compliance typically avoids penalties.

**Q: Can I keep my tax credit?**
A: Yes, if system was installed and operational during claim year, credit is valid.

**Q: What if my system doesn't meet current code?**
A: Some upgrades may be required. We'll identify minimum necessary changes.

**Q: How long does the process take?**
A: Typically 3-8 weeks depending on AHJ and documentation completeness.

**Q: What does it cost?**
A: Average $3,000-$4,000 including fees, inspections, and professional services.

**Q: Do I need to stop using the system?**
A: No, system can typically remain operational during permitting process.

**Q: Will my insurance find out?**
A: Better to proactively inform them. Permits may actually improve coverage.

**Q: What if inspections fail?**
A: We'll identify and correct issues. Most pass after minor corrections.

---

## Getting Started

### For Homeowners

1. Visit `/existing-installation`
2. Fill out system information form
3. Review permit completion plan
4. Schedule consultation
5. We handle the rest!

### For Solar Professionals

1. Add this service to your offerings
2. Market to DIY and distressed homeowners
3. Partner with licensed electricians
4. Charge $2,000-$5,000 for full service

---

## Support Resources

- **Technical Support:** Permitting specialists available
- **Documentation Templates:** Sample site plans, diagrams, photo guidelines
- **AHJ Database:** Jurisdiction-specific requirements
- **Contractor Network:** Licensed electricians for verification
- **Engineering Partners:** PE stamps when required

---

**Retroactive Permitting: Bringing Existing Solar Into Compliance**

*Making solar legal, safe, and valuable.*
