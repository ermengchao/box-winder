import { createPgPool, type PgPool } from "@box-winder/db";
import { Injectable, type OnModuleDestroy } from "@nestjs/common";

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  readonly pool: PgPool = createPgPool();

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
