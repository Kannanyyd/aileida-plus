import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin123";

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (path.startsWith("/admin")) {
    const authCookie = request.cookies.get("admin_auth");
    if (authCookie?.value === ADMIN_PASSWORD) return NextResponse.next();

    const urlParam = request.nextUrl.searchParams.get("auth");
    if (urlParam === ADMIN_PASSWORD) {
      const res = NextResponse.redirect(new URL(path, request.url));
      res.cookies.set("admin_auth", ADMIN_PASSWORD, { httpOnly: true, maxAge: 86400, path: "/" });
      return res;
    }

    const loginUrl = new URL("/admin-login", request.url);
    loginUrl.searchParams.set("redirect", path);
    return NextResponse.redirect(loginUrl);
  }

  if (path.startsWith("/api/admin")) {
    const authCookie = request.cookies.get("admin_auth");
    if (authCookie?.value !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Admin authentication required" }, { status: 401 });
    }
    if (request.method !== "GET") {
      const ip = request.headers.get("x-forwarded-for") ?? "unknown";
      const key = `admin_api_rate_${ip}`;
      const lastSubmit = request.cookies.get(key);
      if (lastSubmit && Date.now() - parseInt(lastSubmit.value) < 2000) {
        return NextResponse.json({ error: "Too many admin operations, retry in a moment" }, { status: 429 });
      }
      const res = NextResponse.next();
      res.cookies.set(key, String(Date.now()), { maxAge: 2, path: "/api/admin" });
      return res;
    }
  }

  if (path === "/api/v1/reviews" && request.method === "POST") {
    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const key = `review_rate_${ip}`;
    const lastSubmit = request.cookies.get(key);
    if (lastSubmit) {
      const elapsed = Date.now() - parseInt(lastSubmit.value);
      if (elapsed < 60000) {
        return NextResponse.json({ error: "请勿频繁提交，每 60 秒限提交一次" }, { status: 429 });
      }
    }
    const res = NextResponse.next();
    res.cookies.set(key, String(Date.now()), { maxAge: 60, path: "/api/v1/reviews" });
    return res;
  }

  if (path === "/api/v1/recommend" && request.method === "POST") {
    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const key = `recommend_rate_${ip}`;
    const lastSubmit = request.cookies.get(key);
    if (lastSubmit) {
      const elapsed = Date.now() - parseInt(lastSubmit.value);
      if (elapsed < 10000) {
        return NextResponse.json({ error: "请勿频繁调用，每 10 秒限一次" }, { status: 429 });
      }
    }
    const res = NextResponse.next();
    res.cookies.set(key, String(Date.now()), { maxAge: 10, path: "/api/v1/recommend" });
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/api/v1/reviews", "/api/v1/recommend"],
};
