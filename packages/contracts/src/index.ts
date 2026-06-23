export type UserRole = "admin" | "user";

export type AuthSessionClaims = {
  sub: string;
  role: UserRole;
  sid: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type RegisterRequest = {
  name: string;
  email: string;
  password: string;
  inviteCode: string;
};

export type AuthResponse = {
  user: {
    uuid: string;
    name: string;
    email: string;
    role: UserRole;
    tokenPrefix: string;
  };
  accessToken: string;
  expiresIn: string;
};

export type LegacyRegisterPayload = {
  uuid: string;
  token: string;
  tokenPrefix: string;
};

export type LegacyLoginPayload = {
  uuid: string;
  name: string;
  email: string;
  token: string;
  tokenPrefix: string;
};

export type SubscriptionFormat =
  | "sing-box"
  | "clash"
  | "shadowrocket"
  | "surge";

export type SubscriptionResponse = {
  uuid: string;
  format: SubscriptionFormat;
  extension: string;
  content: string;
};

export type CurrentUserResponse = {
  uuid: string;
  email: string;
  name: string;
  role: UserRole;
  sessionUuid: string;
};

export type AdminUserSummary = {
  uuid: string;
  email: string;
  name: string;
  role: UserRole;
  enabled: boolean;
  tokenPrefix: string;
  createdAt: Date;
  updatedAt: Date;
  tokenRotatedAt: Date;
};

export type AdminCreateUserRequest = {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
  enabled?: boolean;
};

export type AdminUpdateUserRequest = {
  name?: string;
  email?: string;
  role?: UserRole;
  enabled?: boolean;
};

export type AdminRotateTokenResponse = {
  uuid: string;
  tokenPrefix: string;
  tokenRotatedAt: Date;
};

export type AdminInviteSummary = {
  userUuid: string;
  email: string;
  name: string;
  code: string | null;
  createdAt: Date | null;
  rotatedAt: Date | null;
};

export type AdminSyncStatusResponse = {
  status: string;
  lastEventUuid: string | null;
  lastSuccessAt: Date | null;
  lastFailureAt: Date | null;
  lastError: string | null;
  updatedAt: Date;
};
