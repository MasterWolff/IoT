// Email configuration settings

export const emailConfig = {
  // SMTP server settings
  smtp: {
    host: process.env.EMAIL_SMTP_HOST || 'smtp.example.com',
    port: parseInt(process.env.EMAIL_SMTP_PORT || '587'),
    secure: process.env.EMAIL_SMTP_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_SMTP_USER || '',
      pass: process.env.EMAIL_SMTP_PASSWORD || '',
    },
  },
  
  // Email settings
  from: process.env.EMAIL_FROM || 'art-monitoring@example.com',
  
  // Recipients for alerts
  alertRecipients: (process.env.EMAIL_ALERT_RECIPIENTS || '').split(',').filter(Boolean),
  
  // Alert threshold (in minutes) to prevent notification spam
  // Only send a new alert email if the last one was sent more than this many minutes ago
  alertThresholdMinutes: parseInt(process.env.EMAIL_ALERT_THRESHOLD_MINUTES || '30'),
};

// Validate if email configuration is properly set up
export function isEmailConfigured(): boolean {
  return Boolean(
    emailConfig.smtp.host && 
    emailConfig.smtp.port && 
    emailConfig.smtp.auth.user && 
    emailConfig.smtp.auth.pass && 
    emailConfig.from && 
    emailConfig.alertRecipients.length > 0
  );
} 