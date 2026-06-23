import { deriveCredentials, vmessWsPath } from "./credentials.js";
import { type ProtocolPortMap, resolveProtocolPorts } from "./ports.js";
import type { UserCore } from "./types.js";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };

export type SingBoxServerUser = UserCore;

export type SingBoxTlsConfig =
  | {
      enabled: true;
      server_name: string;
      certificate_path: string;
      key_path: string;
    }
  | {
      enabled: true;
      server_name: string;
      acme: {
        domain: string;
        email?: string;
        dns01_challenge?: JsonObject;
      };
    };

export type SingBoxShadowTlsHandshake = {
  server: string;
  server_port: number;
};

export type RenderSingBoxServerConfigInput = {
  users: readonly SingBoxServerUser[];
  portBase?: number;
  protocolPorts?: ProtocolPortMap;
  masterSecret?: string | null;
  tls: SingBoxTlsConfig;
  shadowTlsHandshake: SingBoxShadowTlsHandshake;
  baseConfig?: JsonObject;
};

export function renderSingBoxServerConfig(
  input: RenderSingBoxServerConfigInput,
): JsonObject {
  const ports = input.protocolPorts ?? resolveProtocolPorts(input.portBase);
  const users = [...input.users];

  return {
    ...defaultSingBoxServerBaseConfig(),
    ...(input.baseConfig ?? {}),
    inbounds: renderSingBoxInbounds({
      users,
      ports,
      masterSecret: input.masterSecret,
      tls: input.tls,
      shadowTlsHandshake: input.shadowTlsHandshake,
    }),
  };
}

export function renderSingBoxInbounds(input: {
  users: readonly SingBoxServerUser[];
  ports: ProtocolPortMap;
  masterSecret?: string | null;
  tls: SingBoxTlsConfig;
  shadowTlsHandshake: SingBoxShadowTlsHandshake;
}): JsonObject[] {
  const renderedUsers = input.users.map((user) => ({
    user,
    credentials: deriveCredentials(user.token, user.uuid, input.masterSecret),
  }));

  const firstUser = renderedUsers[0];
  if (!firstUser) {
    return [];
  }

  return [
    {
      tag: "inbounds-shadowsocks",
      type: "shadowsocks",
      listen: "::",
      listen_port: input.ports.shadowsocks,
      network: "tcp",
      method: "2022-blake3-aes-128-gcm",
      password: firstUser.credentials.shadowsocks,
      users: renderedUsers.map(({ user, credentials }) => ({
        name: user.name,
        password: credentials.shadowsocks,
      })),
      multiplex: { enabled: true },
    },
    {
      tag: "inbounds-vmess",
      type: "vmess",
      listen: "::",
      listen_port: input.ports.vmess,
      tcp_fast_open: true,
      proxy_protocol: false,
      users: renderedUsers.map(({ user }) => ({
        name: user.name,
        uuid: user.uuid,
        alterId: 0,
      })),
      transport: {
        type: "ws",
        path: vmessWsPath(firstUser.credentials),
        max_early_data: 2560,
        early_data_header_name: "Sec-WebSocket-Protocol",
      },
      multiplex: {
        enabled: true,
        padding: true,
        brutal: {
          enabled: true,
          up_mbps: 1000,
          down_mbps: 1000,
        },
      },
    },
    {
      tag: "inbounds-trojan",
      type: "trojan",
      listen: "::",
      listen_port: input.ports.trojan,
      users: renderedUsers.map(({ user, credentials }) => ({
        name: user.name,
        password: credentials.trojan,
      })),
      tls: input.tls,
      multiplex: { enabled: true },
    },
    {
      tag: "inbounds-naive",
      type: "naive",
      listen: "::",
      listen_port: input.ports.naive,
      users: renderedUsers.map(({ user, credentials }) => ({
        username: user.name,
        password: credentials.naive,
      })),
      tls: input.tls,
    },
    {
      tag: "inbounds-hysteria2",
      type: "hysteria2",
      listen: "::",
      listen_port: input.ports.hysteria2,
      up_mbps: 100,
      down_mbps: 100,
      users: renderedUsers.map(({ user, credentials }) => ({
        name: user.name,
        password: credentials.hysteria2,
      })),
      tls: input.tls,
    },
    {
      tag: "inbounds-tuic",
      type: "tuic",
      listen: "::",
      listen_port: input.ports.tuic,
      users: renderedUsers.map(({ user, credentials }) => ({
        uuid: user.uuid,
        password: credentials.tuic,
      })),
      congestion_control: "bbr",
      zero_rtt_handshake: false,
      tls: input.tls,
    },
    {
      tag: "inbounds-anytls",
      type: "anytls",
      listen: "::",
      listen_port: input.ports.anytls,
      users: renderedUsers.map(({ user, credentials }) => ({
        name: user.name,
        password: credentials.anytls,
      })),
      padding_scheme: [],
      tls: input.tls,
    },
    {
      tag: "inbounds-shadowtls",
      type: "shadowtls",
      listen: "::",
      listen_port: input.ports.shadowtls,
      version: 3,
      detour: "inbounds-shadowsocks",
      users: renderedUsers.map(({ user, credentials }) => ({
        name: user.name,
        password: credentials.shadowtls,
      })),
      handshake: input.shadowTlsHandshake,
      strict_mode: true,
    },
  ];
}

export function defaultSingBoxServerBaseConfig(): JsonObject {
  return {
    dns: {
      servers: [
        { tag: "dns-hosts", type: "hosts" },
        { tag: "dns-local", type: "local" },
        { tag: "dns-dhcp", type: "dhcp" },
        {
          tag: "doh-cloudflare",
          type: "h3",
          server: "dns.cloudflare.com",
          path: "/dns-query",
          domain_resolver: "dns-cloudflare",
        },
        {
          tag: "doh-google",
          type: "h3",
          server: "dns.google",
          path: "/dns-query",
          domain_resolver: "dns-google",
        },
        { tag: "dns-cloudflare", type: "udp", server: "1.1.1.1" },
        { tag: "dns-google", type: "udp", server: "8.8.8.8" },
      ],
      final: "dns-local",
    },
    experimental: {
      cache_file: {
        enabled: true,
      },
    },
    log: {
      disabled: false,
      level: "info",
      timestamp: true,
    },
    ntp: {
      enabled: true,
      server: "time.apple.com",
      server_port: 123,
      interval: "30m",
    },
    route: {
      default_domain_resolver: "dns-local",
    },
  };
}
