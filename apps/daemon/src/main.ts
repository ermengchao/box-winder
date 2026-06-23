import "reflect-metadata";
import { loadDaemonConfig } from "@box-winder/config";
import { NestFactory } from "@nestjs/core";
import { DaemonModule } from "./modules/daemon.module.js";

const config = loadDaemonConfig();
const app = await NestFactory.createApplicationContext(DaemonModule);

console.log(
  `box-winder-daemon ready; managed config path: ${config.singBoxConfigPath}`,
);

const shutdown = async () => {
  await app.close();
  process.exit(0);
};

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
