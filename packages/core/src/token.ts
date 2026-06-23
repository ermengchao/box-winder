import { randomBytes } from "node:crypto";
import { hashPassword } from "./password.js";

export const TOKEN_PREFIX = "verzea_";

export type GeneratedToken = {
  token: string;
  tokenPrefix: string;
};

export type GeneratedInviteCode = {
  inviteCode: string;
};

export type UserSecrets = {
  token: string;
  tokenPrefix: string;
  passwordHash: string;
};

export async function generateUserSecrets(
  password: string,
): Promise<UserSecrets> {
  if (!password) {
    throw new Error("password cannot be empty");
  }

  const generatedToken = generateToken();

  return {
    token: generatedToken.token,
    tokenPrefix: generatedToken.tokenPrefix,
    passwordHash: await hashPassword(password),
  };
}

export function generateToken(): GeneratedToken {
  const token = `${TOKEN_PREFIX}${base64UrlNoPad(randomBytes(32))}`;

  return {
    token,
    tokenPrefix: [...token].slice(0, 16).join(""),
  };
}

export function generateInviteCode(): GeneratedInviteCode {
  return {
    inviteCode: base64UrlNoPad(randomBytes(6)),
  };
}

export function base64UrlNoPad(bytes: Buffer | Uint8Array): string {
  return Buffer.from(bytes)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}
