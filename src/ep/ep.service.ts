
import { Inject, Injectable, Scope } from '@nestjs/common';
import { RecordSpacesService } from '@/record-spaces/record-spaces.service';
import { CustomLogger as Logger } from '@/logger/logger.service';
import { throwBadRequest } from '@/utils/exceptions';
import { RecordsService } from '@/records/records.service';
import {
    postOperateRecord,
    validateInBulk,
    assertValidation,
    validateFields,
} from './utils';
import { CObject, CommandType, Context, MongoDocWithTimeStamps, ParamRelationship, RecordSpaceWithRecordFields, TraceObject } from '@/types';
import { arrayNotEmpty, isArray, isMongoId, isNotEmpty } from 'class-validator';
import { BaseRecordSpaceSlugDto } from './dto/base-record-space-slug.dto';
import { Record as _Record, User } from '@/schemas';
import { REQUEST } from '@nestjs/core';
import { isEmpty } from 'lodash';
import { CreateRecordSpaceInput } from '@/record-spaces/dto/create-record-space.input';
import { EpServiceMongoSyntaxUtil } from './ep.service.utils.mongo-syntax';
import { ProjectsService } from '@/projects/projects.service';
import { contextGetter } from '@/utils';
import { mergeFieldContent } from '@/ep-functions/utils';
import { isObjectIdOrHexString, LeanDocument } from 'mongoose';
import { collection, recordDump } from '@/utils/direct-mongodb-connection';
import { verifyJWTToken } from '@/utils/jwt';
import { IdQueryDto } from './dto/delete-record.dto';


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
        this.contextFactory = contextGetter(this.context.req, this.logger);
    }


    private contextFactory: ReturnType<typeof contextGetter>;

    async getRecords(args: {
        params?: { recordSpaceSlug: string; projectSlug: string };
        query: Record<string, string>;
        commandType?: CommandType
    }) {
        this.logger.sLog(args, 'EpService:getRecords');
        await this.preOperation(args);
        const { options: { paramRelationship } } = this.contextFactory.getValue(["trace", "clientCall"]);
        const user = this.contextFactory.getValue(["user"]);

        const {
            params: { recordSpaceSlug, projectSlug },
            query,
        } = args;

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

        const formattedRecords = await Promise.all(records.map(record => postOperateRecord({
            record,
            allHashedFieldsInQuery,
            recordSpaceSlug,
            projectSlug,
            userId: user.id,
            options: { noThrow: true }
        }, this.logger)).filter(record => record !== null))

        if (formattedRecords.length === 0) {
            this.logger.debug(`No records found after formatting for project : ${projectSlug}, recordSpaceSlug: ${recordSpaceSlug}`, 'EpService:getRecords')
            throwBadRequest(
                `No records found for your request`,
            );
        }

        return formattedRecords;
    }

    async deleteRecord(args: {
        params?: { recordSpaceSlug: string; projectSlug: string };
        query: IdQueryDto,
        commandType?: CommandType
    }) {
        this.logger.sLog(
            { args },
            'EpService:deleteRecord',
        );
        const { query } = args;
        const { id: recordId } = query;
        await this.preOperation(args);
        const { _id: userId } = this.contextFactory.getValue(["user"]);


        validateInBulk(
            [
                { validation: isNotEmpty, message: 'should be Defined' },
                { validation: isMongoId, message: 'should be a mongoid' },
            ],
            { recordId, userId },
        );

        recordDump(this.logger).deleteOne({ id: recordId });

        return this.recordsService.deleteRecord(
            recordId,
        );
    }


    async getRecordById(
        args: {
            params?: { recordSpaceSlug: string; projectSlug: string };
            query: Record<string, string>;
            commandType?: CommandType;
            options?: {
                skipPreOperation: boolean;
            }
        },
    ) {
        this.logger.sLog({ args }, 'EpService::getRecordById');
        const { options } = args;
        const { skipPreOperation = false } = options || {};

        !skipPreOperation && await this.preOperation(args);

        const user = this.contextFactory.getValue(["user"]);

        const { query, params = this.contextFactory.getValue(["params"]) } = args;
        const { recordSpaceSlug, projectSlug } = params;

        const record = await this.recordsService.getRecord({ query });

        if (!record) {
            this.logger.debug(`No records found for project: ${projectSlug}, recordSpaceSlug: ${recordSpaceSlug}`, 'EpService:getRecord')
            throwBadRequest(
                `No records found for your request`,
            );
        }

        const formattedRecord = await postOperateRecord({
            record,
            recordSpaceSlug,
            projectSlug,
            userId: user.id,
            options: { noThrow: true }
        },
            this.logger
        );

        return formattedRecord;
    }


    async getRecord(
        args: {
            params?: { recordSpaceSlug: string; projectSlug: string };
            query: Record<string, string>;
            commandType?: CommandType;
        },
        options?: {
            skipPreOperation?: boolean;
            paramRelationship?: ParamRelationship;
            returnIdOnly?: boolean;
        }
    ) {
        this.logger.sLog({ args, options }, 'EpService::getRecord');

        const { skipPreOperation = false, paramRelationship: optionsParamRelationship = "And", returnIdOnly = false } = options || {
            skipPreOperation: false,
            paramRelationship: "And",
            returnIdOnly: false
        };

        !skipPreOperation && await this.preOperation(args);


        const paramRelationship = !skipPreOperation ? this.contextFactory.getValue(["trace", "clientCall"]).options.paramRelationship : optionsParamRelationship;
        const user = this.contextFactory.getValue(["user"]);

        const { query, params = this.contextFactory.getValue(["params"]) } = args;
        const { recordSpaceSlug, projectSlug } = params;


        const { recordQuerySyntax, allHashedFieldsInQuery, errors } = await this.mongoSyntaxUtil.createSyntax({ recordQuery: query, user, paramRelationship });

        if (errors) {
            throwBadRequest(errors);
        };


        const record = await this.recordsService.getRecord({
            query: recordQuerySyntax,
            ...(returnIdOnly ? { dontPopulate: true, project: { id: 1 } } : {}),
        });

        if (!record) {
            this.logger.debug(`No records found for project: ${projectSlug}, recordSpaceSlug: ${recordSpaceSlug}`, 'EpService:getRecord')
            throwBadRequest(
                `No records found for your request`,
            );
        }

        if (returnIdOnly) {
            return { id: record._id };
        };


        const formattedRecord = await postOperateRecord({
            record,
            allHashedFieldsInQuery,
            recordSpaceSlug,
            projectSlug,
            userId: user.id,
        },
            this.logger
        );

        return formattedRecord;
    }

    async addRecords(args: {
        params?: { recordSpaceSlug: string; projectSlug: string };
        bodyArray: Record<string, string>[];
        commandType: CommandType;
    }) {
        this.logger.sLog(args, 'EpService:addRecord');
        const { params, bodyArray } = args;
        await this.preOperation(args);

        assertValidation({ validation: isArray, message: "must be an array" }, bodyArray, "Body");
        assertValidation({ validation: arrayNotEmpty, message: "should not be empty" }, bodyArray, "Body");

        return Promise.all(
            bodyArray.map(body =>
                this.addRecord({ params, body })
            ),
        );
    }

    async addRecord(args: {
        params?: { recordSpaceSlug: string; projectSlug: string };
        body: Record<string, string>;
        commandType?: CommandType;
    }) {
        this.logger.sLog(
            args,
            'EpService:addRecord',
        );
        const { params: { recordSpaceSlug, projectSlug }, body } = args;

        await this.preOperation(args);

        const user = this.contextFactory.getValue(["user"]);
        const recordSpace = this.contextFactory.getValue(["trace", "recordSpace"]);

        assertValidation({ validation: (v) => !Array.isArray(v), message: "can't be an array" }, body, "Body");
        assertValidation({ validation: (v) => !(Object.keys(v).length === 0), message: "should not be empty" }, body, "Body");

        const { recordCommandSyntax } = await this.mongoSyntaxUtil.createSyntax({
            recordDocument: body,
            user,
        });

        const record = await this.recordsService.create(
            { ...recordCommandSyntax, recordSpaceSlug, projectSlug },
            user._id,
            recordSpace
        ) as MongoDocWithTimeStamps<_Record>;

        if (!record) {
            throwBadRequest(`No record found for ${recordSpaceSlug}`);
        }

        return postOperateRecord({ record, recordSpaceSlug, projectSlug, userId: user.id, options: { noThrow: true } }, this.logger);
    }

    async updateRecord(args: {
        params: BaseRecordSpaceSlugDto;
        query: Record<string, string>;
        update: Record<string, string>;
        commandType?: CommandType;
        options?: { skipPreOperation: boolean }
    }
    ) {
        this.logger.sLog(args, "EpService::updateRecord");

        const { params, query, update, commandType, options = { skipPreOperation: false } } = args;

        !options.skipPreOperation && await this.preOperation(args);

        const record = await this.getRecord({ query }, { skipPreOperation: true });
        const updatedRecord = await this.updateRecordById({
            query: { id: record.id },
            params,
            body: update,
            options: { skipPreOperation: true }
        });

        return record;
    }

    async updateRecordById(args: {
        query: IdQueryDto;
        params: BaseRecordSpaceSlugDto;
        body: Record<string, string>;
        commandType?: CommandType;
        options?: { skipPreOperation: boolean };
    }) {
        this.logger.sLog(
            args,
            'EpService::updateRecordById',
        );

        const { query: { id }, body, options = { skipPreOperation: false }, params } = args;

        const { recordSpaceSlug, projectSlug } = params;


        !options.skipPreOperation && await this.preOperation(args);

        if (!isObjectIdOrHexString(id)) {
            throwBadRequest(`Invalid id`);
            this.logger.sLog({ id }, "EpService:updateRecordById:: invalid id")
        }

        if (Array.isArray(body)) {
            throwBadRequest(`Body can't be an array`);
        }

        if (Object.keys(body).length === 0) {
            throwBadRequest(`Body should not be empty`);
        }

        const user = this.contextFactory.getValue(["user"]);

        const { recordCommandSyntax, errors } = await this.mongoSyntaxUtil.createSyntax({
            recordDocument: body,
            user,
            requiredFieldsAreOptional: true
        });

        if (errors) {
            throwBadRequest(errors);
        }

        const { recordSpace, fieldsContent: newRecordUpdate } = recordCommandSyntax;

        const traceRecords = this.contextFactory.getValue(["trace", "records"]) as TraceObject["records"];

        const existingRecordUpdate = traceRecords[id]?.fieldsContent ?? (await this.recordsService.getRecord({ query: { _id: id }, dontPopulate: true })).fieldsContent;

        const mergedFieldContents = mergeFieldContent({ existingRecordUpdate, newRecordUpdate });

        const record = (await this.recordsService.updateRecordById(id, { recordSpace, fieldsContent: mergedFieldContents })) as MongoDocWithTimeStamps<_Record>;

        if (!record) {
            throwBadRequest(`No record found for ${recordSpaceSlug}`);
        };

        return postOperateRecord({
            record,
            recordSpaceSlug,
            projectSlug,
            userId: user.id
        },
            this.logger
        );
    }


    private async preOperation(args?: { commandType?: CommandType;[x: string]: any; }) {
        const { headers, params, query, body, user, trace } = this.contextFactory.getFullContext();

        this.logger.sLog(
            { args, query, params, headers, user, body, trace },
            'EpService:preOperation'
        );


        const operationResources = await this._prepareOperationResources({ headers, query, trace, body, user, functionArgs: args });

        const { autoCreateRecordSpace, authOptions, projectSlug } = operationResources;

    };

    private async processSpaceAuthorization(
        args: {
            authOptions: CreateRecordSpaceInput["authOptions"];
            parsedOptions: any;
            projectSlug: string;
            functionArgs: { commandType?: CommandType };
            trace: TraceObject,
            user: any;
        }) {

        this.logger.sLog({ args }, "EpService::_assertSpaceAuthorization");

        const { authOptions, parsedOptions, user, functionArgs, projectSlug } = args;

        const { commandType } = functionArgs;

        const token = parsedOptions?.token ?? authOptions?.token;

        if (!token) {
            this.logger.sLog({ token }, "EpService::_");
            throwBadRequest("Token is missing");
        };

        const { userDetails: { id: userId } } = verifyJWTToken(token) as any;

        if (!userId) {
            this.logger.sLog({ userId }, "EpService::_prepareOperationResources:: invalid token details");
            throwBadRequest(`Invalid token`);
        }

        const { space, scope } = authOptions;

        const recordSpace = await this.recordSpacesService.findOne({
            query: { slug: space.toLowerCase() },
            user,
            projectSlug,
        }) as RecordSpaceWithRecordFields;

        if (!recordSpace) {
            this.logger.sLog({ recordSpace }, "EpService::_prepareOperationResources:: authOptions recordSpace does not exist")
            throwBadRequest(`AuthOptions Space:  "slug: ${space}"  does not exist`);
        }

        if (!scope.includes(commandType as any)) {
            this.logger.sLog({ commandType, authOptions }, "EpService::_preOperationResources: commandType not allowed");
            throwBadRequest(`Scope of Command: "${commandType}" is not allowed, check authOptions on ${space} Space Model `);
        }

        const userIdExist = await this.getRecordById({
            query: {
                id: userId,
            },
            options: {
                skipPreOperation: true
            }
        });

        if (!userIdExist) {
            this.logger.sLog({ userIdExist }, "EpService::_prepareOperationResources:: token user does not exist");
            throwBadRequest(`Token user does not exist`);
        }
    }

    private async _prepareOperationResources(
        args: {
            headers: CObject;
            query: CObject;
            body: CObject;
            trace: TraceObject,
            user: any;
            functionArgs: { commandType?: CommandType };
        }) {
        this.logger.sLog({ args }, "EpService::_prepareOperationResources")

        const { headers, query, body, trace, user, functionArgs } = args;

        const { "auto-create-project": autoCreateProject, "auto-create-record-space": autoCreateRecordSpace, structure, options } = headers;

        const parsedOptions = options ? JSON.parse(options) : null;

        const { authOptions = null, ...latestRecordSpaceInputDetails } = structure as CreateRecordSpaceInput;

        const { recordStructure, projectSlug } = latestRecordSpaceInputDetails;

        const authEnabled = Boolean(authOptions) && authOptions.active !== false;

        if (authEnabled) {
            await this.processSpaceAuthorization({
                authOptions,
                parsedOptions,
                user,
                functionArgs,
                trace,
                projectSlug
            })
        }

        if (!autoCreateRecordSpace) {
            this.logger.sLog({ autoCreateRecordSpace: autoCreateRecordSpace }, "EpService::autoCreateRecordSpace:: auto creating recordSpace not allowed");
            return;
        }

        const fieldsToConsider = !isEmpty(query) ? query : body;

        const project = await this.projectService.assertProjectExistence({ projectSlug, userId: user._id }, { autoCreate: autoCreateProject });

        const { typeErrors } = validateFields({ recordStructure, fields: fieldsToConsider, logger: this.logger });

        if (typeErrors.length) {
            this.logger.sLog({ typeErrors }, "EpService::_prepareOperationResources:: typeErrors ocurred")
            throwBadRequest(typeErrors);
        }

        const latestRecordSpace = await this.recordSpacesService.createOrUpdateRecordSpace({
            user,
            project,
            latestRecordSpaceInputDetails
        });

        this.context.req.trace.recordSpace = latestRecordSpace;

        this.context.req.trace.clientCall = parsedOptions ? { options: parsedOptions } : null;

        const { isQuery: requestIsAQuery } = trace;

        if (!requestIsAQuery && isEmpty(fieldsToConsider)) {
            this.logger.sLog({ query, body }, "EpService:preOperation:: Both query and body parameters are empty");
            throwBadRequest("Absent Fields");
        }

        return {
            autoCreateProject: Boolean(autoCreateProject),
            autoCreateRecordSpace: Boolean(autoCreateRecordSpace),
            authOptions,
            recordSpace: latestRecordSpace,
            options: parsedOptions,
            recordStructure,
            projectSlug,
            fieldsToConsider,
            user,
        }
    }
}
