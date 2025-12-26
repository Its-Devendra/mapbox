import { NextResponse } from "next/server";
import { verifyToken } from "./lib/auth";
import { Rewind } from "lucide-react";

export function middleware(request) {
    const { pathname } = request.nextUrl;
    const token = request.cookies.get("admin_token")?.value;

    // Only protect /admin routes (except login)

    if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
        if (!token || !verifyToken) {
            return NextResponse.redirect(new URL('/admin/login', request.url))
        }
    }

    // Redirect logged-in users away from login page
    if (pathname === '/admin/login' && token && verifyToken(token)) {
        return NextResponse.redirect(new URL('/admin', request.url));
    }
    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*'],
};