# OpenSolar Integration Guide

Complete integration between NovaAgent and OpenSolar for seamless solar design workflow.

## Overview

This integration allows you to export NovaAgent projects directly to OpenSolar for detailed solar system design, including:
- 3D roof modeling and shading analysis
- Advanced panel layout optimization
- Financial modeling and proposals
- Professional design documents

---

## Setup Instructions

### 1. Get Your OpenSolar API Credentials

1. Log in to your OpenSolar account at [https://opensolar.com](https://opensolar.com)
2. Navigate to **Settings** → **API Access**
3. Generate a new API key if you don't have one
4. Copy your:
   - **API Key**
   - **Organization ID**

### 2. Configure Environment Variables

Add the following to your `.env.local` file:

```env
# OpenSolar API Configuration
OPENSOLAR_API_KEY=your_api_key_here
OPENSOLAR_ORG_ID=your_organization_id_here
OPENSOLAR_API_URL=https://api.opensolar.com/v1
```

### 3. Test the Connection

Navigate to: **Settings** → **Integrations** → **OpenSolar** and click "Test Connection"

Or use the API directly:
```bash
curl http://localhost:3003/api/opensolar/test
```

---

## Usage

### Exporting Projects to OpenSolar

**From Project Page:**
1. Open any project in NovaAgent
2. Click the **"Export to OpenSolar"** button
3. The project will be created in your OpenSolar account
4. You'll receive a direct link to the OpenSolar design page

**Programmatically:**
```typescript
const response = await fetch('/api/opensolar/export', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ projectId: 'your-project-id' }),
});

const result = await response.json();
console.log('OpenSolar Project URL:', result.openSolarProject.designUrl);
```

---

## API Endpoints

### POST `/api/opensolar/export`
Export a NovaAgent project to OpenSolar

**Request:**
```json
{
  "projectId": "cm1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "openSolarProject": {
    "id": "os_abc123",
    "name": "John Smith - Solar Project",
    "designUrl": "https://opensolar.com/projects/os_abc123/design"
  },
  "message": "Project successfully exported to OpenSolar"
}
```

### GET `/api/opensolar/test`
Test OpenSolar API connection

**Response:**
```json
{
  "success": true,
  "message": "Successfully connected to OpenSolar",
  "organizationName": "Your Company Name",
  "configured": true
}
```

---

## What Data Gets Exported

| Field | Description |
|-------|-------------|
| **Project Name** | Client name + "Solar Project" |
| **Client Name** | From NovaAgent project |
| **Address** | Installation address |
| **System Size (kW)** | Total solar capacity |
| **Panel Count** | Number of solar panels |
| **Inverter Size (kW)** | Inverter capacity |
| **Battery Size (kWh)** | Battery storage capacity (if applicable) |
| **Notes** | Export timestamp and source |

---

## Workflow Examples

### Example 1: Full Project Flow

```
1. Client uploads utility bills to NovaAgent
   ↓
2. NovaAgent analyzes usage and sizes system
   ↓
3. Export to OpenSolar for detailed design
   ↓
4. OpenSolar creates 3D model and shading analysis
   ↓
5. Review and finalize design in OpenSolar
   ↓
6. Generate proposal and send to client
```

### Example 2: Quick Export

```javascript
// In your project component
const handleExportToOpenSolar = async (projectId) => {
  try {
    const response = await fetch('/api/opensolar/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId }),
    });

    const result = await response.json();

    if (result.success) {
      // Open OpenSolar in new tab
      window.open(result.openSolarProject.designUrl, '_blank');
      toast.success('Project exported to OpenSolar!');
    }
  } catch (error) {
    toast.error('Failed to export project');
  }
};
```

---

## Benefits

### For Solar Professionals

1. **Streamlined Workflow**
   - Start with NovaAgent for bill analysis and sizing
   - Export to OpenSolar for detailed design
   - All data transfers automatically

2. **Better Accuracy**
   - NovaAgent sizes based on actual usage
   - OpenSolar optimizes layout based on 3D modeling
   - Combined strength of both platforms

3. **Time Savings**
   - No manual data entry between platforms
   - Automatic system configuration
   - One-click export

4. **Professional Output**
   - OpenSolar's advanced design tools
   - Professional proposals and renderings
   - Detailed technical documentation

---

## Troubleshooting

### "OpenSolar integration not configured"
**Solution:** Add `OPENSOLAR_API_KEY` and `OPENSOLAR_ORG_ID` to your `.env.local` file

### "Project not found"
**Solution:** Ensure the project ID exists in NovaAgent database

### "API connection failed"
**Possible causes:**
- Invalid API key
- Expired API key
- Network connectivity issues
- OpenSolar API is down

**Solution:**
1. Verify your API credentials in OpenSolar
2. Test connection using `/api/opensolar/test`
3. Check OpenSolar status page

### "Insufficient permissions"
**Solution:** Ensure your OpenSolar API key has project creation permissions

---

## OpenSolar API Service Methods

```typescript
// Test connection
await openSolarService.testConnection();

// Export project
await openSolarService.exportProject({
  projectName: 'Client Name - Solar',
  clientName: 'Client Name',
  address: '123 Main St',
  systemSizeKw: 8.5,
  panelCount: 22,
  inverterSizeKw: 7.6,
  batteryKwh: 13.5,
});

// Get project details
await openSolarService.getProject('os_project_id');

// List all projects
await openSolarService.listProjects({ status: 'active', limit: 10 });

// Import design data back
await openSolarService.importSystemData('os_project_id');

// Get design URL
openSolarService.getDesignUrl('os_project_id');
```

---

## Security Notes

- **API Keys:** Never commit API keys to version control
- **Environment Variables:** Always use `.env.local` for secrets
- **.gitignore:** Ensure `.env.local` is in your `.gitignore`
- **Permissions:** Use read/write access only for necessary operations

---

## Future Enhancements

- [ ] Import completed designs from OpenSolar back to NovaAgent
- [ ] Two-way sync of project updates
- [ ] Automatic BOM updates from OpenSolar
- [ ] Webhook notifications for design completion
- [ ] Batch export multiple projects
- [ ] OpenSolar project status tracking in NovaAgent

---

## Support

- **OpenSolar Documentation:** [https://docs.opensolar.com](https://docs.opensolar.com)
- **OpenSolar Support:** support@opensolar.com
- **NovaAgent Issues:** [GitHub Issues](https://github.com/mrmoe28/nova-agent/issues)

---

**OpenSolar Integration: Connecting NovaAgent with Professional Solar Design**

*Designed for seamless workflow between usage analysis and system design.*
