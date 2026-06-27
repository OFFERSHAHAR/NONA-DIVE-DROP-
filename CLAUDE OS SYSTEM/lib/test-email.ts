/**
 * Test email sending with Resend
 * Run: npx ts-node lib/test-email.ts
 *
 * This script verifies that your Resend API key is configured correctly
 * and can send emails successfully.
 */

import { Resend } from "resend";

async function testEmail() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.error("❌ RESEND_API_KEY is not set in .env.local");
    console.error("   1. Go to https://resend.com/api-keys");
    console.error("   2. Create a new API key");
    console.error("   3. Add RESEND_API_KEY=re_xxxxx to .env.local");
    process.exit(1);
  }

  if (!apiKey.startsWith("re_")) {
    console.error("❌ RESEND_API_KEY must start with 're_'");
    console.error(`   Current value: ${apiKey.substring(0, 10)}...`);
    process.exit(1);
  }

  const resend = new Resend(apiKey);

  console.log("🚀 Attempting to send test email...\n");

  try {
    const response = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: process.env.CONTACT_EMAIL || "admin@agenthub.guru",
      subject: "🎉 Agent Hub Guru - Email System Test",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">✅ Email System is Working!</h2>
          <p>This is a test email from Agent Hub Guru.</p>
          <p style="color: #666; margin-top: 20px;">
            <strong>API Key Status:</strong> ✓ Valid<br/>
            <strong>Email Service:</strong> ✓ Operational<br/>
            <strong>Timestamp:</strong> ${new Date().toISOString()}
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 12px;">
            You can now receive emails from your Agent Hub Guru contact form.
          </p>
        </div>
      `,
    });

    if (response.data?.id) {
      console.log("✅ SUCCESS! Email sent successfully");
      console.log(`   Email ID: ${response.data.id}`);
      console.log(`   To: ${process.env.CONTACT_EMAIL || "admin@agenthub.guru"}`);
      console.log("\n🎉 Your email system is ready to use!");
    } else if (response.error) {
      console.error("❌ Error sending email:");
      console.error(response.error);
    }
  } catch (error) {
    console.error("❌ Failed to send test email:");
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

testEmail();
