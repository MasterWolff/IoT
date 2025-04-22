import { NextResponse } from 'next/server';
import { sendAlertEmail, AlertInfo } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate the request body
    if (!body || !body.alert) {
      return NextResponse.json(
        { error: 'Invalid request body - alert data is required' },
        { status: 400 }
      );
    }
    
    const alert: AlertInfo = body.alert;
    
    // Add additional validation if needed
    if (!alert.id || !alert.paintingId || !alert.paintingName) {
      return NextResponse.json(
        { error: 'Missing required alert fields' },
        { status: 400 }
      );
    }
    
    console.log('📧 SEND-EMAIL API: Sending alert email for', {
      paintingName: alert.paintingName,
      alertId: alert.id,
      type: alert.measurement.type
    });
    
    // Send the email using the server-side email service
    const emailSent = await sendAlertEmail(alert);
    
    if (emailSent) {
      console.log('📧 SEND-EMAIL API: Email sent successfully');
      return NextResponse.json({
        success: true,
        message: 'Email sent successfully'
      });
    } else {
      console.error('📧 SEND-EMAIL API: Failed to send email');
      return NextResponse.json({
        success: false,
        error: 'Failed to send email'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('📧 SEND-EMAIL API: Error sending email:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 