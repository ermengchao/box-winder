import {
  PROTOCOL_PORT_OFFSETS,
  SUPPORTED_PROTOCOLS,
  type SupportedProtocol,
} from "./protocols.js";

export const DEFAULT_SING_BOX_PORT_BASE = 10000;
export const MAX_PORT = 65535;
export const MIN_PORT = 1;

export type ProtocolPortMap = Record<SupportedProtocol, number>;

export function resolveProtocolPorts(
  basePort = DEFAULT_SING_BOX_PORT_BASE,
): ProtocolPortMap {
  if (!Number.isInteger(basePort)) {
    throw new Error("SING_BOX_PORT_BASE must be an integer");
  }

  const ports = Object.fromEntries(
    SUPPORTED_PROTOCOLS.map((protocol) => [
      protocol,
      validatePort(basePort + PROTOCOL_PORT_OFFSETS[protocol], protocol),
    ]),
  ) as ProtocolPortMap;

  return ports;
}

export function validatePort(port: number, label = "port"): number {
  if (!Number.isInteger(port) || port < MIN_PORT || port > MAX_PORT) {
    throw new Error(`${label} must be a valid TCP/UDP port`);
  }

  return port;
}
