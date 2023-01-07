import { CustomLogger as Logger } from '@/logger/logger.service';
import { RecordStructure } from "@/record-spaces/entities/record-structure.entity";
import * as fnvPlus from "fnv-plus"

export const getRecordStructureHash = (recordStructure: RecordStructure[], logger: Logger) => {
    logger.debug("getRecordStructureHash")
    console.time("timeHash")
    const hash = fnvPlus.hash(JSON.stringify(recordStructure), 64);
    console.timeEnd("timeHash")

    return hash.str()
}
