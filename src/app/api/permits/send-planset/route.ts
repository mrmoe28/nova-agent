import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";
import { readFile } from "fs/promises";
import path from "path";

/**
 * POST /api/permits/send-planset
 * Send planset documents to permit office via email
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, documentId, to, subject, message } = body;

    if (!documentId || !to || !subject) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get document from database
    const document = await prisma.planDocument.findUnique({
      where: { id: documentId },
      include: {
        plan: {
          include: {
            project: true,
          },
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        { success: false, error: "Document not found" },
        { status: 404 }
      );
    }

    // Read file from disk
    const filePath = path.join(process.cwd(), "public", document.filePath);
    let fileBuffer: Buffer;
    
    try {
      fileBuffer = await readFile(filePath);
    } catch (error) {
      console.error("Error reading file:", error);
      return NextResponse.json(
        { success: false, error: "File not found on server" },
        { status: 404 }
      );
    }

    // Configure email transporter
    // For production, use environment variables
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Calculate file size in KB
    const fileSizeKB = Math.round(fileBuffer.length / 1024);

    // Prepare email
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: to,
      subject: subject,
      text: message,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Solar Installation Permit Application</h2>
          <p>${message.replace(/\n/g, "<br>")}</p>
          
          <div style="margin: 20px 0; padding: 15px; background-color: #f3f4f6; border-radius: 8px;">
            <h3 style="margin-top: 0;">Project Information</h3>
            <p><strong>Client:</strong> ${document.plan?.project?.clientName || "N/A"}</p>
            <p><strong>Address:</strong> ${document.plan?.project?.address || "N/A"}</p>
            <p><strong>Project ID:</strong> ${projectId}</p>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">
            Attached: ${document.fileName} (${fileSizeKB} KB)
          </p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          
          <p style="color: #9ca3af; font-size: 12px;">
            This email was sent via NovaAgent Solar & Battery Energy Planner
          </p>
        </div>
      `,
      attachments: [
        {
          filename: document.fileName,
          content: fileBuffer,
          contentType: "application/pdf",
        },
      ],
    };

    // Send email
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log("Email sent:", info.messageId);

      // Note: Document submission tracking would require schema update
      // Currently PlanDocument doesn't have status/submittedToAHJ/submittedAt fields
      console.log(`Document ${documentId} submitted to permit office: ${to}`);

      return NextResponse.json({
        success: true,
        message: "Planset sent successfully",
        messageId: info.messageId,
      });
    } catch (emailError) {
      console.error("Error sending email:", emailError);
      
      // Check if it's a configuration error
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        return NextResponse.json({
          success: false,
          error: "Email service not configured. Please contact administrator to set up SMTP credentials.",
        }, { status: 500 });
      }

      return NextResponse.json(
        {
          success: false,
          error: emailError instanceof Error ? emailError.message : "Failed to send email",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in send-planset API:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to process request",
      },
      { status: 500 }
    );
  }
}

