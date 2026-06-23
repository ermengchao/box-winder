import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  DEFAULT_SING_BOX_PORT_BASE,
  deriveCredentials,
  generateInviteCode,
  generateToken,
  renderClashSubscription,
  renderShadowrocketSubscription,
  renderSingBoxServerConfig,
  renderSingBoxSubscription,
  renderSubscriptionNodes,
  renderSurgeSubscription,
  resolveProtocolPorts,
  SUBSCRIPTION_PROTOCOLS_BY_FORMAT,
  TOKEN_PREFIX,
  vmessWsPath,
} from "./index.js";

const SAMPLE_UUID = "a03faa38-dea9-4c15-9d56-71c4757b572c";
const SAMPLE_TOKEN = "token";

describe("token generation", () => {
  test("generated tokens use the fixed Rust prefix", () => {
    const token = generateToken();

    expect(token.token.startsWith(TOKEN_PREFIX)).toBe(true);
    expect(token.tokenPrefix).toBe(token.token.slice(0, 16));
  });

  test("generated invite codes are eight URL-safe characters", () => {
    const invite = generateInviteCode();

    expect(invite.inviteCode).toHaveLength(8);
    expect(invite.inviteCode).toMatch(/^[A-Za-z0-9_-]{8}$/);
  });
});

describe("credential derivation", () => {
  test("empty master secret matches token-only derivation", () => {
    const tokenOnly = deriveCredentials(SAMPLE_TOKEN, SAMPLE_UUID);
    const emptySecret = deriveCredentials(SAMPLE_TOKEN, SAMPLE_UUID, "");

    expect(emptySecret).toEqual(tokenOnly);
  });

  test("master secret changes derived credentials", () => {
    const tokenOnly = deriveCredentials(SAMPLE_TOKEN, SAMPLE_UUID);
    const withSecret = deriveCredentials(
      SAMPLE_TOKEN,
      SAMPLE_UUID,
      "master-secret",
    );

    expect(withSecret.shadowsocks).not.toBe(tokenOnly.shadowsocks);
    expect(withSecret.shadowtls).not.toBe(tokenOnly.shadowtls);
    expect(withSecret.vmess).not.toBe(tokenOnly.vmess);
    expect(withSecret.trojan).not.toBe(tokenOnly.trojan);
  });

  test("vmess websocket path is normalized with a leading slash", () => {
    const credentials = deriveCredentials(SAMPLE_TOKEN, SAMPLE_UUID);

    expect(vmessWsPath(credentials)).toBe(`/${credentials.vmess}`);
  });
});

describe("managed port cluster", () => {
  test("protocol ports use stable offsets from SING_BOX_PORT_BASE", () => {
    const ports = resolveProtocolPorts(DEFAULT_SING_BOX_PORT_BASE);

    expect(ports.shadowsocks).toBe(10000);
    expect(ports.vmess).toBe(10001);
    expect(ports.trojan).toBe(10002);
    expect(ports.naive).toBe(10003);
    expect(ports.hysteria2).toBe(10004);
    expect(ports.tuic).toBe(10005);
    expect(ports.anytls).toBe(10006);
    expect(ports.shadowtls).toBe(10007);
  });

  test("invalid derived ports are rejected", () => {
    expect(() => resolveProtocolPorts(65529)).toThrow(
      "shadowtls must be a valid TCP/UDP port",
    );
  });
});

describe("sing-box server config rendering", () => {
  test("renders all managed inbounds from shared port resolver", () => {
    const config = renderSingBoxServerConfig({
      users: [{ uuid: SAMPLE_UUID, name: "chao", token: SAMPLE_TOKEN }],
      portBase: DEFAULT_SING_BOX_PORT_BASE,
      masterSecret: "master-secret",
      tls: {
        enabled: true,
        server_name: "localhost",
        certificate_path: "/tmp/cert.pem",
        key_path: "/tmp/key.pem",
      },
      shadowTlsHandshake: { server: "example.com", server_port: 443 },
    });
    const inbounds = config.inbounds;

    expect(Array.isArray(inbounds)).toBe(true);
    expect(inbounds).toHaveLength(8);
    expect(
      (inbounds as Array<{ type: string; listen_port: number }>).map(
        (inbound) => [inbound.type, inbound.listen_port],
      ),
    ).toEqual([
      ["shadowsocks", 10000],
      ["vmess", 10001],
      ["trojan", 10002],
      ["naive", 10003],
      ["hysteria2", 10004],
      ["tuic", 10005],
      ["anytls", 10006],
      ["shadowtls", 10007],
    ]);
  });

  test("renders no inbounds when there are no enabled users", () => {
    const config = renderSingBoxServerConfig({
      users: [],
      portBase: DEFAULT_SING_BOX_PORT_BASE,
      tls: {
        enabled: true,
        server_name: "localhost",
        certificate_path: "/tmp/cert.pem",
        key_path: "/tmp/key.pem",
      },
      shadowTlsHandshake: { server: "example.com", server_port: 443 },
    });

    expect(config.inbounds).toEqual([]);
  });
});

describe("subscription rendering", () => {
  const subscriptionInput = {
    user: { uuid: SAMPLE_UUID, name: "chao", token: SAMPLE_TOKEN },
    domainName: "proxy.example.com",
    nodeLocation: "JP",
    portBase: DEFAULT_SING_BOX_PORT_BASE,
    masterSecret: "master-secret",
  };

  test("generates incrementing node names from NODE_LOCATION", () => {
    const nodes = renderSubscriptionNodes({
      ...subscriptionInput,
      format: "sing-box",
    });

    expect(nodes.map((node) => node.name)).toEqual([
      "🇯🇵 Japan 01",
      "🇯🇵 Japan 02",
      "🇯🇵 Japan 03",
      "🇯🇵 Japan 04",
      "🇯🇵 Japan 05",
      "🇯🇵 Japan 06",
      "🇯🇵 Japan 07",
      "🇯🇵 Japan 08",
    ]);
  });

  test("filters protocols by subscription format compatibility", () => {
    expect(
      renderSubscriptionNodes({ ...subscriptionInput, format: "sing-box" }).map(
        (node) => node.protocol,
      ),
    ).toEqual([...SUBSCRIPTION_PROTOCOLS_BY_FORMAT["sing-box"]]);
    expect(
      renderSubscriptionNodes({ ...subscriptionInput, format: "clash" }).map(
        (node) => node.protocol,
      ),
    ).toEqual([...SUBSCRIPTION_PROTOCOLS_BY_FORMAT.clash]);
    expect(
      renderSubscriptionNodes({
        ...subscriptionInput,
        format: "shadowrocket",
      }).map((node) => node.protocol),
    ).toEqual([...SUBSCRIPTION_PROTOCOLS_BY_FORMAT.shadowrocket]);
    expect(
      renderSubscriptionNodes({ ...subscriptionInput, format: "surge" }).map(
        (node) => node.protocol,
      ),
    ).toEqual([...SUBSCRIPTION_PROTOCOLS_BY_FORMAT.surge]);
  });

  test("uses shared port offsets for subscription nodes", () => {
    const nodes = renderSubscriptionNodes({
      ...subscriptionInput,
      format: "sing-box",
    });

    expect(nodes.map((node) => [node.protocol, node.port])).toEqual([
      ["shadowsocks", 10000],
      ["vmess", 10001],
      ["trojan", 10002],
      ["naive", 10003],
      ["hysteria2", 10004],
      ["tuic", 10005],
      ["anytls", 10006],
      ["shadowtls", 10007],
    ]);
  });

  test("renders sing-box proxy groups with dynamic node references", () => {
    const config = renderSingBoxSubscription(subscriptionInput);
    const outbounds = config.outbounds as Array<{
      tag: string;
      outbounds?: string[];
      type: string;
    }>;
    const proxyGroup = outbounds.find(
      (outbound) => outbound.tag === "🌐 Proxy",
    );
    const autoGroup = outbounds.find((outbound) => outbound.tag === "✨ Auto");
    const aiGroup = outbounds.find((outbound) => outbound.tag === "🧠 AI");

    expect(proxyGroup?.outbounds).toEqual([
      "✨ Auto",
      "🇯🇵 Japan 01",
      "🇯🇵 Japan 02",
      "🇯🇵 Japan 03",
      "🇯🇵 Japan 04",
      "🇯🇵 Japan 05",
      "🇯🇵 Japan 06",
      "🇯🇵 Japan 07",
      "🇯🇵 Japan 08",
    ]);
    expect(autoGroup?.outbounds).toEqual([
      "🇯🇵 Japan 01",
      "🇯🇵 Japan 02",
      "🇯🇵 Japan 03",
      "🇯🇵 Japan 04",
      "🇯🇵 Japan 05",
      "🇯🇵 Japan 06",
      "🇯🇵 Japan 07",
      "🇯🇵 Japan 08",
    ]);
    expect(aiGroup?.outbounds).toEqual(["🌐 Proxy", "🟢 Direct"]);
  });

  test("renders Clash, Shadowrocket, and Surge groups without direct business-node refs", () => {
    const clash = renderClashSubscription(subscriptionInput);
    const shadowrocket = renderShadowrocketSubscription(subscriptionInput);
    const surge = renderSurgeSubscription(subscriptionInput);

    expect(clash).toContain('- name: "🌐 Proxy"');
    expect(clash).toContain('      - "✨ Auto"');
    expect(clash).toContain('      - "🇯🇵 Japan 01"');
    expect(clash).toContain('      - "🇯🇵 Japan 08"');
    expect(clash).toContain('- name: "🧠 AI"');
    expect(clash).toContain('      - "🌐 Proxy"');
    expect(shadowrocket).toContain(
      '🌐 Proxy = select, "✨ Auto", "🇯🇵 Japan 01"',
    );
    expect(shadowrocket).toContain('"🇯🇵 Japan 08"');
    expect(shadowrocket).toContain('🧠 AI = select, "🌐 Proxy", "🟢 Direct"');
    expect(surge).toContain('🌐 Proxy = select, "✨ Auto", "🇯🇵 Japan 01"');
    expect(surge).toContain('"🇯🇵 Japan 08"');
  });

  test("throws when DOMAIN_NAME is missing", () => {
    expect(() =>
      renderSubscriptionNodes({
        ...subscriptionInput,
        domainName: "",
        format: "sing-box",
      }),
    ).toThrow("DOMAIN_NAME is required");
  });

  test("subscription templates no longer hardcode generated nodes", () => {
    const templates = [
      "assets/templates/subscriptions/sing-box/config.json",
      "assets/templates/subscriptions/clash/config.yaml",
      "assets/templates/subscriptions/shadowrocket/config.conf",
      "assets/templates/subscriptions/surge/config.conf",
    ].map((path) => readFileSync(path, "utf8"));

    for (const template of templates) {
      expect(template).not.toContain("🇯🇵 Japan 01");
      expect(template).not.toContain("🇯🇵 Japan 08");
    }
  });
});
