# File Persistence Strategy for Bill Uploads

## Current Implementation

Currently, bill files are stored in `/tmp` directory which is **ephemeral** in serverless environments (Vercel, AWS Lambda). Files are automatically deleted after the serverless function completes execution.

### Current Flow:
1. File uploaded → Saved to `/tmp/uploads/{projectId}/{filename}`
2. OCR processing → Extracts text and structured data
3. Database record → Stores file path, OCR text, and extracted data
4. File deletion → File removed after function execution (serverless limitation)

## Problem

- Files cannot be re-processed if OCR fails
- Files cannot be accessed after initial upload
- No way to download or view original files later
- Re-analysis requires re-upload

## Recommended Solutions

### Option 1: Cloud Storage (Recommended for Production)

#### AWS S3 Integration

```typescript
// src/lib/storage.ts
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || "nova-agent-bills";

export async function uploadToS3(
  fileBuffer: Buffer,
  fileName: string,
  projectId: string
): Promise<string> {
  const key = `bills/${projectId}/${Date.now()}_${fileName}`;
  
  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: getContentType(fileName),
    })
  );

  return `s3://${BUCKET_NAME}/${key}`;
}

export async function getFromS3(s3Path: string): Promise<Buffer> {
  const [bucket, ...keyParts] = s3Path.replace("s3://", "").split("/");
  const key = keyParts.join("/");

  const response = await s3Client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );

  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as any) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}
```

#### Vercel Blob Storage (Alternative)

```typescript
// src/lib/storage.ts
import { put, get } from "@vercel/blob";

export async function uploadToVercelBlob(
  fileBuffer: Buffer,
  fileName: string,
  projectId: string
): Promise<string> {
  const blob = await put(
    `bills/${projectId}/${Date.now()}_${fileName}`,
    fileBuffer,
    {
      access: "public",
      contentType: getContentType(fileName),
    }
  );

  return blob.url;
}

export async function getFromVercelBlob(url: string): Promise<Buffer> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
```

### Option 2: Database Storage (Small Files Only)

For small files (< 1MB), store directly in database:

```prisma
model Bill {
  id          String   @id @default(cuid())
  projectId   String
  fileName    String
  fileType    String
  filePath    String?  // S3 path or null
  fileData    Bytes?   // Base64 encoded file data (for small files)
  ocrText     String?
  extractedData String?
  // ...
}
```

**Limitations:**
- Database size grows quickly
- Not suitable for large files
- Slower queries

### Option 3: Hybrid Approach (Recommended)

1. **Small files (< 1MB)**: Store in database as base64
2. **Large files (>= 1MB)**: Store in cloud storage (S3/Vercel Blob)
3. **File path field**: Contains either `s3://...` or `db://{billId}`

## Implementation Steps

### Step 1: Update Database Schema

```prisma
model Bill {
  id          String   @id @default(cuid())
  projectId   String
  fileName    String
  fileType    String
  filePath    String?  // Cloud storage path or null
  fileSize    Int?     // File size in bytes
  storageType String?  // "s3", "vercel-blob", "database", or "tmp"
  ocrText     String?
  extractedData String?
  uploadedAt  DateTime @default(now())
  // ...
}
```

### Step 2: Update Upload Route

```typescript
// src/app/api/upload/route.ts
import { uploadToS3 } from "@/lib/storage";

export async function POST(request: NextRequest) {
  // ... existing validation ...

  // Convert file to buffer
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Upload to persistent storage
  let storagePath: string | null = null;
  let storageType: string = "tmp";

  try {
    if (buffer.length < 1024 * 1024) {
      // Small file: store in database
      storageType = "database";
      // Store as base64 in fileData field
    } else {
      // Large file: upload to S3
      storagePath = await uploadToS3(buffer, fileName, projectId);
      storageType = "s3";
    }
  } catch (storageError) {
    console.error("Storage upload failed:", storageError);
    // Fallback to tmp for immediate processing
    storageType = "tmp";
  }

  // Save file to tmp for immediate OCR processing
  await writeFile(filePath, buffer);

  // ... OCR processing ...

  // Save to database with storage info
  const bill = await prisma.bill.create({
    data: {
      projectId,
      fileName: file.name,
      fileType,
      filePath: storagePath || urlPath,
      fileSize: buffer.length,
      storageType,
      ocrText,
      extractedData,
    },
  });

  // ... return response ...
}
```

### Step 3: Create File Retrieval Endpoint

```typescript
// src/app/api/files/[billId]/route.ts
import { getFromS3 } from "@/lib/storage";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { billId: string } }
) {
  const bill = await prisma.bill.findUnique({
    where: { id: params.billId },
  });

  if (!bill) {
    return NextResponse.json(
      { error: "Bill not found" },
      { status: 404 }
    );
  }

  let fileBuffer: Buffer;

  if (bill.storageType === "s3" && bill.filePath) {
    fileBuffer = await getFromS3(bill.filePath);
  } else if (bill.storageType === "database") {
    // Retrieve from database
    const fileData = await prisma.bill.findUnique({
      where: { id: params.billId },
      select: { fileData: true },
    });
    fileBuffer = Buffer.from(fileData?.fileData || []);
  } else {
    return NextResponse.json(
      { error: "File no longer available (temporary storage expired)" },
      { status: 410 }
    );
  }

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": getContentType(bill.fileName),
      "Content-Disposition": `attachment; filename="${bill.fileName}"`,
    },
  });
}
```

## Environment Variables Required

```bash
# AWS S3 (Option 1)
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=nova-agent-bills
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# OR Vercel Blob (Option 2)
BLOB_READ_WRITE_TOKEN=your-vercel-blob-token
```

## Migration Strategy

1. **Phase 1**: Implement cloud storage for new uploads
2. **Phase 2**: Migrate existing files (if needed)
3. **Phase 3**: Remove `/tmp` dependency for file storage

## Cost Considerations

- **S3**: ~$0.023/GB/month storage + $0.0004/1000 GET requests
- **Vercel Blob**: ~$0.15/GB/month storage + $0.15/GB bandwidth
- **Database**: Included in database plan (but increases DB size)

## Recommendation

For production, use **AWS S3** or **Vercel Blob** for all files:
- Reliable and scalable
- Cost-effective for large volumes
- Enables file re-processing
- Supports file downloads
- Better user experience

## Next Steps

1. Choose storage provider (S3 recommended)
2. Install required packages: `npm install @aws-sdk/client-s3`
3. Update upload route with storage integration
4. Create file retrieval endpoint
5. Update frontend to support file downloads
6. Test with various file sizes

