import "reflect-metadata";
import { loadApiConfig } from "@box-winder/config";
import type { CustomOrigin } from "@nestjs/common/interfaces/external/cors-options.interface.js";
import { NestFactory } from "@nestjs/core";
import { ApiModule } from "./modules/api.module.js";

const config = loadApiConfig();
const app = await NestFactory.create(ApiModule);
const corsOrigin: CustomOrigin = (origin, callback) => {
  if (!origin || config.corsOrigins.includes(origin)) {
    callback(null, true);
    return;
  }

  callback(new Error(`CORS origin is not allowed: ${origin}`));
};

app.enableCors({
  allowedHeaders: ["Authorization", "Content-Type"],
  credentials: false,
  methods: ["GET", "POST", "OPTIONS"],
  origin: corsOrigin,
});
await app.listen(config.port, config.host);

console.log(`box-winder-api listening on ${config.host}:${config.port}`);
