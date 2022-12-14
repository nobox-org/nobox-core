
import { Inject } from '@nestjs/common';
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
import { Context, EpCompositeArgs, MongoDocWithTimeStamps, RecordSpaceWithRecordFields, RequestWithEmail } from '@/types';
import { arrayNotEmpty, isArray, isMongoId, isNotEmpty } from 'class-validator';
import { User } from '../user/graphql/model';
import { BaseRecordSpaceSlugDto } from './dto/base-record-space-slug.dto';
import { Record as _Record } from '@/schemas';
import { preOperate, handlePreOperation } from './decorators/preOperate';
import { FunctionDto } from './dto/function.dto';
import { loginFunctionMetaData, loginFunctionResources } from '@/functions/login/metadata';
import { REQUEST } from '@nestjs/core';
import { isEmpty } from 'lodash';
import { CreateRecordSpaceInput } from '@/record-spaces/dto/create-record-space.input';
import { bcryptAbs, getRecordStructureHash } from '@/utils';
import { EpServiceMongoSyntaxUtil } from './ep.service.utils.mongo-syntax';
import { ProjectsService } from '@/projects/projects.service';


@handlePreOperation()
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

    @preOperate()
    async getRecords(args: {
        params: { recordSpaceSlug: string; projectSlug: string };
        query: Record<string, string>;
        user: User;
    }) {
        this.logger.sLog(args, 'EpService:getRecords');
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
            throwBadRequest(
                `No records found for project: ${projectSlug}, recordSpaceSlug: ${recordSpaceSlug}`,
            );
        }
        return Promise.all(records.map(record => formatAndCompareRecord({ record, allHashedFieldsInQuery }, this.logger)));
    }

    @preOperate()
    async deleteRecord(
        recordSpaceSlug: string,
        recordId: string,
        req: RequestWithEmail,
    ) {
        this.logger.sLog(
            { recordSpaceSlug, recordId, userId: req.user._id },
            'EpService:deleteRecord',
        );
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

    @preOperate()
    async getRecord(args: {
        params: { recordSpaceSlug: string; projectSlug: string };
        query: Record<string, string>;
        user: User;
    }) {
        this.logger.sLog(args, 'EpService:getRecord');

        const {
            params: { recordSpaceSlug, projectSlug },
            query,
            user,
        } = args;

        const { paramRelationship } = this.context.trace.clientCall.options;

        const { recordQuerySyntax, allHashedFieldsInQuery } = await this.mongoSyntaxUtil.createSyntax({ recordQuery: query, user, paramRelationship });

        console.log({ allHashedFieldsInQuery });
        const record = await this.recordsService.getRecord({
            query: recordQuerySyntax,
        });

        if (!record) {
            throwBadRequest(
                `No matching record found for project: ${projectSlug}, recordSpaceSlug: ${recordSpaceSlug}`,
            );
        }

        return formatAndCompareRecord({
            record,
            allHashedFieldsInQuery
        },
            this.logger
        );
    }

    @preOperate()
    async addRecords(
        recordSpaceSlug: string,
        projectSlug: string,
        bodyArray: Record<string, string>[],
        req: RequestWithEmail,
    ) {
        this.logger.sLog({ recordSpaceSlug, bodyArray }, 'EpService:addRecord');

        assertValidation({ validation: isArray, message: "must be an array" }, bodyArray, "Body");
        assertValidation({ validation: arrayNotEmpty, message: "should not be empty" }, bodyArray, "Body");

        return Promise.all(
            bodyArray.map(body =>
                this.addRecord(recordSpaceSlug, projectSlug, body, req),
            ),
        );
    }

    @preOperate()
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

    @preOperate()
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



    async processFunction(args: EpCompositeArgs<FunctionDto>) {
        const { req, params: receivedParams, body: receivedBody } = args;
        this.logger.sLog(
            args,
            'EpService:processFunction',
        );

        const { projectSlug, functionName } = receivedParams;
        const { user } = req;
        const { _id: projectId } = await this.projectService.assertProjectExistence({ projectSlug, userId: user._id });

        const { headers } = this.context;
        const { "function-resources": functionResources } = headers;

        if (functionName === "Login") {
            const { payload } = loginFunctionMetaData;
            const { authRecordSpaceSlug } = functionResources.login as loginFunctionResources;

            const authRecordSpace = await this.recordSpacesService.findOne({
                query: { slug: authRecordSpaceSlug },
                user,
                projectSlug,
                populate: "recordFields",
                projectId
            }) as RecordSpaceWithRecordFields;

            if (!authRecordSpace) {
                throwBadRequest(`RecordSpace: ${authRecordSpace} does not exist for Login Function `)
            }

            const { body } = payload;

            for (const key in body) {
                const { required } = body[key];
                if (required && !receivedBody[key]) {
                    throwBadRequest(`Absent Body Item, ${key}`);
                }
            }
        }
    }

    private async preOperation(_args: any[]) {
        const { args, headers, params, query, body, user, trace } = this.context;
        this.logger.sLog(
            { args, query, params, headers, user, body, trace },
            'EpService:preOperation'
        );

        const userId = user._id;

        const { "auto-create-project": autoCreateProject, "auto-create-record-space": autoCreateRecordSpace, structure, options, "function-resources": functionResources } = headers;

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

            validateFieldType({ recordStructure, fields: fieldsToConsider, logger: this.logger });

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
                    const { recordStructureHash: existingRecordStructureHash } = recordSpace
                    const presentRecordStructureHash = getRecordStructureHash(recordStructure, this.logger);

                    const newRecordStructureIsDetected = existingRecordStructureHash !== presentRecordStructureHash;
                    this.logger.sLog({ new: recordStructure, existingRecordStructureHash, presentRecordStructureHash }, newRecordStructureIsDetected ? "newRecordStructure detected" : "same old recordStructure");

                    if (newRecordStructureIsDetected) {
                        latestRecordSpace = await this.recordSpacesService.createFieldsFromNonIdProps(
                            {
                                recordSpaceSlug,
                                recordStructure,
                                projectSlug,
                            },
                            user,
                            recordSpace,
                        );
                    }

                    break;
                }
            }
            this.context.trace.recordSpace = latestRecordSpace;

        }
    }
}
