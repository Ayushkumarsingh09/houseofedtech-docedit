import type { NextResponse } from "next/server";

import { COOKIE_NAMES } from "@/constants";
import { getAccessTokenTtlSeconds, getRefreshTokenTtlMs } from "@/lib/jwt";
import { isProduction } from "@/config/env";

interface TokenPairLike {
  accessToken: string;
  refreshToken: string;
}

export function setAuthCookies(response: NextResponse, tokens: TokenPairLike): void {
  const secure = isProduction();

  response.cookies.set(COOKIE_NAMES.ACCESS_TOKEN, tokens.accessToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: getAccessTokenTtlSeconds(),
  });

  response.cookies.set(COOKIE_NAMES.REFRESH_TOKEN, tokens.refreshToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/api/auth",
    maxAge: Math.floor(getRefreshTokenTtlMs() / 1000),
  });
}

export function clearAuthCookies(response: NextResponse): void {
  response.cookies.set(COOKIE_NAMES.ACCESS_TOKEN, "", { path: "/", maxAge: 0 });
  response.cookies.set(COOKIE_NAMES.REFRESH_TOKEN, "", { path: "/api/auth", maxAge: 0 });
}
