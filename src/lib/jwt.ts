import { jwtVerify, SignJWT } from "jose";

import { getEnv } from "@/config/env";
import type { AccessTokenClaims, RefreshTokenClaims } from "@/types/auth";

/**
 * `jose` is used (instead of `jsonwebtoken`) because it runs identically in
 * the Edge runtime (middleware, used for fast route protection) and in
 * Node.js route handlers — one implementation, no runtime surprises.
 */

function toSecretKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

function parseDurationToSeconds(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration);
  if (!match) return 900; // 15m fallback
  const value = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return value * (multipliers[unit as string] ?? 1);
}

export async function signAccessToken(claims: Omit<AccessTokenClaims, "type">) {
  const env = getEnv();
  const ttlSeconds = parseDurationToSeconds(env.AUTH_ACCESS_TOKEN_TTL);
  return new SignJWT({ ...claims, type: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .setSubject(claims.sub)
    .sign(toSecretKey(env.AUTH_ACCESS_TOKEN_SECRET));
}

export async function signRefreshToken(claims: Omit<RefreshTokenClaims, "type">) {
  const env = getEnv();
  const ttlSeconds = parseDurationToSeconds(env.AUTH_REFRESH_TOKEN_TTL);
  return new SignJWT({ ...claims, type: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .setSubject(claims.sub)
    .sign(toSecretKey(env.AUTH_REFRESH_TOKEN_SECRET));
}

export async function verifyAccessToken(token: string): Promise<AccessTokenClaims> {
  const env = getEnv();
  const { payload } = await jwtVerify(token, toSecretKey(env.AUTH_ACCESS_TOKEN_SECRET));
  if (payload.type !== "access") throw new Error("Not an access token");
  return payload as unknown as AccessTokenClaims;
}

export async function verifyRefreshToken(token: string): Promise<RefreshTokenClaims> {
  const env = getEnv();
  const { payload } = await jwtVerify(token, toSecretKey(env.AUTH_REFRESH_TOKEN_SECRET));
  if (payload.type !== "refresh") throw new Error("Not a refresh token");
  return payload as unknown as RefreshTokenClaims;
}

export function getRefreshTokenTtlMs(): number {
  const env = getEnv();
  return parseDurationToSeconds(env.AUTH_REFRESH_TOKEN_TTL) * 1000;
}

export function getAccessTokenTtlSeconds(): number {
  return parseDurationToSeconds(getEnv().AUTH_ACCESS_TOKEN_TTL);
}
