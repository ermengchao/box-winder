import { ApolloDriver, type ApolloDriverConfig } from "@nestjs/apollo";
import { Module } from "@nestjs/common";
import { GraphQLModule } from "@nestjs/graphql";
import { AdminModule } from "../admin/admin.module.js";
import { AuthModule } from "../auth/auth.module.js";
import type { RequestWithUser } from "../auth/current-user.js";
import { DatabaseModule } from "../db/database.module.js";
import { HealthController } from "./health.controller.js";

@Module({
  imports: [
    DatabaseModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      context: ({ req }: { req: RequestWithUser }) => ({ req }),
    }),
    AuthModule,
    AdminModule,
  ],
  controllers: [HealthController],
})
export class ApiModule {}
