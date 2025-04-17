import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    // Parameters for the token request
    const params = {
      grant_type: "client_credentials",
      client_id: "9Jw0vR0nlmbiglWl1Xd1WAWKH348vpV4",
      client_secret: "JQD5lFjHRRrBkjRP6JN7pxzVYIAqbCLCtwgWoDs78FFzrs2dHEP5CZmhUWTsECNf",
      audience: "https://api2.arduino.cc/iot"
    };
    
    console.log(`Testing direct token request with credentials: ID=${params.client_id.substring(0, 8)}...`);
    console.log(`Token request URL: https://api.arduino.cc/iot/v1/clients/token`);
    console.log(`Token request parameters: grant_type=${params.grant_type}, audience=${params.audience}`);
    
    // Direct token request
    const tokenResponse = await fetch("https://api.arduino.cc/iot/v1/clients/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(params).toString(),
    });
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Direct token request failed:", errorText);
      return NextResponse.json(
        { error: `Token request failed: ${tokenResponse.status} ${tokenResponse.statusText}`, details: errorText },
        { status: tokenResponse.status }
      );
    }
    
    const tokenData = await tokenResponse.json();
    console.log("Successfully obtained token:", {
      token_type: tokenData.token_type,
      expires_in: tokenData.expires_in,
      token_length: tokenData.access_token?.length || 0,
    });
    
    // Attempt to list things with the token
    const thingsResponse = await fetch("https://api.arduino.cc/iot/v1/things", {
      headers: {
        "Authorization": `Bearer ${tokenData.access_token}`
      }
    });
    
    if (!thingsResponse.ok) {
      const errorText = await thingsResponse.text();
      console.error("Things request failed:", errorText);
      return NextResponse.json(
        { 
          token: { token_type: tokenData.token_type, expires_in: tokenData.expires_in },
          things_error: `Things request failed: ${thingsResponse.status} ${thingsResponse.statusText}`, 
          details: errorText 
        },
        { status: 200 }
      );
    }
    
    const thingsData = await thingsResponse.json();
    console.log(`Successfully fetched ${thingsData.length || 0} things`);
    
    return NextResponse.json({
      success: true,
      token: {
        token_type: tokenData.token_type,
        expires_in: tokenData.expires_in,
      },
      things_count: thingsData.length || 0,
      things: thingsData
    });
  } catch (error: any) {
    console.error("Direct test error:", error);
    return NextResponse.json(
      { error: error.message || "Direct test failed" },
      { status: 500 }
    );
  }
} 