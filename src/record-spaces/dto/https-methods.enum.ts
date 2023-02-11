import { registerEnumType } from "@nestjs/graphql";

export enum HTTP_METHODS {
  GET = 'GET',
  POST = 'POST',
}

registerEnumType(HTTP_METHODS, {
  name: 'HTTPMethods',
});