#!/usr/bin/env bun
import { loadCliConfig } from "@box-winder/config";
import { TOKEN_PREFIX } from "@box-winder/core";
import { Command } from "commander";

const config = loadCliConfig();

const program = new Command()
  .name("box-winder")
  .description("TypeScript CLI for the box-winder control plane")
  .version("0.1.0");

program
  .command("status")
  .description("Show the configured API target")
  .action(() => {
    console.log(
      JSON.stringify(
        {
          apiBaseUrl: config.apiBaseUrl,
          tokenPrefix: TOKEN_PREFIX,
        },
        null,
        2,
      ),
    );
  });

program.parse();
