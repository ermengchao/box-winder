import { Module } from "@nestjs/common";

import { DaemonWorker } from "./daemon.worker.js";

@Module({
  providers: [DaemonWorker],
})
export class DaemonModule {}
