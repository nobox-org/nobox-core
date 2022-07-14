import { registerEnumType } from "@nestjs/graphql";

export enum RecordStructureType {
  TEXT = "text",
  NUMBER = "number",
}

registerEnumType(RecordStructureType, {
  name: 'RecordStructureType',
});