import { RecordSpacesService } from '@/record-spaces/record-spaces.service';
import { Injectable } from '@nestjs/common';
import { CustomLogger as Logger } from '@/logger/logger.service';
import { throwBadRequest } from '@/utils/exceptions';
import { RecordsService } from '@/records/records.service';
import { formatRecordForEpResponse, prepareRecordQuery, prepareRecordDocument, validateInBulk } from './utils';
import { MongoDocWithTimeStamps, RequestWithEmail } from '@/types';
import { UpdateRecordDto } from './dto/update-record.dto';
import { isMongoId, IsMongoId, isNotEmpty, validate } from 'class-validator';

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
        const { preparedRecordQuery } = await this.prepare(recordSpaceSlug, { recordQuery: query });
        const records = await this.recordsService.getRecords(preparedRecordQuery, true);
        if (!records) {
            throwBadRequest(`No records found for ${recordSpaceSlug}`);
        }
        return records.map(formatRecordForEpResponse);
    }

    async deleteRecord(recordSpaceSlug: string, recordId: string, req: RequestWithEmail) {
        this.logger.sLog({ recordSpaceSlug, recordId, userId: req.user._id }, "EpService:deleteRecord");
        validateInBulk([{ validation: isNotEmpty, message: "should be Defined" }, { validation: isMongoId, message: "should be a mongoid" }], { recordId, userId: req.user._id});
        return this.recordsService.deleteRecord(recordId, { slug: recordSpaceSlug, user: req.user._id});
    }

    async getRecord(recordSpaceSlug: string, query: Record<string, string>) {
        this.logger.sLog({ recordSpaceSlug, query }, "EpService:getRecord");
        const { preparedRecordQuery } = await this.prepare(recordSpaceSlug, { recordQuery: query });
        const record = await this.recordsService.getRecord(preparedRecordQuery, true);
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

        const { preparedRecordDocument } = await this.prepare(recordSpaceSlug, { recordDocument: body });
        const record = await this.recordsService.create(preparedRecordDocument as any, req.user._id);
        if (!record) {
            throwBadRequest(`No record found for ${recordSpaceSlug}`);
        }
        return formatRecordForEpResponse(record as MongoDocWithTimeStamps<typeof record>);
    }

    async updateRecord({ id, recordSpaceSlug }: UpdateRecordDto, body: Record<string, string>) {
        this.logger.sLog({ id, recordSpaceSlug, body }, "EpService:addRecord");

        if (Array.isArray(body)) {
            throwBadRequest(`Body can't be an array`);
        }

        const { preparedRecordDocument } = await this.prepare(recordSpaceSlug, { recordDocument: body });
        const record = await this.recordsService.updateRecord(id, preparedRecordDocument);
        if (!record) {
            throwBadRequest(`No record found for ${recordSpaceSlug}`);
        }
        return formatRecordForEpResponse(record as MongoDocWithTimeStamps<typeof record>);
    }

    private async prepare(recordSpaceSlug: string, { recordQuery, recordDocument }: Partial<{ recordQuery: Record<string, string>, recordDocument: Record<string, string> }>) {

        const getIdFromSlug = async (slug: string) => {
            const res = await this.recordSpacesService.findOne({ slug }, { _id: 1 });
            this.logger.sLog({ res }, "EpService:getIdFromSlug");
            if (!res) {
                throwBadRequest(`Record space with slug ${slug} not found`);
            };
            return res._id;
        };

        const getDbResources = async (recordSpaceSlug: string) => {
            const recordSpaceId = await getIdFromSlug(recordSpaceSlug);
            const fieldsDetailsFromDb = await this.recordSpacesService.getFields({ recordSpace: recordSpaceId });
            return { recordSpaceId, fieldsDetailsFromDb };
        }

        const { recordSpaceId, fieldsDetailsFromDb } = await getDbResources(recordSpaceSlug);


        const ret: Partial<{ preparedRecordQuery: ReturnType<typeof prepareRecordQuery>, preparedRecordDocument: ReturnType<typeof prepareRecordDocument> }> = {};

        if (recordQuery) {
            ret.preparedRecordQuery = prepareRecordQuery(recordSpaceSlug, recordSpaceId, recordQuery, fieldsDetailsFromDb, this.logger);
        }

        if (recordDocument) {
            ret.preparedRecordDocument = prepareRecordDocument(recordSpaceId, recordDocument, fieldsDetailsFromDb, this.logger)
        }

        return ret;
    }


}
