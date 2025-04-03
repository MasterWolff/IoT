import nodemailer from 'nodemailer';
import { emailConfig } from './emailConfig';

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendAlertEmail(options: EmailOptions): Promise<boolean> {
  try {
    // Check if email is configured
    if (!emailConfig.smtp || !emailConfig.smtp.host || !emailConfig.smtp.auth.user) {
      console.warn('Email not configured. Cannot send alert email.');
      return false;
    }
    
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: emailConfig.smtp.host,
      port: emailConfig.smtp.port || 587,
      secure: emailConfig.smtp.secure || false,
      auth: {
        user: emailConfig.smtp.auth.user,
        pass: emailConfig.smtp.auth.pass,
      },
    });
    
    // Send email
    const result = await transporter.sendMail({
      from: emailConfig.from || `"Museum IoT System" <${emailConfig.smtp.auth.user}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    
    console.log('Email sent:', result.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
} 