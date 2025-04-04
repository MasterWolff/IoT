# Setting up Email Alerts with GMX

Email alerts are an important part of the Museum IoT monitoring system. This guide explains how to set up the email notification service using GMX.

## GMX Account Setup

1. Create a GMX account at gmx.com or gmx.de
2. **Important**: Enable SMTP access in your GMX account:
   - Log in to your GMX account
   - Go to Settings > E-Mail > POP3/IMAP
   - Enable "POP3 und IMAP Zugriff erlauben" (Allow POP3 and IMAP access)
   - Click "Speichern" (Save)

## Environment Variables

Update your `.env.local` file with these settings:

```
# GMX Email Configuration
EMAIL_SMTP_HOST="smtp.gmx.de"
EMAIL_SMTP_PORT="465"
EMAIL_SMTP_SECURE="true"
EMAIL_SMTP_USER="your-account@gmx.de"
EMAIL_SMTP_PASSWORD="your-password"
EMAIL_FROM="your-account@gmx.de"
EMAIL_ALERT_RECIPIENTS="recipient1@example.com,recipient2@example.com"
EMAIL_ALERT_THRESHOLD_MINUTES="30"
```

## Testing Email Configuration

You can test if your email configuration is working by sending yourself an alert. 
Simply trigger an environmental condition that would cause an alert (like a temperature outside the acceptable range).

## Troubleshooting

If you encounter issues with email delivery:

1. Check your GMX account to ensure SMTP access is enabled
2. Verify your email and password are correct
3. For GMX.de accounts, make sure to use `smtp.gmx.de` as the host
4. Some networks block ports 465 or 587 - try using a different network
5. Check the server logs for detailed error messages 