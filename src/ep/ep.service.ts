import { RecordSpacesService } from '@/record-spaces/record-spaces.service';
import { Inject, Injectable, Scope } from '@nestjs/common';
import { CustomLogger as Logger } from '@/logger/logger.service';
import { throwBadRequest } from '@/utils/exceptions';
import { RecordsService } from '@/records/records.service';
import { formatRecordForEpResponse, prepareRecordQuery, prepareRecordDocument, validateInBulk } from './utils';
import { MongoDocWithTimeStamps, RequestWithEmail } from '@/types';
import { isMongoId, isNotEmpty } from 'class-validator';
import { User } from '../user/graphql/model';
import { BaseRecordSpaceSlugDto } from './dto/base-record-space-slug.dto';
import { handleOperation } from './decorators/handleOperation';
import { CONTEXT } from '@nestjs/graphql';

@Injectable({ scope: Scope.REQUEST })
@handleOperation()
export class EpService {
    constructor(
        @Inject(CONTEXT) private context,
        private recordSpacesService: RecordSpacesService,
        private recordsService: RecordsService,
        private logger: Logger,
    ) {


    }

    async getRecords(args: { params: { recordSpaceSlug: string, projectSlug: string }, query: Record<string, string>, user: User }) {
        this.logger.sLog(args, "EpService:getRecords");
        const { params: { recordSpaceSlug, projectSlug }, query, user } = args;
        const { preparedRecordQuery } = await this.prepare(recordSpaceSlug, projectSlug, { recordQuery: query, user }, true);
        const records = await this.recordsService.getRecords({ query: preparedRecordQuery, recordSpaceSlug, projectSlug, userId: user._id });
        if (!records) {
            throwBadRequest(`No records found for project: ${projectSlug}, recordSpaceSlug: ${recordSpaceSlug}`);
        }
        return records.map(formatRecordForEpResponse);
    }

    async deleteRecord(recordSpaceSlug: string, projectSlug: string, recordId: string, req: RequestWithEmail) {
        this.logger.sLog({ recordSpaceSlug, recordId, userId: req.user._id }, "EpService:deleteRecord");
        validateInBulk([{ validation: isNotEmpty, message: "should be Defined" }, { validation: isMongoId, message: "should be a mongoid" }], { recordId, userId: req.user._id });
        return this.recordsService.deleteRecord(recordId, { slug: recordSpaceSlug }, projectSlug, req.user);
    }

    async getRecord(args: { params: { recordSpaceSlug: string, projectSlug: string }, query: Record<string, string>, user: User }) {
        this.logger.sLog(args, "EpService:getRecord");
        const { params: { recordSpaceSlug, projectSlug }, query, user } = args;
        const { preparedRecordQuery } = await this.prepare(recordSpaceSlug, projectSlug, { recordQuery: query, user }, false);
        const record = await this.recordsService.getRecord({ query: preparedRecordQuery, recordSpaceSlug, projectSlug, userId: user._id });
        if (!record) {
            throwBadRequest(`No record found for project: ${projectSlug}, recordSpaceSlug: ${recordSpaceSlug}`);
        }
        return formatRecordForEpResponse(record as MongoDocWithTimeStamps<typeof record>);
    }

    async addRecords(recordSpaceSlug: string, projectSlug: string, bodyArray: Record<string, string>[], req: RequestWithEmail) {
        this.logger.sLog({ recordSpaceSlug, bodyArray }, "EpService:addRecord");
        if (!Array.isArray(bodyArray)) {
            throwBadRequest(`Body must be an array`);
        }

        if (bodyArray.length === 0) {
            throwBadRequest(`Array should not be empty`);
        }

        return Promise.all(bodyArray.map(body => this.addRecord(recordSpaceSlug, projectSlug, body, req)));
    }

    async addRecord(recordSpaceSlug: string, projectSlug: string, body: Record<string, string>, req: RequestWithEmail) {
        this.logger.sLog({ recordSpaceSlug, projectSlug, body, user: req.user }, "EpService:addRecord");

        if (Array.isArray(body)) {
            throwBadRequest(`Body can't be an array`);
        }

        if (Object.keys(body).length === 0) {
            throwBadRequest(`Body should not be empty`);
        }

        const { preparedRecordDocument } = await this.prepare(recordSpaceSlug, projectSlug, { recordDocument: body, user: req.user });
        const record = await this.recordsService.create({ ...preparedRecordDocument, recordSpaceSlug, projectSlug }, req.user._id);
        if (!record) {
            throwBadRequest(`No record found for ${recordSpaceSlug}`);
        }
        return formatRecordForEpResponse(record as MongoDocWithTimeStamps<typeof record>);
    }

    async updateRecord(id: string, { recordSpaceSlug, projectSlug }: BaseRecordSpaceSlugDto, body: Record<string, string>, req: RequestWithEmail) {
        this.logger.sLog({ id, recordSpaceSlug, body, projectSlug }, "EpService:updateRecord");

        if (Array.isArray(body)) {
            throwBadRequest(`Body can't be an array`);
        }

        if (Object.keys(body).length === 0) {
            throwBadRequest(`Body should not be empty`);
        }

        const { preparedRecordDocument } = await this.prepare(recordSpaceSlug, projectSlug, { recordDocument: body, user: req.user });
        console.log({ preparedRecordDocument })
        const record = await this.recordsService.updateRecord(id, preparedRecordDocument);
        if (!record) {
            throwBadRequest(`No record found for ${recordSpaceSlug}`);
        }

        return formatRecordForEpResponse(record as MongoDocWithTimeStamps<typeof record>);
    }

    private async prepare(recordSpaceSlug: string, projectSlug: string, { recordQuery, recordDocument, user }: Partial<{ recordQuery: Record<string, string>, recordDocument: Record<string, string>, user: User }>, acrossRecords = false) {
        this.logger.sLog({ recordSpaceSlug, projectSlug, recordQuery, recordDocument, user }, "EpService:prepare");
        const getIdFromSlug = async (slug: string, _projectSlug: string) => {
            this.logger.sLog({ recordSpaceSlug: slug, _projectSlug }, "EpService:prepare:getIdFromSlug")

            const res = await this.recordSpacesService.findOne({ query: { slug }, projection: { _id: 1 }, projectSlug: _projectSlug, user });
            this.logger.sLog({ res }, "EpService:getIdFromSlug");
            if (!res) {
                throwBadRequest(`Record space with slug ${slug} not found`);
            };
            return res._id;
        };

        const getDbResources = async (recordSpaceSlug: string, _projectSlug: string) => {
            this.logger.sLog({ recordSpaceSlug, _projectSlug }, "EpService:prepare:getDbResources")
            const recordSpaceId = await getIdFromSlug(recordSpaceSlug, projectSlug);
            const fieldsDetailsFromDb = await this.recordSpacesService.getFields({ recordSpace: recordSpaceId });
            return { recordSpaceId, fieldsDetailsFromDb };
        }

        const { recordSpaceId, fieldsDetailsFromDb } = await getDbResources(recordSpaceSlug, projectSlug);

        const ret: Partial<{ preparedRecordQuery: ReturnType<typeof prepareRecordQuery>, preparedRecordDocument: ReturnType<typeof prepareRecordDocument> }> = {};

        if (recordQuery) {
            ret.preparedRecordQuery = prepareRecordQuery(recordSpaceSlug, recordSpaceId, recordQuery, fieldsDetailsFromDb, this.logger, acrossRecords);
        }

        if (recordDocument) {
            ret.preparedRecordDocument = prepareRecordDocument(recordSpaceId, recordDocument, fieldsDetailsFromDb, this.logger)
        }

        return ret;
    }

    protected preOperation(args: any[]): void {
        const { headers, params, query, body } = this.context;

        const { create } = headers;


        if (create === "true") {

        }

        this.logger.sLog({ headers, params, query, body }, "EpService:preOperation");
    }
}
