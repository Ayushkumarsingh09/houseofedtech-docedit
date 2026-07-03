import type { RoleName } from "@/constants";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarColor: string;
}

export interface AccessTokenClaims {
  sub: string;
  email: string;
  name: string;
  type: "access";
}

export interface RefreshTokenClaims {
  sub: string;
  sessionId: string;
  type: "refresh";
}

export interface DocumentRoleContext {
  documentId: string;
  role: RoleName;
}
