import { registerEnumType } from "@nestjs/graphql";

export enum RecordStructureType {
  TEXT = "TEXT",
  NUMBER = "NUMBER",
  BOOLEAN = "BOOLEAN",
}

registerEnumType(RecordStructureType, {
  name: 'RecordStructureType',
});