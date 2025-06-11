import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";

const secret = new TextEncoder().encode(
  "H9/XjTxZqztR2JuuUEesh+47ccxJu21xDWHPnazFuZI="
);

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (email === "test@example.com" && password === "password") {
    // Correct credentials
    const token = await new SignJWT({ email })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(secret);

    const response = NextResponse.redirect(new URL("/dashboard", req.url));
    
    response.cookies.set("session_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60, // 1 hour
      path: "/",
    });

    return response;
  } else {
    // Incorrect credentials
    return NextResponse.redirect(new URL("/", req.url));
  }
} 