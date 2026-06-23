import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { getRequest } from "./jwt-session.guard.js";

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = getRequest(context).user;
    if (user?.role !== "admin") {
      throw new ForbiddenException("admin role is required");
    }

    return true;
  }
}
