import type {
  AdminCreateUserRequest,
  AdminUpdateUserRequest,
} from "@box-winder/contracts";
import { UseGuards } from "@nestjs/common";
import { Args, Context, ID, Mutation, Query, Resolver } from "@nestjs/graphql";
import { AdminGuard } from "../auth/admin.guard.js";
import type { RequestWithUser } from "../auth/current-user.js";
import { JwtSessionGuard } from "../auth/jwt-session.guard.js";
import {
  AdminCreateUserInput,
  AdminInvite,
  AdminRotateTokenPayload,
  AdminSyncStatus,
  AdminUpdateUserInput,
  AdminUser,
} from "../graphql/graphql.types.js";
// biome-ignore lint/style/useImportType: NestJS constructor injection needs runtime metadata.
import { AdminService } from "./admin.service.js";

@Resolver()
@UseGuards(JwtSessionGuard, AdminGuard)
export class AdminResolver {
  constructor(private readonly adminService: AdminService) {}

  @Query(() => [AdminUser])
  adminUsers() {
    return this.adminService.listUsers();
  }

  @Query(() => [AdminInvite])
  adminInvites() {
    return this.adminService.listInvites();
  }

  @Query(() => AdminSyncStatus)
  adminSyncStatus() {
    return this.adminService.syncStatus();
  }

  @Mutation(() => AdminUser)
  adminCreateUser(
    @Args("input", { type: () => AdminCreateUserInput })
    input: AdminCreateUserInput,
  ) {
    return this.adminService.createUser(input as AdminCreateUserRequest);
  }

  @Mutation(() => AdminUser)
  adminUpdateUser(
    @Context("req") request: RequestWithUser,
    @Args("uuid", { type: () => ID }) uuid: string,
    @Args("input", { type: () => AdminUpdateUserInput })
    input: AdminUpdateUserInput,
  ) {
    return this.adminService.updateUser(
      requiredUser(request),
      uuid,
      input as AdminUpdateUserRequest,
    );
  }

  @Mutation(() => Boolean)
  adminDeleteUser(
    @Context("req") request: RequestWithUser,
    @Args("uuid", { type: () => ID }) uuid: string,
  ) {
    return this.adminService.deleteUser(requiredUser(request), uuid);
  }

  @Mutation(() => AdminRotateTokenPayload)
  adminRotateUserToken(@Args("uuid", { type: () => ID }) uuid: string) {
    return this.adminService.rotateUserToken(uuid);
  }

  @Mutation(() => AdminInvite)
  adminRotateInvite(@Args("userUuid", { type: () => ID }) userUuid: string) {
    return this.adminService.rotateInvite(userUuid);
  }

  @Mutation(() => Boolean)
  adminTriggerSync(@Context("req") request: RequestWithUser) {
    return this.adminService.triggerSync(requiredUser(request));
  }
}

function requiredUser(request: RequestWithUser) {
  if (!request.user) {
    throw new Error("expected authenticated request user");
  }

  return request.user;
}
