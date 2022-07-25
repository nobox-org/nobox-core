import { registerEnumType } from "@nestjs/graphql";

export enum ACTION_SCOPE {
  ALL_OTHER_RECORD_SPACES = 'ALL_OTHER_RECORD_SPACES',
  JUST_THIS_RECORD_SPACE = 'JUST_THIS_RECORD_SPACE',
}


registerEnumType(ACTION_SCOPE, {
  name: 'ACTION_SCOPE',
});