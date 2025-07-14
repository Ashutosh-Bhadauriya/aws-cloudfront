import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";

const secret = new TextEncoder().encode(
  "H9/XjTxZqztR2JuuUEesh+47ccxJu21xDWHPnazFuZI="
);

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (email === "ashutoshb455@gmail.com" && password === "password") {
    // Correct credentials
    const token = await new SignJWT({ email })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(secret);

    // Use the Host header to get the correct public URL
    // Handle both CloudFront and direct ALB access
    const referer = req.headers.get('referer');
    const cloudFrontHost = 'd3w0aux8k6z2b9.cloudfront.net';
    
    // Check if request came from CloudFront by looking at referer or CloudFront headers
    const isFromCloudFront = referer?.includes(cloudFrontHost) || 
                            req.headers.get('cloudfront-forwarded-proto') ||
                            req.headers.get('x-forwarded-proto') === 'https';
    
    let host, protocol;
    if (isFromCloudFront) {
      host = cloudFrontHost;
      protocol = 'https';
    } else {
      host = req.headers.get('host') || 'localhost:3000';
      protocol = req.headers.get('x-forwarded-proto') || 
                req.headers.get('cloudfront-forwarded-proto') || 
                'http';
    }
    
    const publicUrl = `${protocol}://${host}`;
    
    console.log(`Redirecting to dashboard from host: ${host}, protocol: ${protocol}, referer: ${referer}`);
    
    const response = NextResponse.redirect(new URL("/dashboard", publicUrl), {
      status: 303, // See Other
    });
    
    response.cookies.set("session_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60, // 1 hour
      path: "/",
    });

    return response;
  } else {
    // Incorrect credentials
    const referer = req.headers.get('referer');
    const cloudFrontHost = 'd3w0aux8k6z2b9.cloudfront.net';
    
    // Check if request came from CloudFront by looking at referer or CloudFront headers
    const isFromCloudFront = referer?.includes(cloudFrontHost) || 
                            req.headers.get('cloudfront-forwarded-proto') ||
                            req.headers.get('x-forwarded-proto') === 'https';
    
    let host, protocol;
    if (isFromCloudFront) {
      host = cloudFrontHost;
      protocol = 'https';
    } else {
      host = req.headers.get('host') || 'localhost:3000';
      protocol = req.headers.get('x-forwarded-proto') || 
                req.headers.get('cloudfront-forwarded-proto') || 
                'http';
    }
    
    const publicUrl = `${protocol}://${host}`;
    
    console.log(`Redirecting to home due to invalid credentials from host: ${host}, referer: ${referer}`);
    return NextResponse.redirect(new URL("/", publicUrl));
  }
} 