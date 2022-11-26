import { registerEnumType } from "@nestjs/graphql";

export enum RecordStructureType {
  TEXT = "TEXT",
  NUMBER = "NUMBER",
}

registerEnumType(RecordStructureType, {
  name: 'RecordStructureType',
});