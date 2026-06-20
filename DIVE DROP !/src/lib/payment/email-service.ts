import { Resend } from 'resend';
import { PackageDetail, EmailConfirmationData } from '@/types/payment';
import { PackageConfirmationEmail } from '@/components/email/PackageConfirmationEmail';
import React from 'react';

/**
 * Email service - handles sending confirmation emails via Resend
 */

const resend = new Resend(process.env.RESEND_API_KEY);

// Development sender (during onboarding)
const SENDER_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

export interface EmailSendResult {
  success: boolean;
  message_id?: string;
  error?: string;
}

/**
 * Send package confirmation email to customer
 */
export async function sendPackageConfirmationEmail(packageDetail: PackageDetail): Promise<EmailSendResult> {
  try {
    // Validate package is completed
    if (packageDetail.status !== 'completed') {
      return {
        success: false,
        error: 'Package must be completed before sending confirmation email',
      };
    }

    // Validate customer email exists
    if (!packageDetail.customer?.email) {
      return {
        success: false,
        error: 'Customer email not found',
      };
    }

    // Prepare email data
    const emailData: EmailConfirmationData = {
      customer_name: packageDetail.customer.first_name || 'Customer',
      customer_email: packageDetail.customer.email,
      package_id: packageDetail.id,
      items: packageDetail.items.map(item => ({
        service_name: item.service_name,
        provider_name: 'Provider', // Will be fetched from provider_id in real implementation
        price: item.price,
      })),
      total_amount: packageDetail.total_amount,
      created_at: packageDetail.created_at,
      providers: [], // Will be populated with provider details
    };

    // Render email component as HTML
    const emailHtml = React.renderToString(
      React.createElement(PackageConfirmationEmail, { data: emailData })
    );

    // Send email via Resend
    const response = await resend.emails.send({
      from: SENDER_EMAIL,
      to: packageDetail.customer.email,
      subject: 'הצלילה שלך מאושרת ✅ - DiveDrop',
      html: emailHtml,
    });

    if (response.error) {
      console.error('Email send error:', response.error);
      return {
        success: false,
        error: response.error.message,
      };
    }

    console.log(`✅ Package confirmation email sent to ${packageDetail.customer.email}`);

    return {
      success: true,
      message_id: response.data?.id,
    };
  } catch (error) {
    console.error('Error in sendPackageConfirmationEmail:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send test email (for development)
 */
export async function sendTestEmail(to: string): Promise<EmailSendResult> {
  try {
    const response = await resend.emails.send({
      from: SENDER_EMAIL,
      to,
      subject: 'Test Email - DiveDrop',
      html: '<h1>This is a test email from DiveDrop</h1>',
    });

    if (response.error) {
      return {
        success: false,
        error: response.error.message,
      };
    }

    return {
      success: true,
      message_id: response.data?.id,
    };
  } catch (error) {
    console.error('Error in sendTestEmail:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
