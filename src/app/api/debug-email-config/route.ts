import { NextResponse } from 'next/server';
import { emailConfig, isEmailConfigured } from '@/lib/emailConfig';
import nodemailer from 'nodemailer';

// Helper function to safely get and trim environment variables
function getEnv(key: string, defaultValue: string = ''): string {
  const value = process.env[key];
  return value ? value.trim() : defaultValue;
}

// Define proper types for our results
type EmailTestSuccess = {
  success: true;
  messageId: string;
  response: string;
  envelope: any;
}

type EmailTestError = {
  success: false;
  error: string;
  code?: string;
  command?: string;
  responseCode?: number;
  response?: string;
  stack?: string;
}

type EmailTestResult = EmailTestSuccess | EmailTestError | { success: false; error: string };

type VerifySuccess = {
  success: true;
  message: string;
  details: any;
}

type VerifyError = {
  success: false;
  error: string;
  code?: string;
  command?: string;
  responseCode?: number;
  response?: string;
  stack?: string;
}

type VerifyResult = VerifySuccess | VerifyError | { success: false; error: string };

export async function GET() {
  try {
    // Get environment variables for debugging
    const envVars = {
      SMTP_HOST: getEnv('EMAIL_SMTP_HOST', '(not set)'),
      SMTP_PORT: getEnv('EMAIL_SMTP_PORT', '(not set)'),
      SMTP_SECURE: getEnv('EMAIL_SMTP_SECURE', '(not set)'),
      SMTP_USER: getEnv('EMAIL_SMTP_USER', '(not set)'),
      SMTP_PASSWORD: getEnv('EMAIL_SMTP_PASSWORD') ? '(set but hidden)' : '(not set)',
      FROM: getEnv('EMAIL_FROM', '(not set)'),
      RECIPIENTS: getEnv('EMAIL_ALERT_RECIPIENTS', '(not set)'),
      THRESHOLD: getEnv('EMAIL_ALERT_THRESHOLD_MINUTES', '(not set)')
    };
    
    // Get the actual config that's being used
    const actualConfig = {
      smtp: {
        host: emailConfig.smtp.host,
        port: emailConfig.smtp.port,
        secure: emailConfig.smtp.secure,
        auth: {
          user: emailConfig.smtp.auth.user ? '(set but hidden)' : '(not set)',
          pass: emailConfig.smtp.auth.pass ? '(set but hidden)' : '(not set)',
        }
      },
      from: emailConfig.from,
      alertRecipients: emailConfig.alertRecipients,
      alertThresholdMinutes: emailConfig.alertThresholdMinutes,
      isConfigured: isEmailConfigured()
    };
    
    // Test email sending functionality
    let emailTestResult: EmailTestResult = { success: false, error: "Not attempted" };
    let verifyResult: VerifyResult = { success: false, error: "Not attempted" };
    
    try {
      // Step 1: Create a transporter
      const transporter = nodemailer.createTransport({
        host: emailConfig.smtp.host,
        port: emailConfig.smtp.port,
        secure: emailConfig.smtp.secure,
        auth: {
          user: emailConfig.smtp.auth.user,
          pass: emailConfig.smtp.auth.pass,
        },
        tls: {
          rejectUnauthorized: false
        },
        debug: true // Enable debug output
      });
      
      // Step 2: Verify the connection
      try {
        const verified = await transporter.verify();
        verifyResult = {
          success: true,
          message: "Connection verified successfully",
          details: verified
        };
      } catch (verifyError) {
        verifyResult = {
          success: false,
          error: verifyError instanceof Error ? verifyError.message : "Unknown error during verification",
          code: (verifyError as any)?.code,
          command: (verifyError as any)?.command,
          responseCode: (verifyError as any)?.responseCode,
          response: (verifyError as any)?.response,
          stack: verifyError instanceof Error ? verifyError.stack : undefined
        };
      }
      
      // Only try to send if verification was successful
      if (verifyResult.success) {
        // Step 3: Try to send a test email
        try {
          const result = await transporter.sendMail({
            from: emailConfig.from,
            to: emailConfig.alertRecipients.join(','),
            subject: "Test Email from Museum IoT Debug Endpoint",
            text: "This is a test email from the Museum IoT debug endpoint.",
            html: "<p>This is a test email from the Museum IoT debug endpoint.</p>",
          });
          
          emailTestResult = {
            success: true,
            messageId: result.messageId,
            response: result.response,
            envelope: result.envelope
          };
        } catch (sendError) {
          emailTestResult = {
            success: false,
            error: sendError instanceof Error ? sendError.message : "Unknown error sending email",
            code: (sendError as any)?.code,
            command: (sendError as any)?.command,
            responseCode: (sendError as any)?.responseCode,
            response: (sendError as any)?.response,
            stack: sendError instanceof Error ? sendError.stack : undefined
          };
        }
      }
    } catch (transporterError) {
      emailTestResult = {
        success: false,
        error: transporterError instanceof Error ? transporterError.message : "Error creating transporter",
        stack: transporterError instanceof Error ? transporterError.stack : undefined
      };
    }

    // Return the config info and test results for debugging
    return NextResponse.json({
      success: true,
      environment: envVars,
      config: actualConfig,
      nodeEnv: process.env.NODE_ENV || '(not set)',
      platform: process.env.VERCEL ? 'Vercel' : 'Local',
      emailVerifyResult: verifyResult,
      emailTestResult: emailTestResult
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 