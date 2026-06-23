import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { AdminResolver } from "./admin.resolver.js";
import { AdminService } from "./admin.service.js";

@Module({
  imports: [AuthModule],
  providers: [AdminResolver, AdminService],
})
export class AdminModule {}
