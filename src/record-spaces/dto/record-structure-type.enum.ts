import { RecordStructureType } from "@/types";
import { registerEnumType } from "@nestjs/graphql";

registerEnumType(RecordStructureType, {
  name: 'RecordStructureType',
});