import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { fullName, email, phone, subject, message } = await request.json();

    // Validate inputs
    if (!fullName || !email || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Send email to admin
    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: process.env.CONTACT_EMAIL || "admin@agenthub.guru",
      subject: `New Contact Form: ${subject || "No Subject"}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${fullName}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone || "Not provided"}</p>
          <p><strong>Subject:</strong> ${subject || "No Subject"}</p>
          <h3>Message:</h3>
          <p style="white-space: pre-wrap;">${message}</p>
          <hr />
          <p style="color: #666; font-size: 12px;">This email was sent from the contact form on agenthub.guru</p>
        </div>
      `,
    });

    // Send confirmation email to user
    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: email,
      subject: "Receipt of Your Message - Agent Hub Guru",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2>Thank you for contacting us!</h2>
          <p>Hello ${fullName},</p>
          <p>We have received your message and will get back to you as soon as possible.</p>
          <hr />
          <p><strong>Your Information:</strong></p>
          <p><strong>Name:</strong> ${fullName}</p>
          <p><strong>Subject:</strong> ${subject || "No Subject"}</p>
          <p><strong>Phone:</strong> ${phone || "Not provided"}</p>
          <p style="margin-top: 30px; color: #666; font-size: 12px;">Best regards,<br />Agent Hub Guru Team</p>
        </div>
      `,
    });

    return NextResponse.json(
      { success: true, message: "Email sent successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error sending email:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
