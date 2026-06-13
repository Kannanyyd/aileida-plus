import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * 简易 Admin 鉴权中间件
 *
 * MVP 阶段使用 ADMIN_PASSWORD 环境变量进行 Basic Auth 风格鉴权。
 * 后续可替换为 JWT / OAuth / NextAuth 等方案。
 */

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin123";

export function adminAuth(request: NextRequest): NextResponse | null {
  // 仅在 /admin 路径下生效
  if (!request.nextUrl.pathname.startsWith("/admin")) return null;

  const authCookie = request.cookies.get("admin_auth");
  if (authCookie?.value === ADMIN_PASSWORD) return null;

  // 检查 URL 参数（简化版鉴权，MVP 使用）
  const urlParam = request.nextUrl.searchParams.get("auth");
  if (urlParam === ADMIN_PASSWORD) {
    const res = NextResponse.redirect(new URL(request.nextUrl.pathname, request.url));
    res.cookies.set("admin_auth", ADMIN_PASSWORD, {
      httpOnly: true,
      maxAge: 86400, // 24h
      path: "/",
    });
    return res;
  }

  const url = new URL("/admin-login", request.url);
  url.searchParams.set("redirect", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(url);
}
