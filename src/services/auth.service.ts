import { sha256Hex } from "@/lib/crypto";
import { ConflictError, UnauthorizedError } from "@/lib/errors";
import {
  getAccessTokenTtlSeconds,
  getRefreshTokenTtlMs,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "@/lib/jwt";
import { hashPassword, verifyPassword } from "@/lib/password";
import { sessionRepository } from "@/repositories/session.repository";
import { userRepository } from "@/repositories/user.repository";
import type { SignupInput, LoginInput } from "@/schemas/auth.schema";
import type { AuthUser } from "@/types/auth";

const AVATAR_PALETTE = [
  "#6366F1",
  "#8B5CF6",
  "#EC4899",
  "#F59E0B",
  "#10B981",
  "#06B6D4",
  "#EF4444",
];

function pickAvatarColor(seed: string): string {
  const index =
    seed.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
    AVATAR_PALETTE.length;
  return AVATAR_PALETTE[index] ?? "#6366F1";
}

function toAuthUser(user: {
  id: string;
  email: string;
  name: string;
  avatarColor: string;
}): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarColor: user.avatarColor,
  };
}

interface RequestContext {
  ipAddress?: string | null;
  userAgent?: string | null;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenTtlSeconds: number;
  refreshTokenTtlMs: number;
}

async function issueTokenPair(
  user: AuthUser,
  context: RequestContext,
): Promise<TokenPair> {
  const accessToken = await signAccessToken({
    sub: user.id,
    email: user.email,
    name: user.name,
  });

  const sessionId = crypto.randomUUID();
  const refreshToken = await signRefreshToken({ sub: user.id, sessionId });
  const refreshTokenHash = await sha256Hex(refreshToken);

  await sessionRepository.create({
    userId: user.id,
    refreshTokenHash,
    userAgent: context.userAgent,
    ipAddress: context.ipAddress,
    expiresAt: new Date(Date.now() + getRefreshTokenTtlMs()),
  });

  return {
    accessToken,
    refreshToken,
    accessTokenTtlSeconds: getAccessTokenTtlSeconds(),
    refreshTokenTtlMs: getRefreshTokenTtlMs(),
  };
}

export const authService = {
  async signup(input: SignupInput, context: RequestContext) {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictError("An account with this email already exists.");
    }

    const passwordHash = await hashPassword(input.password);
    const user = await userRepository.create({
      name: input.name,
      email: input.email,
      passwordHash,
      avatarColor: pickAvatarColor(input.email),
    });

    const authUser = toAuthUser(user);
    const tokens = await issueTokenPair(authUser, context);
    return { user: authUser, tokens };
  },

  async login(input: LoginInput, context: RequestContext) {
    const user = await userRepository.findByEmail(input.email);
    if (!user) throw new UnauthorizedError("Invalid email or password.");

    const validPassword = await verifyPassword(input.password, user.passwordHash);
    if (!validPassword) throw new UnauthorizedError("Invalid email or password.");

    const authUser = toAuthUser(user);
    const tokens = await issueTokenPair(authUser, context);
    return { user: authUser, tokens };
  },

  async refresh(refreshToken: string, context: RequestContext) {
    let claims;
    try {
      claims = await verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedError("Your session has expired. Please log in again.");
    }

    const refreshTokenHash = await sha256Hex(refreshToken);
    const session = await sessionRepository.findByRefreshTokenHash(refreshTokenHash);

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt < new Date() ||
      session.userId !== claims.sub
    ) {
      throw new UnauthorizedError("Your session has expired. Please log in again.");
    }

    const user = await userRepository.findById(claims.sub);
    if (!user) throw new UnauthorizedError("Account no longer exists.");

    // Rotate: revoke the old session and issue a brand-new refresh token so
    // a stolen (but not-yet-used) refresh token becomes worthless.
    await sessionRepository.revoke(session.id);

    const authUser = toAuthUser(user);
    const tokens = await issueTokenPair(authUser, context);
    return { user: authUser, tokens };
  },

  async logout(refreshToken: string | undefined) {
    if (!refreshToken) return;
    try {
      const refreshTokenHash = await sha256Hex(refreshToken);
      const session = await sessionRepository.findByRefreshTokenHash(refreshTokenHash);
      if (session) await sessionRepository.revoke(session.id);
    } catch {
      // Best-effort: an already-invalid token is not an error on logout.
    }
  },

  async me(userId: string): Promise<AuthUser> {
    const user = await userRepository.findById(userId);
    if (!user) throw new UnauthorizedError();
    return toAuthUser(user);
  },
};
