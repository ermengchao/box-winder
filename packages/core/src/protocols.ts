export const SUPPORTED_PROTOCOLS = [
  "shadowsocks",
  "vmess",
  "trojan",
  "naive",
  "hysteria2",
  "tuic",
  "anytls",
  "shadowtls",
] as const;

export type SupportedProtocol = (typeof SUPPORTED_PROTOCOLS)[number];

export const PROTOCOL_PORT_OFFSETS = {
  shadowsocks: 0,
  vmess: 1,
  trojan: 2,
  naive: 3,
  hysteria2: 4,
  tuic: 5,
  anytls: 6,
  shadowtls: 7,
} as const satisfies Record<SupportedProtocol, number>;
