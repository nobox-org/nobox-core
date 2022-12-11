
import { Inject, Injectable, Scope } from '@nestjs/common';
import { RecordSpacesService } from '@/record-spaces/record-spaces.service';
import { CustomLogger as Logger } from '@/logger/logger.service';
import { throwBadRequest } from '@/utils/exceptions';
import { RecordsService } from '@/records/records.service';
import {
    formatRecordForEpResponse,
    validateInBulk,
    createMongoDBSyntax,
    assertValidation,
    validateFieldType,
} from './utils';
import { Context, EpCompositeArgs, MongoDocWithTimeStamps, RecordSpaceWithRecordFields, RequestWithEmail } from '@/types';
import { arrayNotEmpty, isArray, isMongoId, isNotEmpty } from 'class-validator';
import { User } from '../user/graphql/model';
import { BaseRecordSpaceSlugDto } from './dto/base-record-space-slug.dto';
import { CONTEXT } from '@nestjs/graphql';
import { ProjectsService } from '@/projects/projects.service';
import { Record as RecordSchema } from '@/schemas';
import { preOperate, handlePreOperation } from './decorators/preOperate';
import { FunctionDto } from './dto/function.dto';
import { loginFunctionMetaData } from '@/functions/login/metadata';
import { isEmpty } from 'lodash';
import { CreateRecordSpaceInput } from '@/record-spaces/dto/create-record-space.input';
import { getRecordStructureHash } from '@/utils';


@Injectable({ scope: Scope.REQUEST })
@handlePreOperation()
export class EpService {
    constructor(
        @Inject(CONTEXT) private context: Context,
        private recordSpacesService: RecordSpacesService,
        private projectService: ProjectsService,
        private recordsService: RecordsService,
        private logger: Logger,
    ) { }

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

        const { recordQuerySyntax } = await createMongoDBSyntax({ recordQuery: query, user, paramRelationship, logger: this.logger, context: this.context });

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
        return records.map(formatRecordForEpResponse);
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

        const { recordQuerySyntax } = await createMongoDBSyntax({ recordQuery: query, user, paramRelationship, logger: this.logger, context: this.context });

        const record = await this.recordsService.getRecord({
            query: recordQuerySyntax,
        });

        if (!record) {
            throwBadRequest(
                `No record found for project: ${projectSlug}, recordSpaceSlug: ${recordSpaceSlug}`,
            );
        }
        return formatRecordForEpResponse(
            record as MongoDocWithTimeStamps<RecordSchema>,
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

        const { recordCommandSyntax } = await createMongoDBSyntax({
            recordDocument: body, user: req.user, logger: this.logger, context: this.context
        },
        );

        const record = await this.recordsService.create(
            { ...recordCommandSyntax, recordSpaceSlug, projectSlug },
            req.user._id,
            this.context.trace.recordSpace
        );
        if (!record) {
            throwBadRequest(`No record found for ${recordSpaceSlug}`);
        }
        return formatRecordForEpResponse(
            record as MongoDocWithTimeStamps<RecordSchema>
        );
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

        const { recordCommandSyntax } = await createMongoDBSyntax(
            { recordDocument: body, user: req.user, requiredFieldsAreOptional: true, logger: this.logger, context: this.context }
        );

        const record = await this.recordsService.updateRecord(
            id,
            recordCommandSyntax,
        );

        if (!record) {
            throwBadRequest(`No record found for ${recordSpaceSlug}`);
        }

        return formatRecordForEpResponse(
            record as MongoDocWithTimeStamps<RecordSchema>,
        );
    }


    private async assertProjectExistence({ projectSlug, userId }: { projectSlug: string, userId: string }, options: { autoCreate: boolean } = { autoCreate: false }) {
        let project = await this.projectService.findOne({ slug: projectSlug, user: userId });
        if (!project) {

            if (!options.autoCreate) {
                throwBadRequest(`Project: ${projectSlug} does not exist`);
            }

            project = await this.projectService.create({
                slug: projectSlug,
                name: projectSlug
            }, userId)
        }
        return project;
    }

    private async preOperation(_args: any[]) {
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

            const objectifiedStructure = JSON.parse(
                structure,
            ) as CreateRecordSpaceInput;

            const {
                slug: recordSpaceSlug,
                recordStructure,
                projectSlug,
            } = objectifiedStructure;

            const project = await this.assertProjectExistence({ projectSlug, userId }, { autoCreate: autoCreateProject })

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
                    const presentRecordStructureHash = getRecordStructureHash(recordStructure);

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

    async processFunction(args: EpCompositeArgs<FunctionDto>) {
        const { req, params: receivedParams, body: receivedBody } = args;
        this.logger.sLog(
            args,
            'EpService:processFunction',
        );

        const { projectSlug, functionName } = receivedParams;
        const { user } = req;
        const { _id: projectId } = await this.assertProjectExistence({ projectSlug, userId: user._id });


        if (functionName === "Login") {
            const { payload, resources } = loginFunctionMetaData;

            const { getCreationInput } = resources.recordSpaces.authStore;

            const creationInput = getCreationInput({ projectSlug });
            const { slug: authStoreSlug } = creationInput;


            let authStoreDetails = await this.recordSpacesService.findOne({
                query: { slug: authStoreSlug },
                user,
                projectSlug,
                populate: "recordFields",
                projectId
            }) as RecordSpaceWithRecordFields;

            if (!authStoreDetails) {
                this.logger.sLog({}, "epService:processFunction::Login auth store not existing")
                authStoreDetails = await this.recordSpacesService.create(creationInput);
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
}
