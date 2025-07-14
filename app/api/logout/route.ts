import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // Create response that redirects to home page
  const response = NextResponse.redirect(new URL("/", req.url), {
    status: 303, // See Other
  });
  
  // Clear the session cookie
  response.cookies.set("session_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 0, // Expire immediately
    path: "/",
  });

  // Clear the auth_username cookie used by CloudFront lambdas
  response.cookies.set("auth_username", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 0, // Expire immediately
    path: "/",
  });

  // Clear the auth_challenge cookie used by CloudFront lambdas
  response.cookies.set("auth_challenge", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 0, // Expire immediately
    path: "/",
  });

  return response;
} 