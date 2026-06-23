import type { UserRole } from "@box-winder/contracts";
import {
  Field,
  GraphQLISODateTime,
  ID,
  InputType,
  ObjectType,
  registerEnumType,
} from "@nestjs/graphql";

export enum GraphqlUserRole {
  admin = "admin",
  user = "user",
}

registerEnumType(GraphqlUserRole, {
  name: "UserRole",
});

@InputType()
export class RegisterInput {
  @Field()
  name!: string;

  @Field()
  email!: string;

  @Field()
  password!: string;

  @Field()
  inviteCode!: string;
}

@InputType()
export class LoginInput {
  @Field()
  email!: string;

  @Field()
  password!: string;
}

@ObjectType()
export class AuthUser {
  @Field(() => ID)
  uuid!: string;

  @Field()
  name!: string;

  @Field()
  email!: string;

  @Field(() => GraphqlUserRole)
  role!: UserRole;

  @Field()
  tokenPrefix!: string;
}

@ObjectType()
export class AuthPayload {
  @Field(() => AuthUser)
  user!: AuthUser;

  @Field()
  accessToken!: string;

  @Field()
  expiresIn!: string;
}

@ObjectType()
export class CurrentUser {
  @Field(() => ID)
  uuid!: string;

  @Field()
  email!: string;

  @Field()
  name!: string;

  @Field(() => GraphqlUserRole)
  role!: UserRole;

  @Field(() => ID)
  sessionUuid!: string;
}

@ObjectType()
export class AdminUser {
  @Field(() => ID)
  uuid!: string;

  @Field()
  email!: string;

  @Field()
  name!: string;

  @Field(() => GraphqlUserRole)
  role!: UserRole;

  @Field()
  enabled!: boolean;

  @Field()
  tokenPrefix!: string;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt!: Date;

  @Field(() => GraphQLISODateTime)
  tokenRotatedAt!: Date;
}

@InputType()
export class AdminCreateUserInput {
  @Field()
  name!: string;

  @Field()
  email!: string;

  @Field()
  password!: string;

  @Field(() => GraphqlUserRole, { nullable: true })
  role?: UserRole;

  @Field({ nullable: true })
  enabled?: boolean;
}

@InputType()
export class AdminUpdateUserInput {
  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  email?: string;

  @Field(() => GraphqlUserRole, { nullable: true })
  role?: UserRole;

  @Field({ nullable: true })
  enabled?: boolean;
}

@ObjectType()
export class AdminRotateTokenPayload {
  @Field(() => ID)
  uuid!: string;

  @Field()
  tokenPrefix!: string;

  @Field(() => GraphQLISODateTime)
  tokenRotatedAt!: Date;
}

@ObjectType()
export class AdminInvite {
  @Field(() => ID)
  userUuid!: string;

  @Field()
  email!: string;

  @Field()
  name!: string;

  @Field({ nullable: true })
  code!: string | null;

  @Field(() => GraphQLISODateTime, { nullable: true })
  createdAt!: Date | null;

  @Field(() => GraphQLISODateTime, { nullable: true })
  rotatedAt!: Date | null;
}

@ObjectType()
export class AdminSyncStatus {
  @Field()
  status!: string;

  @Field(() => ID, { nullable: true })
  lastEventUuid!: string | null;

  @Field(() => GraphQLISODateTime, { nullable: true })
  lastSuccessAt!: Date | null;

  @Field(() => GraphQLISODateTime, { nullable: true })
  lastFailureAt!: Date | null;

  @Field({ nullable: true })
  lastError!: string | null;

  @Field(() => GraphQLISODateTime)
  updatedAt!: Date;
}
