import { describe, expect, test } from "bun:test";
import { quoteSystemdEnvValue, renderSystemdEnvFile } from "./systemd-env.js";

describe("systemd env rendering", () => {
  test("renders a systemd EnvironmentFile from explicit env values", () => {
    const rendered = renderSystemdEnvFile({
      env: {
        ACME_EMAIL: "admin@example.com",
        API_BASE_URL: "https://api.example.com",
        BOX_WINDER_SYSTEMD_SCOPE: "user",
        CLOUDFLARE_API_TOKEN: "cf-token",
        DATABASE_URL: "postgres://box_winder:secret@127.0.0.1/box_winder",
        DOMAIN_NAME: "example.com",
        JWT_SECRET: "secret with spaces",
      },
    });

    expect(rendered).toContain('BOX_WINDER_SYSTEMD_SCOPE="user"');
    expect(rendered).toContain('JWT_SECRET="secret with spaces"');
    expect(rendered).toContain(
      'DATABASE_URL="postgres://box_winder:secret@127.0.0.1/box_winder"',
    );
    expect(rendered).toContain('.local/state/box-winder/sing-box/config.json"');
  });

  test("requires production secrets by default", () => {
    expect(() =>
      renderSystemdEnvFile({
        env: {
          ACME_EMAIL: "admin@example.com",
          CLOUDFLARE_API_TOKEN: "cf-token",
          DATABASE_URL: "postgres://box_winder:secret@127.0.0.1/box_winder",
          DOMAIN_NAME: "example.com",
        },
      }),
    ).toThrow("JWT_SECRET");
  });

  test("explicit scope overrides the current environment", () => {
    const rendered = renderSystemdEnvFile({
      env: {
        ACME_EMAIL: "admin@example.com",
        BOX_WINDER_SYSTEMD_SCOPE: "user",
        CLOUDFLARE_API_TOKEN: "cf-token",
        DATABASE_URL: "postgres://box_winder:secret@127.0.0.1/box_winder",
        DOMAIN_NAME: "example.com",
        JWT_SECRET: "secret",
      },
      scope: "system",
    });

    expect(rendered).toContain('BOX_WINDER_SYSTEMD_SCOPE="system"');
  });

  test("quotes systemd values", () => {
    expect(quoteSystemdEnvValue('a "quoted" value \\ test')).toBe(
      '"a \\"quoted\\" value \\\\ test"',
    );
    expect(() => quoteSystemdEnvValue("multi\nline")).toThrow("single-line");
  });
});
