import type { UserRole } from "@box-winder/contracts";

export type RequestUser = {
  uuid: string;
  email: string;
  name: string;
  role: UserRole;
  sessionUuid: string;
};

export type RequestWithUser = {
  headers?: Record<string, string | string[] | undefined>;
  user?: RequestUser;
};
