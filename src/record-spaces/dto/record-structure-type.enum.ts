import { registerEnumType } from "@nestjs/graphql";

export enum RecordStructureType {
  TEXT = "TEXT",
  NUMBER = "NUMBER",
  BOOLEAN = "BOOLEAN",
  ARRAY = "ARRAY",
}

registerEnumType(RecordStructureType, {
  name: 'RecordStructureType',
});