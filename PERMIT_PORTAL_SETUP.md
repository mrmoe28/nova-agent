# Permit Submission Portal Setup Guide

## Overview

The Permit Submission Portal allows you to upload planset PDFs and send them directly to permit offices via email from within the NovaAgent app.

## Features

✅ **Upload Plansets** - PDF files up to 25MB
✅ **Email to Permit Office** - Send directly to AHJ with customizable message  
✅ **Document Management** - View, download, delete uploaded documents
✅ **Status Tracking** - Track submission status (pending, submitted, approved, rejected)
✅ **Auto-lookup** - Find permit office email by address
✅ **Email Templates** - Pre-filled professional templates

## Setup Instructions

### Step 1: Configure Email Service (SMTP)

The portal uses nodemailer to send emails. You need to configure SMTP credentials.

#### Option A: Gmail (Easiest for Development)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other"  
   - Name it "NovaAgent"
   - Copy the 16-character password

3. **Add to `.env.local`**:
```bash
# Gmail SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password-here
SMTP_FROM=your-email@gmail.com
```

#### Option B: SendGrid (Recommended for Production)

1. **Sign up** at https://sendgrid.com (free tier: 100 emails/day)
2. **Create API Key**:
   - Settings → API Keys → Create API Key
   - Full Access
   - Copy the key

3. **Add to `.env.local`**:
```bash
# SendGrid SMTP Configuration  
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key-here
SMTP_FROM=your-verified-sender@yourdomain.com
```

#### Option C: Custom SMTP Server

```bash
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=permits@yourdomain.com
SMTP_PASS=your-password
SMTP_FROM=permits@yourdomain.com
```

### Step 2: Install Dependencies

```bash
npm install nodemailer
npm install --save-dev @types/nodemailer
```

### Step 3: Create Uploads Directory

The system stores plansets in `public/uploads/plansets/`. This directory is created automatically, but you can pre-create it:

```bash
mkdir -p public/uploads/plansets
```

### Step 4: Add to Vercel (Production)

If using Vercel, add environment variables:

**Via CLI:**
```bash
vercel env add SMTP_HOST production
vercel env add SMTP_PORT production
vercel env add SMTP_USER production
vercel env add SMTP_PASS production
vercel env add SMTP_FROM production
```

**Via Dashboard:**
1. Go to your project on Vercel
2. Settings → Environment Variables
3. Add all SMTP variables
4. Redeploy

### Step 5: Test Locally

1. **Start dev server**:
```bash
npm run dev
```

2. **Navigate to a project**:
   - Projects → [Select Project] → Track Progress → Permits tab

3. **Upload a test PDF**:
   - Click "Choose File"
   - Select a PDF (max 25MB)
   - Click "Upload"

4. **Send test email**:
   - Enter your own email in "Permit Office Email"
   - Customize subject/message if needed
   - Click "Send" on the uploaded document

## Usage

### Upload Planset

1. Navigate to: **Projects → [Project] → Track Progress → Permits**
2. Scroll to **"Planset Submission"** section
3. Click **"Choose File"** and select your PDF planset
4. Click **"Upload"**

### Send to Permit Office

1. **Set Permit Office Email**:
   - Use "Find by Address" to auto-populate
   - Or manually enter email address

2. **Customize Email** (optional):
   - Edit subject line
   - Modify message body
   - Add project-specific details

3. **Send**:
   - Click "Send" button on the uploaded document
   - Confirmation toast will appear
   - Document status changes to "Submitted"

### Manage Documents

- **View PDF**: Click eye icon (👁️) to preview in browser
- **Download**: Click download icon (⬇️) to save locally
- **Delete**: Click trash icon (🗑️) to remove (confirmation required)
- **Status**: Badge shows current status (Pending/Submitted/Approved/Rejected)

## Email Template Customization

The default email template includes:
- Professional header
- Project information (client, address, ID)
- Custom message
- Attached planset PDF
- NovaAgent branding

To customize the template, edit:
```typescript
// src/app/api/permits/send-planset/route.ts
// Line ~60: mailOptions.html
```

## Permit Office Email Addresses

### Auto-Lookup by Address

The system can automatically find permit office contacts:

1. Click **"Find by Address"** button
2. System identifies jurisdiction from customer address
3. Auto-fills permit office email and contact info

### Supported Jurisdictions (Georgia)

- **Fulton County**: Already configured
- **DeKalb County**: Already configured
- **Cobb County**: Already configured  
- **Gwinnett County**: Already configured
- **City of Atlanta**: Already configured

To add more jurisdictions, edit:
```typescript
// src/lib/permit-office-lookup.ts
// Add to GEORGIA_JURISDICTIONS object
```

## Troubleshooting

### "Email service not configured"

**Problem**: SMTP credentials not set

**Solution**:
```bash
# Check .env.local has all SMTP_ variables
cat .env.local | grep SMTP

# Restart dev server after adding
npm run dev
```

### "Failed to upload document"

**Problem**: File too large or wrong type

**Solution**:
- Ensure PDF is under 25MB
- Only PDF files allowed
- Check file isn't corrupted

### "File not found on server"

**Problem**: File deleted from uploads directory

**Solution**:
- File reference in database but file missing
- Re-upload the planset
- Check uploads directory permissions

### Email not sending (Gmail)

**Problem**: Gmail blocks "less secure apps"

**Solution**:
- Use App Password (not regular password)
- Enable 2FA first
- Don't use "@gmail.com" account for production

## Security Considerations

### Production Recommendations

1. **Use dedicated email account** for sending permits
2. **Enable email authentication** (SPF, DKIM, DMARC)
3. **Restrict file uploads** to authenticated users only
4. **Implement virus scanning** for uploaded PDFs
5. **Add rate limiting** to prevent spam
6. **Use HTTPS** for all file transfers
7. **Regular backups** of uploads directory

### File Storage

**Development**: Files stored in `public/uploads/plansets/`

**Production Options**:
- **AWS S3**: Best for scalability
- **Cloudinary**: Good for documents
- **Vercel Blob**: Simple integration
- **Google Cloud Storage**: Enterprise option

To switch to cloud storage, modify:
```typescript
// src/app/api/documents/upload/route.ts
// Replace fs.writeFile with cloud upload
```

## API Endpoints

### POST /api/documents/upload
Upload a planset PDF

**Request**: FormData with file, projectId, documentType
**Response**: Document metadata

### POST /api/permits/send-planset
Send planset via email

**Request**: { projectId, documentId, to, subject, message }
**Response**: { success, messageId }

### GET /api/documents/[id]/download
Download or view document

**Query**: download=true (force download)
**Response**: PDF file

### DELETE /api/documents/[id]
Delete a document

**Response**: { success, message }

### PATCH /api/documents/[id]
Update document status

**Request**: { status, notes }
**Response**: Updated document

## Future Enhancements

### Planned Features

- [ ] **Batch upload** multiple plansets
- [ ] **Email tracking** (read receipts)
- [ ] **Automatic follow-ups** if no response
- [ ] **OCR** on plansets for data extraction  
- [ ] **Version control** for planset revisions
- [ ] **E-signature integration** for permits
- [ ] **API integration** with permit office portals
- [ ] **Mobile app** for on-site uploads
- [ ] **Notification system** for status changes
- [ ] **Analytics dashboard** for permit processing times

### Integration Opportunities

- **SolarAPP+**: Automated permit approval
- **Accela Civic Platform**: Direct portal integration
- **OpenGov**: Cloud-based permitting
- **Viewpoint**: Construction permit management

## Support

For questions or issues:
1. Check this documentation
2. Review [PERMIT_INTEGRATION.md](./PERMIT_INTEGRATION.md)
3. See [Installation Progress Tracking Plan](./installation-progress-tracking.plan.md)
4. Check API route files for detailed comments

## Quick Reference

| Task | Location |
|------|----------|
| Upload Planset | Projects → [Project] → Track Progress → Permits |
| Configure Email | .env.local → SMTP_* variables |
| Customize Template | src/app/api/permits/send-planset/route.ts |
| Add Jurisdiction | src/lib/permit-office-lookup.ts |
| View Uploads | public/uploads/plansets/ |
| Check Logs | Server console (npm run dev) |

