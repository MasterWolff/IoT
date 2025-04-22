import nodemailer from 'nodemailer';
import { emailConfig } from './emailConfig';

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface AlertInfo {
  id: string;
  paintingId: string;
  paintingName: string;
  artist: string;
  measurement: {
    type: string;
    value: number;
    unit: string;
  };
  threshold: {
    lower: number | null;
    upper: number | null;
  };
  timestamp: string;
  location?: string;
}

// Track the last time an alert was sent for a specific painting
// This is stored in memory, and will reset when the server restarts
const lastAlertSent: Record<string, {
  time: Date,
  alertId: string
}> = {};

// Simple email function for direct email sending
export async function sendAlertEmail(options: EmailOptions | AlertInfo): Promise<boolean> {
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
    
    // Check if we're getting the AlertInfo or EmailOptions format
    if ('paintingId' in options) {
      // This is an AlertInfo object
      const alert = options as AlertInfo;
      
      // Check if we've sent an alert recently for this painting
      const now = new Date();
      const lastSent = lastAlertSent[alert.paintingId];
      const thresholdMinutes = emailConfig.alertThresholdMinutes;
      
      if (lastSent) {
        // Apply rate limiting
        const minutesSinceLastAlert = (now.getTime() - lastSent.time.getTime()) / (1000 * 60);
        if (minutesSinceLastAlert < thresholdMinutes) {
          console.log(`Skipping alert email for ${alert.paintingName}: last email was sent ${minutesSinceLastAlert.toFixed(1)} minutes ago (threshold: ${thresholdMinutes} minutes)`);
          return false;
        }
      }
      
      // Format the threshold information
      let thresholdInfo = '';
      if (alert.threshold.lower !== null && alert.threshold.upper !== null) {
        thresholdInfo = `between ${alert.threshold.lower} and ${alert.threshold.upper} ${alert.measurement.unit}`;
      } else if (alert.threshold.lower !== null) {
        thresholdInfo = `above ${alert.threshold.lower} ${alert.measurement.unit}`;
      } else if (alert.threshold.upper !== null) {
        thresholdInfo = `below ${alert.threshold.upper} ${alert.measurement.unit}`;
      }
      
      // Determine if it's a high or low alert
      let alertType = 'threshold breach';
      if (alert.threshold.upper !== null && alert.measurement.value > alert.threshold.upper) {
        alertType = 'high';
      } else if (alert.threshold.lower !== null && alert.measurement.value < alert.threshold.lower) {
        alertType = 'low';
      }
      
      // Compose email subject
      const subject = `ALERT: ${alertType.toUpperCase()} ${alert.measurement.type} for "${alert.paintingName}"`;
      
      // Compose email HTML body
      const htmlBody = `
        <h2>Environmental Alert for Museum Artwork</h2>
        <p>This is an automated alert about environmental conditions that may affect artwork preservation.</p>
        
        <table style="border-collapse: collapse; width: 100%;">
          <tr style="background-color: #f2f2f2;">
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Artwork</th>
            <td style="border: 1px solid #ddd; padding: 8px;">${alert.paintingName} by ${alert.artist}</td>
          </tr>
          <tr>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Issue</th>
            <td style="border: 1px solid #ddd; padding: 8px; color: red;">
              <strong>${alertType.toUpperCase()} ${alert.measurement.type.toUpperCase()}</strong>: 
              Current value is ${alert.measurement.value} ${alert.measurement.unit} (should be ${thresholdInfo})
            </td>
          </tr>
          <tr style="background-color: #f2f2f2;">
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Time Detected</th>
            <td style="border: 1px solid #ddd; padding: 8px;">${new Date(alert.timestamp).toLocaleString()}</td>
          </tr>
          ${alert.location ? `
          <tr>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Location</th>
            <td style="border: 1px solid #ddd; padding: 8px;">${alert.location}</td>
          </tr>` : ''}
        </table>
        
        <h3>Recommended Action</h3>
        <p>Please check the environmental control systems in the affected area and make appropriate adjustments.</p>
      `;
      
      // Plain text version as fallback
      const textBody = `
        Environmental Alert for Museum Artwork
        
        Artwork: ${alert.paintingName} by ${alert.artist}
        Issue: ${alertType.toUpperCase()} ${alert.measurement.type}: ${alert.measurement.value} ${alert.measurement.unit} (should be ${thresholdInfo})
        Time Detected: ${new Date(alert.timestamp).toLocaleString()}
        ${alert.location ? `Location: ${alert.location}` : ''}
        
        Recommended Action:
        Please check the environmental control systems in the affected area and make appropriate adjustments.
      `;
      
      console.log(`Sending alert email to ${emailConfig.alertRecipients.join(',')} with subject: ${subject}`);
      
      // Send email
      const result = await transporter.sendMail({
        from: emailConfig.from || `"Museum IoT System" <${emailConfig.smtp.auth.user}>`,
        to: emailConfig.alertRecipients.join(','),
        subject,
        text: textBody,
        html: htmlBody,
      });
      
      // Record the email sent time to avoid spamming
      lastAlertSent[alert.paintingId] = {
        time: now,
        alertId: alert.id
      };
      
      console.log('Alert email sent successfully:', result.messageId);
      return true;
    } else {
      // This is a simple EmailOptions object
      const emailOptions = options as EmailOptions;
      console.log(`Sending email to ${emailOptions.to} with subject: ${emailOptions.subject}`);
      
      // Send email
      const result = await transporter.sendMail({
        from: emailConfig.from || `"Museum IoT System" <${emailConfig.smtp.auth.user}>`,
        to: emailOptions.to,
        subject: emailOptions.subject,
        text: emailOptions.text,
        html: emailOptions.html,
      });
      
      console.log('Email sent successfully:', result.messageId);
      return true;
    }
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

// Clear rate limiting for a specific painting - used when alerts are dismissed
export async function clearRateLimitingForPainting(paintingId: string): Promise<void> {
  console.log(`📧 EMAIL SERVICE: Clearing rate limiting for painting ${paintingId}`);
  if (lastAlertSent[paintingId]) {
    delete lastAlertSent[paintingId];
  }
} 