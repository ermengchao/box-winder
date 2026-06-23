import { createHmac } from "node:crypto";
import { base64UrlNoPad } from "./token.js";

export type Credentials = {
  shadowtls: string;
  shadowsocks: string;
  vmess: string;
  trojan: string;
  naive: string;
  tuic: string;
  hysteria2: string;
  anytls: string;
};

export function deriveCredentials(
  token: string,
  uuid: string,
  masterSecret?: string | null,
): Credentials {
  const normalizedSecret = masterSecret?.length ? masterSecret : undefined;

  return {
    shadowtls: deriveTextPassword(token, uuid, "shadowtls", normalizedSecret),
    shadowsocks: deriveShadowsocks2022Password(token, uuid, normalizedSecret),
    vmess: deriveTextPassword(token, uuid, "vmess", normalizedSecret),
    trojan: deriveTextPassword(token, uuid, "trojan", normalizedSecret),
    naive: deriveTextPassword(token, uuid, "naive", normalizedSecret),
    tuic: deriveTextPassword(token, uuid, "tuic", normalizedSecret),
    hysteria2: deriveTextPassword(token, uuid, "hysteria2", normalizedSecret),
    anytls: deriveTextPassword(token, uuid, "anytls", normalizedSecret),
  };
}

export function normalizePath(value: string): string {
  return value.startsWith("/") ? value : `/${value}`;
}

export function vmessWsPath(credentials: Pick<Credentials, "vmess">): string {
  return normalizePath(credentials.vmess);
}

function deriveTextPassword(
  token: string,
  uuid: string,
  protocol: string,
  masterSecret?: string,
): string {
  const digest = hmacDigest(token, uuid, protocol, masterSecret);
  return base64UrlNoPad(digest.subarray(0, 24));
}

function deriveShadowsocks2022Password(
  token: string,
  uuid: string,
  masterSecret?: string,
): string {
  const digest = hmacDigest(
    token,
    uuid,
    "shadowsocks-2022-aes-128-gcm",
    masterSecret,
  );
  return digest.subarray(0, 16).toString("base64");
}

function hmacDigest(
  token: string,
  uuid: string,
  protocol: string,
  masterSecret?: string,
): Buffer {
  const key = masterSecret ?? token;
  const message = masterSecret
    ? `sing-box-proxy:v2:${uuid}:${token}:${protocol}`
    : `sing-box-proxy:v1:${uuid}:${protocol}`;

  return createHmac("sha256", key).update(message).digest();
}
