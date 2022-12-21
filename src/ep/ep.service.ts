
import { Inject, Injectable, Scope } from '@nestjs/common';
import { RecordSpacesService } from '@/record-spaces/record-spaces.service';
import { CustomLogger as Logger } from '@/logger/logger.service';
import { throwBadRequest } from '@/utils/exceptions';
import { RecordsService } from '@/records/records.service';
import {
    formatAndCompareRecord,
    validateInBulk,
    assertValidation,
    validateFieldType,
} from './utils';
import { Context, MongoDocWithTimeStamps, ParamRelationship, RecordSpaceWithRecordFields, RequestWithEmail } from '@/types';
import { arrayNotEmpty, isArray, isMongoId, isNotEmpty } from 'class-validator';
import { User } from '../user/graphql/model';
import { BaseRecordSpaceSlugDto } from './dto/base-record-space-slug.dto';
import { Record as _Record, RecordSpace } from '@/schemas';
import { FunctionDto } from './dto/function.dto';
import { REQUEST } from '@nestjs/core';
import { isEmpty, update, xor } from 'lodash';
import { CreateRecordSpaceInput } from '@/record-spaces/dto/create-record-space.input';
import { getRecordStructureHash } from '@/utils';
import { EpServiceMongoSyntaxUtil } from './ep.service.utils.mongo-syntax';
import { ProjectsService } from '@/projects/projects.service';
import { RecordStructure } from '@/record-spaces/entities/record-structure.entity';

@Injectable({ scope: Scope.REQUEST })
export class EpService {
    constructor(
        @Inject(REQUEST) private context: Context,
        private recordSpacesService: RecordSpacesService,
        private recordsService: RecordsService,
        private projectService: ProjectsService,
        private mongoSyntaxUtil: EpServiceMongoSyntaxUtil,
        private logger: Logger,
    ) {
    }

    async getRecords(args: {
        params: { recordSpaceSlug: string; projectSlug: string };
        query: Record<string, string>;
        user: User;
    }) {
        this.logger.sLog(args, 'EpService:getRecords');
        await this.preOperation();
        const {
            params: { recordSpaceSlug, projectSlug },
            query,
            user,
        } = args;

        const { paramRelationship } = this.context.trace.clientCall.options;

        const { recordQuerySyntax, allHashedFieldsInQuery } = await this.mongoSyntaxUtil.createSyntax({ recordQuery: query, user, paramRelationship });

        const records = await this.recordsService.getRecords({
            query: recordQuerySyntax,
            recordSpaceSlug,
            projectSlug,
            userId: user._id,
        });

        if (!records) {
            this.logger.debug(`No records found for project: ${projectSlug}, recordSpaceSlug: ${recordSpaceSlug}`, 'EpService:getRecords')
            throwBadRequest(
                `No records found for your request`,
            );
        }


        const formattedRecords = await Promise.all(records.map(record => formatAndCompareRecord({ record, allHashedFieldsInQuery }, this.logger)).filter(record => record !== null))

        if (formattedRecords.length === 0) {
            this.logger.debug(`No records found after formatting for project : ${projectSlug}, recordSpaceSlug: ${recordSpaceSlug}`, 'EpService:getRecords')
            throwBadRequest(
                `No records found for your request`,
            );
        }

        return formattedRecords;
    }

    async deleteRecord(
        recordSpaceSlug: string,
        recordId: string,
        req: RequestWithEmail,
    ) {
        this.logger.sLog(
            { recordSpaceSlug, recordId, userId: req.user._id },
            'EpService:deleteRecord',
        );
        await this.preOperation();
        validateInBulk(
            [
                { validation: isNotEmpty, message: 'should be Defined' },
                { validation: isMongoId, message: 'should be a mongoid' },
            ],
            { recordId, userId: req.user._id },
        );
        return this.recordsService.deleteRecord(
            recordId,
        );
    }

    async getRecord(
        args: {
            params: { recordSpaceSlug: string; projectSlug: string };
            query: Record<string, string>;
            user: User;
        },
        options?: { skipPreOperation: boolean, paramRelationship?: ParamRelationship }) {
        this.logger.sLog({ args, options }, 'EpService::getRecord');

        const { skipPreOperation, paramRelationship: optionsParamRelationship = "And" } = options;
        !skipPreOperation && await this.preOperation();
        const paramRelationship = !skipPreOperation ? this.context.trace.clientCall.options.paramRelationship : optionsParamRelationship;

        const {
            params: { recordSpaceSlug, projectSlug },
            query,
            user,
        } = args;

        const { recordQuerySyntax, allHashedFieldsInQuery } = await this.mongoSyntaxUtil.createSyntax({ recordQuery: query, user, paramRelationship });

        const record = await this.recordsService.getRecord({
            query: recordQuerySyntax,
        });

        if (!record) {
            this.logger.debug(`No records found for project: ${projectSlug}, recordSpaceSlug: ${recordSpaceSlug}`, 'EpService:getRecord')
            throwBadRequest(
                `No records found for your request`,
            );
        }

        const formattedRecord = formatAndCompareRecord({
            record,
            allHashedFieldsInQuery
        },
            this.logger
        );

        if (!formattedRecord) {
            this.logger.debug(`No records found after formatting for project : ${projectSlug}, recordSpaceSlug: ${recordSpaceSlug}`, 'EpService:getRecords')
            throwBadRequest(
                `No records found for your request`,
            );

        }


        return formattedRecord;

    }

    async addRecords(
        recordSpaceSlug: string,
        projectSlug: string,
        bodyArray: Record<string, string>[],
        req: RequestWithEmail,
    ) {
        this.logger.sLog({ recordSpaceSlug, bodyArray }, 'EpService:addRecord');
        await this.preOperation();

        assertValidation({ validation: isArray, message: "must be an array" }, bodyArray, "Body");
        assertValidation({ validation: arrayNotEmpty, message: "should not be empty" }, bodyArray, "Body");

        return Promise.all(
            bodyArray.map(body =>
                this.addRecord(recordSpaceSlug, projectSlug, body, req),
            ),
        );
    }

    async addRecord(
        recordSpaceSlug: string,
        projectSlug: string,
        body: Record<string, string>,
        req: RequestWithEmail,
    ) {
        this.logger.sLog(
            { recordSpaceSlug, projectSlug, body, user: req.user },
            'EpService:addRecord',
        );
        await this.preOperation();

        assertValidation({ validation: (v) => !Array.isArray(v), message: "can't be an array" }, body, "Body");
        assertValidation({ validation: (v) => !(Object.keys(v).length === 0), message: "should not be empty" }, body, "Body");

        const { recordCommandSyntax } = await this.mongoSyntaxUtil.createSyntax({
            recordDocument: body,
            user: req.user,
        });

        const record = await this.recordsService.create(
            { ...recordCommandSyntax, recordSpaceSlug, projectSlug },
            req.user._id,
            this.context.trace.recordSpace
        ) as MongoDocWithTimeStamps<_Record>;

        if (!record) {
            throwBadRequest(`No record found for ${recordSpaceSlug}`);
        }

        return formatAndCompareRecord({ record }, this.logger);
    }

    async updateRecord(
        id: string,
        { recordSpaceSlug, projectSlug }: BaseRecordSpaceSlugDto,
        body: Record<string, string>,
        req: RequestWithEmail,
    ) {
        this.logger.sLog(
            { id, recordSpaceSlug, body, projectSlug },
            'EpService:updateRecord',
        );
        await this.preOperation();

        if (Array.isArray(body)) {
            throwBadRequest(`Body can't be an array`);
        }

        if (Object.keys(body).length === 0) {
            throwBadRequest(`Body should not be empty`);
        }

        const { recordCommandSyntax } = await this.mongoSyntaxUtil.createSyntax({
            recordDocument: body,
            user: req.user,
            requiredFieldsAreOptional: true
        }
        );

        const record = await this.recordsService.updateRecord(
            id,
            recordCommandSyntax,
        ) as MongoDocWithTimeStamps<_Record>;

        if (!record) {
            throwBadRequest(`No record found for ${recordSpaceSlug}`);
        }

        return formatAndCompareRecord({
            record
        }, this.logger
        );
    }

    private async preOperation() {
        const { args, headers, params, query, body, user, trace } = this.context;
        this.logger.sLog(
            { args, query, params, headers, user, body, trace },
            'EpService:preOperation'
        );

        const userId = user._id;

        const { "auto-create-project": autoCreateProject, "auto-create-record-space": autoCreateRecordSpace, structure, options } = headers;

        if (options) {
            this.context.trace.clientCall = { options: JSON.parse(options) };
        }

        const fieldsToConsider = !isEmpty(query) ? query : body;

        const { isQuery: requestIsAQuery } = trace;

        if (!requestIsAQuery && isEmpty(fieldsToConsider)) {
            this.logger.sLog({ query, body }, "EpService:preOperation:: Both query and body parameters are empty");
            throwBadRequest("Absent Fields");
        }


        if (autoCreateRecordSpace === 'true') {

            if (!structure) {
                throwBadRequest("Structure is absent")
            }

            this.logger.sLog(structure, "EpService::preOperation")

            const objectifiedStructure = JSON.parse(
                structure,
            ) as CreateRecordSpaceInput;

            const {
                slug: recordSpaceSlug,
                recordStructure,
                projectSlug,
            } = objectifiedStructure;

            const project = await this.projectService.assertProjectExistence({ projectSlug, userId }, { autoCreate: autoCreateProject })

            const { typeErrors } = validateFieldType({ recordStructure, fields: fieldsToConsider, logger: this.logger });
            if (typeErrors.length) {
                this.logger.sLog({ typeErrors }, "EpService::preOperation: typeErrors ocurred")
                throwBadRequest(typeErrors);
            }

            const { _id: projectId } = project;

            const recordSpace = await this.recordSpacesService.findOne({
                query: { slug: recordSpaceSlug },
                user,
                projectSlug,
                populate: "recordFields",
                projectId
            }) as RecordSpaceWithRecordFields;

            const recordSpaceExists = !!recordSpace;

            this.logger.sLog(
                { recordSpaceExists },
                'EpService::preOperation;create:true',
            );

            let latestRecordSpace = recordSpace;

            switch (recordSpaceExists) {
                case false: {
                    latestRecordSpace = await this.recordSpacesService.create(
                        objectifiedStructure as CreateRecordSpaceInput,
                        userId,
                        projectId,
                        true
                    );
                    break;
                }
                default: {
                    const updatedRecordSpace = await this.recordSpacesService.updateRecordSpaceStructureByHash({
                        recordSpace,
                        recordStructure
                    })

                    if (updatedRecordSpace) {
                        latestRecordSpace = updatedRecordSpace;
                    }

                    break;
                }
            }
            this.context.trace.recordSpace = latestRecordSpace;

        }
    }
}
