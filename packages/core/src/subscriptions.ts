import {
  deriveCredentials,
  normalizePath,
  vmessWsPath,
} from "./credentials.js";
import { compactNodeName, nodeNameBaseFromLocation } from "./node-names.js";
import { type ProtocolPortMap, resolveProtocolPorts } from "./ports.js";
import type { SupportedProtocol } from "./protocols.js";
import type { JsonObject } from "./sing-box.js";
import type { UserCore } from "./types.js";

export type SubscriptionFormat =
  | "sing-box"
  | "clash"
  | "shadowrocket"
  | "surge";

export type SubscriptionProtocol = SupportedProtocol;

// biome-ignore format: keep subscription format keys visually consistent
export const SUBSCRIPTION_PROTOCOLS_BY_FORMAT = {
  "sing-box": ["shadowsocks", "vmess", "trojan", "naive", "hysteria2", "tuic", "anytls", "shadowtls"],
  "clash": ["shadowsocks", "vmess", "trojan", "naive", "hysteria2", "tuic", "anytls", "shadowtls"],
  "shadowrocket": ["shadowsocks", "vmess", "trojan", "naive", "hysteria2", "tuic", "anytls", "shadowtls"],
  "surge": ["shadowsocks", "vmess", "trojan", "naive", "hysteria2", "tuic", "anytls", "shadowtls"],
} as const satisfies Record<
  SubscriptionFormat,
  readonly SubscriptionProtocol[]
>;

export type SubscriptionNode = {
  name: string;
  protocol: SubscriptionProtocol;
  server: string;
  port: number;
  uuid: string;
  password: string;
  shadowsocksPassword: string;
  vmessWsPath: string;
};

export type RenderSubscriptionInput = {
  user: UserCore;
  domainName: string;
  nodeLocation: string;
  portBase?: number;
  protocolPorts?: ProtocolPortMap;
  masterSecret?: string | null;
  baseTemplate?: string;
};

const DIRECT_GROUP = "🟢 Direct";
const REJECT_GROUP = "🔴 Reject";
const PROXY_GROUP = "🌐 Proxy";
const AUTO_GROUP = "✨ Auto";
const AD_GROUP = "📺 AD";
const AI_GROUP = "🧠 AI";
const GAME_GROUP = "🎮 Game";
const MEDIA_GROUP = "🎥 Media";
const FINAL_GROUP = "🐟 Final";

export function renderSubscriptionNodes(
  input: RenderSubscriptionInput & { format: SubscriptionFormat },
): SubscriptionNode[] {
  const server = requireDomainName(input.domainName);
  const ports = input.protocolPorts ?? resolveProtocolPorts(input.portBase);
  const credentials = deriveCredentials(
    input.user.token,
    input.user.uuid,
    input.masterSecret,
  );
  const nodeNameBase = nodeNameBaseFromLocation(input.nodeLocation);

  return SUBSCRIPTION_PROTOCOLS_BY_FORMAT[input.format].map(
    (protocol, index) => ({
      name: compactNodeName(nodeNameBase, index),
      protocol,
      server,
      port: ports[protocol],
      uuid: input.user.uuid,
      password: credentials[protocol],
      shadowsocksPassword: credentials.shadowsocks,
      vmessWsPath: vmessWsPath(credentials),
    }),
  );
}

export function renderSingBoxSubscription(
  input: RenderSubscriptionInput & { baseConfig?: JsonObject },
): JsonObject {
  const nodes = renderSubscriptionNodes({ ...input, format: "sing-box" });

  return {
    ...(input.baseConfig ?? {}),
    outbounds: renderSingBoxSubscriptionOutbounds(nodes),
  };
}

export function renderClashSubscription(
  input: RenderSubscriptionInput,
): string {
  const nodes = renderSubscriptionNodes({ ...input, format: "clash" });
  const dynamicConfig = [
    renderClashProxies(nodes),
    "",
    renderClashProxyGroups(nodes),
  ].join("\n");

  return input.baseTemplate
    ? replaceClashDynamicSections(input.baseTemplate, dynamicConfig)
    : dynamicConfig;
}

export function renderShadowrocketSubscription(
  input: RenderSubscriptionInput,
): string {
  const nodes = renderSubscriptionNodes({ ...input, format: "shadowrocket" });
  const dynamicConfig = renderShadowrocketDynamicSections(nodes);

  return input.baseTemplate
    ? replaceShadowrocketDynamicSections(input.baseTemplate, dynamicConfig)
    : dynamicConfig;
}

export function renderSurgeSubscription(
  input: RenderSubscriptionInput,
): string {
  const nodes = renderSubscriptionNodes({ ...input, format: "surge" });
  const dynamicConfig = renderShadowrocketDynamicSections(nodes);

  return input.baseTemplate
    ? replaceShadowrocketDynamicSections(input.baseTemplate, dynamicConfig)
    : dynamicConfig;
}

function renderShadowrocketDynamicSections(
  nodes: readonly SubscriptionNode[],
): string {
  return [
    "[Proxy]",
    `${DIRECT_GROUP} = direct`,
    `${REJECT_GROUP} = reject`,
    ...nodes.map(renderShadowrocketProxyLine),
    "",
    "[Proxy Group]",
    `${PROXY_GROUP} = select, ${quote(AUTO_GROUP)}, ${nodes.map((node) => quote(node.name)).join(", ")}`,
    `${AUTO_GROUP} = smart, ${nodes.map((node) => quote(node.name)).join(", ")}`,
    `${AD_GROUP} = select, ${quote(PROXY_GROUP)}, ${quote(DIRECT_GROUP)}, ${quote(REJECT_GROUP)}, default=${REJECT_GROUP}`,
    `${AI_GROUP} = select, ${quote(PROXY_GROUP)}, ${quote(DIRECT_GROUP)}`,
    `${GAME_GROUP} = select, ${quote(PROXY_GROUP)}, ${quote(DIRECT_GROUP)}`,
    `${MEDIA_GROUP} = select, ${quote(PROXY_GROUP)}, ${quote(DIRECT_GROUP)}`,
    `${FINAL_GROUP} = select, ${quote(PROXY_GROUP)}, ${quote(DIRECT_GROUP)}`,
  ].join("\n");
}

export function renderSingBoxSubscriptionOutbounds(
  nodes: readonly SubscriptionNode[],
): JsonObject[] {
  const nodeNames = nodes.map((node) => node.name);

  return [
    { tag: DIRECT_GROUP, type: "direct" },
    { tag: REJECT_GROUP, type: "block" },
    {
      tag: PROXY_GROUP,
      type: "selector",
      default: AUTO_GROUP,
      outbounds: [AUTO_GROUP, ...nodeNames],
    },
    {
      tag: AUTO_GROUP,
      type: "urltest",
      outbounds: nodeNames,
      url: "https://www.gstatic.com/generate_204",
      interval: "300s",
    },
    {
      tag: AD_GROUP,
      type: "selector",
      default: REJECT_GROUP,
      outbounds: [PROXY_GROUP, DIRECT_GROUP, REJECT_GROUP],
    },
    selectorOutbound(AI_GROUP),
    selectorOutbound(GAME_GROUP),
    selectorOutbound(MEDIA_GROUP),
    selectorOutbound(FINAL_GROUP),
    ...nodes.map(renderSingBoxNodeOutbound),
  ];
}

export function renderClashProxies(nodes: readonly SubscriptionNode[]): string {
  return [
    "proxies:",
    ...nodes.flatMap((node) => renderClashProxyLines(node)),
  ].join("\n");
}

export function renderClashProxyGroups(
  nodes: readonly SubscriptionNode[],
): string {
  const nodeNames = nodes.map((node) => quote(node.name));

  return [
    "proxy-groups:",
    `  - name: ${quote(DIRECT_GROUP)}`,
    "    type: select",
    "    proxies:",
    "      - DIRECT",
    "    hidden: true",
    `  - name: ${quote(REJECT_GROUP)}`,
    "    type: select",
    "    proxies:",
    "      - REJECT",
    "    hidden: true",
    `  - name: ${quote(PROXY_GROUP)}`,
    "    type: select",
    "    proxies:",
    `      - ${quote(AUTO_GROUP)}`,
    ...nodeNames.map((name) => `      - ${name}`),
    `  - name: ${quote(AUTO_GROUP)}`,
    "    type: url-test",
    "    url: 'https://www.gstatic.com/generate_204'",
    "    interval: 300",
    "    proxies:",
    ...nodeNames.map((name) => `      - ${name}`),
    renderClashBusinessGroup(AD_GROUP, [
      PROXY_GROUP,
      DIRECT_GROUP,
      REJECT_GROUP,
    ]),
    renderClashBusinessGroup(AI_GROUP, [PROXY_GROUP, DIRECT_GROUP]),
    renderClashBusinessGroup(GAME_GROUP, [PROXY_GROUP, DIRECT_GROUP]),
    renderClashBusinessGroup(MEDIA_GROUP, [PROXY_GROUP, DIRECT_GROUP]),
    renderClashBusinessGroup(FINAL_GROUP, [PROXY_GROUP, DIRECT_GROUP]),
  ].join("\n");
}

function renderSingBoxNodeOutbound(node: SubscriptionNode): JsonObject {
  switch (node.protocol) {
    case "shadowsocks":
      return {
        tag: node.name,
        type: "shadowsocks",
        server: node.server,
        server_port: node.port,
        method: "2022-blake3-aes-128-gcm",
        password: node.shadowsocksPassword,
      };
    case "vmess":
      return {
        tag: node.name,
        type: "vmess",
        server: node.server,
        server_port: node.port,
        uuid: node.uuid,
        security: "auto",
        transport: { type: "ws", path: node.vmessWsPath },
      };
    case "trojan":
      return {
        tag: node.name,
        type: "trojan",
        server: node.server,
        server_port: node.port,
        password: node.password,
        tls: { enabled: true, server_name: node.server },
      };
    case "naive":
      return {
        tag: node.name,
        type: "naive",
        server: node.server,
        server_port: node.port,
        username: node.name,
        password: node.password,
        tls: { enabled: true, server_name: node.server },
      };
    case "hysteria2":
      return {
        tag: node.name,
        type: "hysteria2",
        server: node.server,
        server_port: node.port,
        password: node.password,
        tls: { enabled: true, server_name: node.server },
      };
    case "tuic":
      return {
        tag: node.name,
        type: "tuic",
        server: node.server,
        server_port: node.port,
        uuid: node.uuid,
        password: node.password,
        congestion_control: "bbr",
        tls: { enabled: true, server_name: node.server },
      };
    case "anytls":
      return {
        tag: node.name,
        type: "anytls",
        server: node.server,
        server_port: node.port,
        password: node.password,
        tls: { enabled: true, server_name: node.server },
      };
    case "shadowtls":
      return {
        tag: node.name,
        type: "shadowtls",
        server: node.server,
        server_port: node.port,
        version: 3,
        password: node.password,
        tls: { enabled: true, server_name: node.server },
      };
  }
}

function renderClashProxyLines(node: SubscriptionNode): string[] {
  switch (node.protocol) {
    case "shadowsocks":
      return [
        `  - name: ${quote(node.name)}`,
        "    type: ss",
        `    server: ${node.server}`,
        `    port: ${node.port}`,
        "    cipher: 2022-blake3-aes-128-gcm",
        `    password: ${quote(node.shadowsocksPassword)}`,
      ];
    case "vmess":
      return [
        `  - name: ${quote(node.name)}`,
        "    type: vmess",
        `    server: ${node.server}`,
        `    port: ${node.port}`,
        `    uuid: ${node.uuid}`,
        "    alterId: 0",
        "    cipher: auto",
        "    network: ws",
        "    ws-opts:",
        `      path: ${quote(normalizePath(node.vmessWsPath))}`,
      ];
    case "trojan":
      return [
        `  - name: ${quote(node.name)}`,
        "    type: trojan",
        `    server: ${node.server}`,
        `    port: ${node.port}`,
        `    password: ${quote(node.password)}`,
        `    sni: ${node.server}`,
      ];
    case "naive":
      return [
        `  - name: ${quote(node.name)}`,
        "    type: naive",
        `    server: ${node.server}`,
        `    port: ${node.port}`,
        `    username: ${quote(node.name)}`,
        `    password: ${quote(node.password)}`,
        `    sni: ${node.server}`,
      ];
    case "hysteria2":
      return [
        `  - name: ${quote(node.name)}`,
        "    type: hysteria2",
        `    server: ${node.server}`,
        `    port: ${node.port}`,
        `    password: ${quote(node.password)}`,
        `    sni: ${node.server}`,
      ];
    case "tuic":
      return [
        `  - name: ${quote(node.name)}`,
        "    type: tuic",
        `    server: ${node.server}`,
        `    port: ${node.port}`,
        `    uuid: ${node.uuid}`,
        `    password: ${quote(node.password)}`,
        "    congestion-controller: bbr",
        `    sni: ${node.server}`,
      ];
    case "anytls":
      return [
        `  - name: ${quote(node.name)}`,
        "    type: anytls",
        `    server: ${node.server}`,
        `    port: ${node.port}`,
        `    password: ${quote(node.password)}`,
        `    sni: ${node.server}`,
      ];
    case "shadowtls":
      return [
        `  - name: ${quote(node.name)}`,
        "    type: shadowtls",
        `    server: ${node.server}`,
        `    port: ${node.port}`,
        "    version: 3",
        `    password: ${quote(node.password)}`,
        `    sni: ${node.server}`,
      ];
  }
}

function renderShadowrocketProxyLine(node: SubscriptionNode): string {
  switch (node.protocol) {
    case "shadowsocks":
      return `${node.name} = ss, ${node.server}, ${node.port}, encrypt-method=2022-blake3-aes-128-gcm, password=${node.shadowsocksPassword}`;
    case "vmess":
      return `${node.name} = vmess, ${node.server}, ${node.port}, username=${node.uuid}, ws=true, ws-path=${node.vmessWsPath}`;
    case "trojan":
      return `${node.name} = trojan, ${node.server}, ${node.port}, password=${node.password}, sni=${node.server}`;
    case "naive":
      return `${node.name} = naive, ${node.server}, ${node.port}, username=${node.name}, password=${node.password}, sni=${node.server}`;
    case "hysteria2":
      return `${node.name} = hysteria2, ${node.server}, ${node.port}, password=${node.password}, sni=${node.server}`;
    case "tuic":
      return `${node.name} = tuic, ${node.server}, ${node.port}, username=${node.uuid}, password=${node.password}, sni=${node.server}`;
    case "anytls":
      return `${node.name} = anytls, ${node.server}, ${node.port}, password=${node.password}, sni=${node.server}`;
    case "shadowtls":
      return `${node.name} = shadowtls, ${node.server}, ${node.port}, password=${node.password}, version=3, sni=${node.server}`;
  }
}

function selectorOutbound(tag: string): JsonObject {
  return {
    tag,
    type: "selector",
    default: PROXY_GROUP,
    outbounds: [PROXY_GROUP, DIRECT_GROUP],
  };
}

function renderClashBusinessGroup(name: string, proxies: string): string;
function renderClashBusinessGroup(
  name: string,
  proxies: readonly string[],
): string;
function renderClashBusinessGroup(
  name: string,
  proxies: string | readonly string[],
): string {
  const proxyList = typeof proxies === "string" ? [proxies] : proxies;
  return [
    `  - name: ${quote(name)}`,
    "    type: select",
    "    proxies:",
    ...proxyList.map((proxy) => `      - ${quote(proxy)}`),
  ].join("\n");
}

function requireDomainName(value: string): string {
  const domainName = value.trim();
  if (!domainName) {
    throw new Error("DOMAIN_NAME is required to render subscriptions");
  }

  return domainName;
}

function replaceClashDynamicSections(
  template: string,
  dynamicConfig: string,
): string {
  const pattern =
    /(?:^|\n)(?:proxies:\n[\s\S]*?\n)?proxy-groups:\n[\s\S]*?(?=\nrules:)/;
  if (!pattern.test(template)) {
    throw new Error(
      "Clash subscription template is missing proxy-groups section",
    );
  }

  return `${template.replace(pattern, `\n${dynamicConfig}`)}\n`;
}

function replaceShadowrocketDynamicSections(
  template: string,
  dynamicConfig: string,
): string {
  const pattern = /\[Proxy\]\n[\s\S]*?(?=\n\[Rule\])/;
  if (!pattern.test(template)) {
    throw new Error(
      "Shadowrocket subscription template is missing [Proxy] section",
    );
  }

  return `${template.replace(pattern, dynamicConfig)}\n`;
}

function quote(value: string): string {
  return JSON.stringify(value);
}
