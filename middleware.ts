import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const secret = new TextEncoder().encode('H9/XjTxZqztR2JuuUEesh+47ccxJu21xDWHPnazFuZI=');

export async function middleware(req: NextRequest) {
  const sessionToken = req.cookies.get('session_token')?.value;

  if (req.nextUrl.pathname.startsWith('/dashboard')) {
    if (!sessionToken) {
      return NextResponse.redirect(new URL('/', req.url));
    }

    try {
      await jwtVerify(sessionToken, secret);
      return NextResponse.next();
    } catch {
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
}; 