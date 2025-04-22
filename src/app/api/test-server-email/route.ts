import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    console.log('📧 TEST-SERVER-EMAIL: Starting test email process...');
    
    // Create test alert data
    const testAlert = {
      id: 'test-' + Date.now().toString(),
      paintingId: 'test-painting',
      paintingName: 'Test Painting',
      artist: 'Test Artist',
      measurement: {
        type: 'temperature',
        value: 25.5,
        unit: '°C'
      },
      threshold: {
        lower: 20,
        upper: 24
      },
      timestamp: new Date().toISOString()
    };
    
    console.log('📧 TEST-SERVER-EMAIL: Calling the send-email API');
    
    // Call the send-email API endpoint
    const sendEmailResponse = await fetch(new URL('/api/send-email', request.url).toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        alert: testAlert
      })
    });
    
    const emailResult = await sendEmailResponse.json();
    
    // Return the result
    if (emailResult.success) {
      console.log('📧 TEST-SERVER-EMAIL: Test email sent successfully!');
      return NextResponse.json({
        success: true,
        message: 'Test email sent successfully!'
      });
    } else {
      console.error('📧 TEST-SERVER-EMAIL: Failed to send test email:', emailResult.error);
      return NextResponse.json({
        success: false,
        error: emailResult.error || 'Failed to send test email'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('📧 TEST-SERVER-EMAIL: Error in test endpoint:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 