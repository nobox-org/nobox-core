import { RecordSpacesService } from '@/record-spaces/record-spaces.service';
import { Injectable } from '@nestjs/common';
import { CustomLogger as Logger } from '@/logger/logger.service';
import { throwBadRequest } from '@/utils/exceptions';
import { RecordsService } from '@/records/records.service';
import { formatRecordForEpResponse, prepareRecordQuery, prepareRecordDocument } from './utils';
import { MongoDocWithTimeStamps, RequestWithEmail } from '@/types';
import { UpdateRecordDto } from './dto/update-record.dto';

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

    async addRecords(recordSpaceSlug: string, bodyArray: Record<string, string>[], req: RequestWithEmail) {
        this.logger.sLog({ recordSpaceSlug, bodyArray }, "EpService:addRecord");
        if (!Array.isArray(bodyArray)) {
            throwBadRequest(`Body must be an array`);
        }

        if (bodyArray.length === 0) {
            throwBadRequest(`Array should not be empty`);
        }

        return Promise.all(bodyArray.map(body => this.addRecord(recordSpaceSlug, body, req)));
    }

    async addRecord(recordSpaceSlug: string, body: Record<string, string>, req: RequestWithEmail) {
        this.logger.sLog({ recordSpaceSlug, body }, "EpService:addRecord");

        if (Array.isArray(body)) {
            throwBadRequest(`Body can't be an array`);
        }

        const preparedDocument = await this.prepareRecordDocument(recordSpaceSlug, body);
        const record = await this.recordsService.create(preparedDocument, req.user._id);
        if (!record) {
            throwBadRequest(`No record found for ${recordSpaceSlug}`);
        }
        return formatRecordForEpResponse(record as MongoDocWithTimeStamps<typeof record>);
    }

    async updateRecord({ id, recordSpaceSlug }: UpdateRecordDto, body: Record<string, string>, req: RequestWithEmail) {
        this.logger.sLog({ recordSpaceSlug, body }, "EpService:addRecord");

        if (Array.isArray(body)) {
            throwBadRequest(`Body can't be an array`);
        }

        const preparedDocument = await this.prepareRecordDocument(recordSpaceSlug, body);
        const record = await this.recordsService.create(preparedDocument, req.user._id);
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

    private async prepareRecordDocument(recordSpaceSlug: string, body: Record<string, string>) {
        const { recordSpaceId, fieldsDetailsFromDb } = await this.getDbResources(recordSpaceSlug);
        return prepareRecordDocument(recordSpaceId, body, fieldsDetailsFromDb, this.logger);
    }

}
