import { RecordSpacesService } from '@/record-spaces/record-spaces.service';
import { Injectable } from '@nestjs/common';
import { CustomLogger as Logger } from '@/logger/logger.service';
import { throwBadRequest } from '@/utils/exceptions';
import { RecordsService } from '@/records/records.service';
import { formatRecordForEpResponse, prepareRecordQuery } from './utils';
import { MongoDocWithTimeStamps } from '@/types';

@Injectable()
export class EpService {
    constructor(
        private recordSpacesService: RecordSpacesService,
        private recordsService: RecordsService,
        private logger: Logger
    ) {
    }

    async getRecords(recordSpaceSlug: string, query: Record<string, string>) {
        this.logger.sLog({ recordSpaceSlug, query }, "EpService:getRecords");
        const preparedQuery = await this.prepareRecordQuery(recordSpaceSlug, query);
        const records = await this.recordsService.getRecords(preparedQuery, true);
        if (!records) {
            throwBadRequest(`No records found for ${recordSpaceSlug}`);
        }
        return records.map(formatRecordForEpResponse);
    }

    async getRecord(recordSpaceSlug: string, query: Record<string, string>) {
        this.logger.sLog({ recordSpaceSlug, query }, "EpService:getRecord");
        const preparedQuery = await this.prepareRecordQuery(recordSpaceSlug, query);
        const record = await this.recordsService.getRecord(preparedQuery, true);
        if (!record) {
            throwBadRequest(`No record found for ${recordSpaceSlug}`);
        }
        return formatRecordForEpResponse(record as MongoDocWithTimeStamps<typeof record>);
    }

    private async getIdFromSlug(slug: string) {
        const res = await this.recordSpacesService.findOne({ slug }, { _id: 1 });
        this.logger.sLog({ res }, "EpService:getIdFromSlug");
        if (!res) {
            throwBadRequest(`Record space with slug ${slug} not found`);
        };
        return res._id;
    }

    private async getDbResources(recordSpaceSlug: string) {
        const recordSpaceId = await this.getIdFromSlug(recordSpaceSlug);
        const fieldsDetailsFromDb = await this.recordSpacesService.getFields({ recordSpace: recordSpaceId });
        return { recordSpaceId, fieldsDetailsFromDb };
    }

    private async prepareRecordQuery(recordSpaceSlug: string, query: Record<string, string>) {
        const { recordSpaceId, fieldsDetailsFromDb } = await this.getDbResources(recordSpaceSlug);
        return prepareRecordQuery(recordSpaceSlug, recordSpaceId, query, fieldsDetailsFromDb, this.logger);
    }


}
