import { registerEnumType } from "@nestjs/graphql";

export enum AuthOptionsScope {
  FIND = "find",
  UPDATE = "update",
  INSERT = "insert",
  DELETE = "delete",
}

registerEnumType(AuthOptionsScope, {
  name: "AuthOptionsScope",
}); 