// Email configuration settings
console.log('📧 EMAIL CONFIG: Loading email configuration...');

// Log environment variables for debugging (security-sensitive info is redacted)
console.log('📧 EMAIL CONFIG: Environment variables check:', {
  SMTP_HOST: process.env.EMAIL_SMTP_HOST ? 'SET' : 'NOT SET',
  SMTP_PORT: process.env.EMAIL_SMTP_PORT ? 'SET' : 'NOT SET',
  SMTP_SECURE: process.env.EMAIL_SMTP_SECURE ? 'SET' : 'NOT SET',
  SMTP_USER: process.env.EMAIL_SMTP_USER ? 'SET' : 'NOT SET',
  SMTP_PASSWORD: process.env.EMAIL_SMTP_PASSWORD ? (process.env.EMAIL_SMTP_PASSWORD.length > 0 ? 'SET' : 'EMPTY') : 'NOT SET',
  FROM: process.env.EMAIL_FROM ? 'SET' : 'NOT SET',
  RECIPIENTS: process.env.EMAIL_ALERT_RECIPIENTS ? 'SET' : 'NOT SET',
  THRESHOLD: process.env.EMAIL_ALERT_THRESHOLD_MINUTES ? 'SET' : 'NOT SET'
});

// Parse port with fallback
const smtpPort = process.env.EMAIL_SMTP_PORT ? parseInt(process.env.EMAIL_SMTP_PORT, 10) : 465;
// Parse secure flag with fallback
const smtpSecure = process.env.EMAIL_SMTP_SECURE === 'true';

// Create email config object
export const emailConfig = {
  // SMTP server settings
  smtp: {
    host: process.env.EMAIL_SMTP_HOST || 'mail.gmx.com',
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: process.env.EMAIL_SMTP_USER || '',
      pass: process.env.EMAIL_SMTP_PASSWORD || '',
    },
    // Add security settings for SSL connections
    tls: {
      // Do not fail on invalid certs
      rejectUnauthorized: false
    }
  },
  
  // Email settings
  from: process.env.EMAIL_FROM || 'museum-iot@example.com',
  
  // Recipients for alerts - ensure we filter out empty strings
  alertRecipients: (process.env.EMAIL_ALERT_RECIPIENTS || '').split(',').filter(Boolean),
  
  // Alert threshold (in minutes) to prevent notification spam
  // Only send a new alert email if the last one was sent more than this many minutes ago
  alertThresholdMinutes: parseInt(process.env.EMAIL_ALERT_THRESHOLD_MINUTES || '30'),
};

// Log the actual config values (with sensitive information redacted)
console.log('📧 EMAIL CONFIG: Configuration loaded:', {
  smtp: {
    host: emailConfig.smtp.host,
    port: emailConfig.smtp.port,
    secure: emailConfig.smtp.secure,
    auth: {
      user: emailConfig.smtp.auth.user ? '(set)' : '(not set)',
      pass: emailConfig.smtp.auth.pass ? '(set)' : '(not set)'
    }
  },
  from: emailConfig.from,
  alertRecipients: emailConfig.alertRecipients.length > 0 ? 
    emailConfig.alertRecipients.map(r => r.substring(0, 3) + '...') : 
    '(none)',
  alertThresholdMinutes: emailConfig.alertThresholdMinutes
});

// Validate if email configuration is properly set up
export function isEmailConfigured(): boolean {
  const isConfigured = Boolean(
    emailConfig.smtp.host && 
    emailConfig.smtp.port && 
    emailConfig.smtp.auth.user && 
    emailConfig.smtp.auth.pass && 
    emailConfig.from && 
    emailConfig.alertRecipients.length > 0
  );
  
  console.log(`📧 EMAIL CONFIG: Email configuration is ${isConfigured ? 'VALID' : 'INVALID'}`);
  return isConfigured;
} 