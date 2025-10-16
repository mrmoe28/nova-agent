import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const projectId = formData.get('projectId') as string
    const file = formData.get('file') as File

    if (!projectId || !file) {
      return NextResponse.json(
        { success: false, error: 'Project ID and file are required' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg',
      'text/csv',
      'application/vnd.ms-excel',
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid file type. Only PDF, images (JPG, PNG), and CSV are allowed.',
        },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File size must be less than 10MB' },
        { status: 400 }
      )
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'uploads', projectId)
    try {
      await mkdir(uploadsDir, { recursive: true })
    } catch {
      // Directory might already exist, that's fine
    }

    // Generate unique filename
    const timestamp = Date.now()
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileName = `${timestamp}_${safeFileName}`
    const filePath = join(uploadsDir, fileName)

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Determine file type category
    let fileType: 'pdf' | 'image' | 'csv' = 'pdf'
    if (file.type.startsWith('image/')) {
      fileType = 'image'
    } else if (file.type.includes('csv') || file.type.includes('excel')) {
      fileType = 'csv'
    }

    // Save to database
    const bill = await prisma.bill.create({
      data: {
        projectId,
        fileName: file.name,
        fileType,
        filePath: `/uploads/${projectId}/${fileName}`,
      },
    })

    return NextResponse.json({
      success: true,
      bill: {
        id: bill.id,
        fileName: bill.fileName,
        fileType: bill.fileType,
        uploadedAt: bill.uploadedAt,
      },
    })
  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}

// Get uploaded bills for a project
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      )
    }

    const bills = await prisma.bill.findMany({
      where: { projectId },
      orderBy: { uploadedAt: 'desc' },
    })

    return NextResponse.json({ success: true, bills })
  } catch (error) {
    console.error('Error fetching bills:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bills' },
      { status: 500 }
    )
  }
}
