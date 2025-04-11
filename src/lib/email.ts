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
    
    console.log('Creating email transporter with config:', {
      host: emailConfig.smtp.host,
      port: emailConfig.smtp.port,
      secure: emailConfig.smtp.secure
    });
    
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: emailConfig.smtp.host,
      port: emailConfig.smtp.port || 587,
      secure: emailConfig.smtp.secure || false,
      auth: {
        user: emailConfig.smtp.auth.user,
        pass: emailConfig.smtp.auth.pass,
      },
      tls: {
        // Do not fail on invalid certs
        rejectUnauthorized: false
      }
    });
    
    // Verify connection configuration
    try {
      console.log('Verifying email connection...');
      await transporter.verify();
      console.log('Email connection verified successfully');
    } catch (verifyError) {
      console.error('Email connection verification failed:', verifyError);
      throw verifyError;
    }
    
    console.log(`Sending email to ${options.to} with subject: ${options.subject}`);
    
    // Send email
    const result = await transporter.sendMail({
      from: emailConfig.from || `"Museum IoT System" <${emailConfig.smtp.auth.user}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    
    console.log('Email sent successfully:', result.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      if ('code' in error) {
        console.error('Error code:', (error as any).code);
      }
    }
    return false;
  }
} 