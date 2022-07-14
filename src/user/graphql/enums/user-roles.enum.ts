import { registerEnumType } from "@nestjs/graphql";

export enum UserRoles {
  OWNER = "Owner",
  ADMIN = "Admin",
  USER =  "User",
}

registerEnumType(UserRoles, {
  name: 'UserRoles',
});