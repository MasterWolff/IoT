import nodemailer from 'nodemailer';
import { emailConfig, isEmailConfigured } from './emailConfig';
import { format } from 'date-fns';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Track the last time an alert was sent for a specific painting
const lastAlertSent: Record<string, Date> = {};

export interface AlertInfo {
  id: string;
  paintingId: string;
  paintingName: string;
  artist: string;
  measurement: {
    type: 'temperature' | 'humidity' | 'illuminance' | 'co2' | 'air_pressure' | 'mold_risk_level';
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

export async function sendAlertEmail(alert: AlertInfo): Promise<boolean> {
  console.log('📧 EMAIL SERVICE: Attempting to send alert email for', {
    paintingName: alert.paintingName,
    measurementType: alert.measurement.type,
    value: alert.measurement.value,
    timestamp: alert.timestamp
  });
  
  // Check if email is configured
  if (!isEmailConfigured()) {
    console.error('📧 EMAIL SERVICE: Email configuration is incomplete. Cannot send alert email.');
    console.error('📧 EMAIL SERVICE: Missing email configuration values:', {
      host: !!emailConfig.smtp.host,
      port: !!emailConfig.smtp.port,
      authUser: !!emailConfig.smtp.auth.user,
      authPass: !!emailConfig.smtp.auth.pass,
      from: !!emailConfig.from,
      recipients: emailConfig.alertRecipients.length > 0
    });
    return false;
  }

  console.log('📧 EMAIL SERVICE: Email configuration is valid');
  
  // Check for rate limiting - don't send too many emails for the same painting
  const now = new Date();
  const lastSent = lastAlertSent[alert.paintingId];
  const thresholdMinutes = emailConfig.alertThresholdMinutes;
  
  if (lastSent) {
    const minutesSinceLastAlert = (now.getTime() - lastSent.getTime()) / (1000 * 60);
    if (minutesSinceLastAlert < thresholdMinutes) {
      console.log(`📧 EMAIL SERVICE: Skipping alert email for ${alert.paintingName}: last email was sent ${minutesSinceLastAlert.toFixed(1)} minutes ago (threshold: ${thresholdMinutes} minutes)`);
      return false;
    }
  }

  console.log('📧 EMAIL SERVICE: Email not rate-limited, proceeding with sending');
  
  try {
    // Create a transporter
    console.log('📧 EMAIL SERVICE: Creating email transporter with config:', {
      host: emailConfig.smtp.host,
      port: emailConfig.smtp.port,
      secure: emailConfig.smtp.secure,
      user: emailConfig.smtp.auth.user ? '(set)' : '(not set)',
      pass: emailConfig.smtp.auth.pass ? '(set)' : '(not set)'
    });
    
    const transporter = nodemailer.createTransport(emailConfig.smtp);
    
    // Verify connection configuration
    try {
      console.log('📧 EMAIL SERVICE: Verifying email connection...');
      await transporter.verify();
      console.log('📧 EMAIL SERVICE: Email connection verified successfully');
    } catch (verifyError) {
      console.error('📧 EMAIL SERVICE: Email connection verification failed:', verifyError);
      throw verifyError;
    }

    // Format the timestamp
    const formattedTime = format(new Date(alert.timestamp), 'PPpp');
    
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
    
    // Log email recipients
    console.log('📧 EMAIL SERVICE: Sending email to recipients:', emailConfig.alertRecipients);
    console.log('📧 EMAIL SERVICE: Email subject:', subject);
    
    // Compose email body
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
          <td style="border: 1px solid #ddd; padding: 8px;">${formattedTime}</td>
        </tr>
        ${alert.location ? `
        <tr>
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Location</th>
          <td style="border: 1px solid #ddd; padding: 8px;">${alert.location}</td>
        </tr>` : ''}
      </table>
      
      <h3>Recommended Action</h3>
      <p>Please check the environmental control systems in the affected area and make appropriate adjustments.</p>
      
      <p style="font-size: 0.9em; color: #666;">
        This is an automated message from the Art Collection Monitoring System. 
        Log in to the dashboard for more detailed information.
      </p>
    `;
    
    // Plain text version as fallback
    const textBody = `
      Environmental Alert for Museum Artwork
      
      Artwork: ${alert.paintingName} by ${alert.artist}
      Issue: ${alertType.toUpperCase()} ${alert.measurement.type}: ${alert.measurement.value} ${alert.measurement.unit} (should be ${thresholdInfo})
      Time Detected: ${formattedTime}
      ${alert.location ? `Location: ${alert.location}` : ''}
      
      Recommended Action:
      Please check the environmental control systems in the affected area and make appropriate adjustments.
      
      This is an automated message from the Art Collection Monitoring System.
    `;
    
    // Send email
    console.log('📧 EMAIL SERVICE: Attempting to send email now...');
    try {
      const result = await transporter.sendMail({
        from: emailConfig.from,
        to: emailConfig.alertRecipients.join(','),
        subject,
        text: textBody,
        html: htmlBody,
      });
      
      console.log(`📧 EMAIL SERVICE: Alert email sent successfully: ${result.messageId}`);
      console.log('📧 EMAIL SERVICE: Email delivery info:', result.response);
      
      // Record the email sent time to avoid spamming
      lastAlertSent[alert.paintingId] = now;
      
      // Also store this alert in the database for record-keeping
      await recordAlertNotification(alert);
      console.log(`📧 EMAIL SERVICE: Alert notification recorded in database for ${alert.paintingName}`);
      
      return true;
    } catch (sendError) {
      console.error('📧 EMAIL SERVICE: Failed to send email:', sendError);
      if (sendError instanceof Error) {
        console.error('📧 EMAIL SERVICE: Error details:', sendError.message);
        if ('code' in sendError) {
          console.error('📧 EMAIL SERVICE: Error code:', (sendError as any).code);
        }
      }
      return false;
    }
  } catch (error) {
    console.error('📧 EMAIL SERVICE: Failed during email preparation:', error);
    if (error instanceof Error) {
      console.error('📧 EMAIL SERVICE: Error message:', error.message);
      console.error('📧 EMAIL SERVICE: Error stack:', error.stack);
    }
    return false;
  }
}

// Record that we sent an alert notification in the database
async function recordAlertNotification(alert: AlertInfo) {
  try {
    const { error } = await supabase
      .from('alert_notifications')
      .insert({
        environmental_data_id: alert.id,
        painting_id: alert.paintingId,
        measurement_type: alert.measurement.type,
        measurement_value: alert.measurement.value,
        notification_type: 'email',
        sent_at: new Date().toISOString(),
        recipients: emailConfig.alertRecipients.join(','),
      });
    
    if (error) {
      console.error('Error recording alert notification:', error);
    }
  } catch (error) {
    console.error('Failed to record alert notification:', error);
  }
} 