
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
import { CObject, CommandType, Context, ParamRelationship, TraceObject } from '@/types';
import { arrayNotEmpty, isArray, isMongoId, isNotEmpty } from 'class-validator';
import { BaseRecordSpaceSlugDto } from './dto/base-record-space-slug.dto';
import { REQUEST } from '@nestjs/core';
import { isEmpty } from 'lodash';
import { CreateRecordSpaceInput } from '@/record-spaces/dto/create-record-space.input';
import { EpServiceMongoSyntaxUtil } from './ep.service.utils.mongo-syntax';
import { contextGetter } from '@/utils';
import { mergeFieldContent } from '@/ep-functions/utils';
import { verifyJWTToken } from '@/utils/jwt';
import { IdQueryDto } from './dto/delete-record.dto';
import { perfTime } from './decorators/perf-time';
import { ObjectId } from 'mongodb';

@Injectable({ scope: Scope.REQUEST })
export class EpService {


    constructor(
        @Inject(REQUEST) private context: Context,
        private recordSpacesService: RecordSpacesService,
        private recordsService: RecordsService,
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
    }, options?: {
        throwOnEmpty?: boolean;
    }) {
        this.logger.sLog({ args, options }, 'EpService:getRecords');
        await this.preOperation(args);

        const { options: { paramRelationship, pagination } } = this.contextFactory.getValue(["trace", "clientCall"]);
        const recordSpace = this.contextFactory.getValue(["trace", "recordSpace"]);
        const user = this.contextFactory.getValue(["user"]);
        const { sort } = this.contextFactory.getValue(["trace", "clientCall", "options"]) as { sort: { by: string; order?: "asc" | "desc" } };
        const { by, order = "asc" } = sort;
        const numOrder = order === "asc" ? 1 : -1;

        const {
            params: { recordSpaceSlug, projectSlug },
            query,
        } = args;

        const { recordQuerySyntax: _, allHashedFieldsInQuery, errors } = Object.keys(query).length
            ? await this.mongoSyntaxUtil.createSyntax({ recordQuery: query, user, paramRelationship })
            : { recordQuerySyntax: {}, allHashedFieldsInQuery: [], errors: null };

        if (errors) {
            throwBadRequest(errors);
        };

        const skipPagination = pagination ? { limit: pagination.limit, skip: pagination.limit * (pagination.page - 1) } : null;

        const reMappedRecordFields = this.contextFactory.getValue(["trace", "recordSpace", "reMappedRecordFields"]);
        const records = await this.recordsService.findRecordDump({
            recordSpace,
            query,
            options: { ...skipPagination, ...(by ? { sort: [by, numOrder] } : {}) },
            reMappedRecordFields,
            allHashedFieldsInQuery
        });

        if (records.length === 0) {
            this.logger.debug(`No records found after formatting for project : ${projectSlug}, recordSpaceSlug: ${recordSpaceSlug}`, 'EpService:getRecords');
            return [];
        }

        return records;
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

        return this.recordsService.deleteRecord(
            recordId,
        );
    }


    async getRecordById(
        args: {
            params?: { recordSpaceSlug: string; projectSlug: string };
            query: { _id: string };
            commandType?: CommandType;
            options?: {
                skipPreOperation: boolean;
                throwOnEmpty?: boolean;
            }
        },
    ) {
        this.logger.sLog({ args }, 'EpService::getRecordById');
        const { options } = args;
        const { skipPreOperation = false, throwOnEmpty = true } = options || {};

        !skipPreOperation && await this.preOperation(args);

        const user = this.contextFactory.getValue(["user"]);
        const { _id: projectId } = this.contextFactory.getValue(["trace", "project"]);
        const { query, params = this.contextFactory.getValue(["params"]) } = args;
        const { recordSpaceSlug, projectSlug } = params;

        const record = await this.recordsService.getRecord({ query });

        if (!record) {
            this.logger.debug(`No records found for project: ${projectSlug}, recordSpaceSlug: ${recordSpaceSlug}`, 'EpService:getRecord')
            if (throwOnEmpty) {
                throwBadRequest(
                    `No records found for your request`,
                );
            }
            return null;
        }

        const reMappedRecordFields = this.contextFactory.getValue(["trace", "recordSpace", "reMappedRecordFields"]);


        return postOperateRecord({
            record,
            recordSpaceSlug,
            projectSlug,
            userId: user._id,
            projectId,
            options: { noThrow: true },
            reMappedRecordFields
        },
            this.logger
        );
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
            throwOnEmpty?: boolean;
        }
    ) {
        this.logger.sLog({ args, options }, 'EpService::getRecord');

        const { skipPreOperation = false, returnIdOnly = false, throwOnEmpty = true } = options || {
            skipPreOperation: false,
            paramRelationship: "And",
            returnIdOnly: false,
            throwOnEmpty: true
        };

        !skipPreOperation && await this.preOperation(args);

        const { query, params = this.contextFactory.getValue(["params"]) } = args;
        const { recordSpaceSlug, projectSlug } = params;

        const records = await this.getRecords({
            params,
            query,
            commandType: args.commandType
        }, {
            throwOnEmpty: false
        });

        const record = records?.[0];

        if (!record) {
            this.logger.debug(`No record found for project: ${projectSlug}, recordSpaceSlug: ${recordSpaceSlug}`, 'EpService:getRecord')

            if (throwOnEmpty) {
                throwBadRequest(
                    `No record found for your request`,
                );
            }
            return null;
        }

        if (returnIdOnly) {
            return { id: record._id };
        };

        return record;
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
        const { _id: projectId } = this.contextFactory.getValue(["trace", "project"]);

        assertValidation({ validation: (v) => !Array.isArray(v), message: "can't be an array" }, body, "Body");
        assertValidation({ validation: (v) => !(Object.keys(v).length === 0), message: "should not be empty" }, body, "Body");

        const { recordCommandSyntax, errors } = await this.mongoSyntaxUtil.createSyntax({
            recordDocument: body,
            user,
        });

        if (errors) {
            this.logger.sLog({ errors }, 'EpService:addRecord:: while creating syntax');
            throwBadRequest(errors);
        }

        const record = await this.recordsService.create(
            { ...recordCommandSyntax, recordSpaceSlug, projectSlug },
            user._id,
            recordSpace
        );

        if (!record) {
            throwBadRequest(`No record found for ${recordSpaceSlug}`);
        }

        const reMappedRecordFields = this.contextFactory.getValue(["trace", "recordSpace", "reMappedRecordFields"]);

        return postOperateRecord({
            record,
            recordSpaceSlug,
            projectSlug,
            userId: user._id,
            projectId,
            options: { noThrow: true },
            reMappedRecordFields,
            afterRun: async (args: { fullFormattedRecord: CObject }) => {
                const { fullFormattedRecord } = args;
                await this.recordsService.saveRecordDump({
                    record,
                    formattedRecord: fullFormattedRecord,
                });
            }
        }, this.logger);

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

        const record = await this.getRecord({ query }, { skipPreOperation: true, returnIdOnly: true });
        return this.updateRecordById({
            query: { id: String(record.id) },
            params,
            body: update,
            options: { skipPreOperation: true }
        });
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

        if (!ObjectId.isValid(id)) {
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
        const { _id: projectId } = this.contextFactory.getValue(["trace", "project"]);

        const { recordCommandSyntax, errors } = await this.mongoSyntaxUtil.createSyntax({
            recordDocument: body,
            user,
            requiredFieldsAreOptional: true
        });

        if (errors) {
            throwBadRequest(errors);
        }

        const { recordSpace, fieldsContent: newRecordUpdate } = recordCommandSyntax;

        const traceRecords = this.contextFactory.getValue(["trace", "records"]);


        const existingRecordUpdate = traceRecords[id]?.fieldsContent ?? (await this.recordsService.getRecord({ query: { _id: id } })).fieldsContent;

        const mergedFieldContents = mergeFieldContent({ existingRecordUpdate, newRecordUpdate });
        const record = await this.recordsService.updateRecordById(id, { recordSpace, fieldsContent: mergedFieldContents })

        if (!record) {
            throwBadRequest(`No record found for ${recordSpaceSlug}`);
        };

        const reMappedRecordFields = this.contextFactory.getValue(["trace", "recordSpace", "reMappedRecordFields"]);

        return postOperateRecord({
            record,
            recordSpaceSlug,
            projectSlug,
            userId: user._id,
            projectId,
            reMappedRecordFields
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

        const { project, recordSpace } = operationResources;


        this.context.req.trace.project = project;
        this.context.req.trace.recordSpace = this.contextFactory.assignRecordSpace(recordSpace);



        this.logger.sLog({}, "EpService::preOperation:: end of preOperation");

    };

    private async processSpaceAuthorization(
        args: {
            authOptions: CreateRecordSpaceInput["authOptions"];
            parsedOptions: any;
            projectSlug: string;
            projectId: string;
            functionArgs: { commandType?: CommandType };
            trace: TraceObject,
            userId: string;
        }) {

        this.logger.sLog({ args }, "EpService::_assertSpaceAuthorization");

        const { authOptions, parsedOptions, userId, functionArgs, projectSlug, projectId } = args;

        const { commandType } = functionArgs;

        const token = parsedOptions?.token ?? authOptions?.token;

        const { space, scope } = authOptions;

        if (!scope.includes(commandType as any)) {
            this.logger.sLog({ commandType, authOptions }, "EpService::_assertSpaceAuthorization:: authorization Skipped for commandType");
            return;
        }

        if (scope.includes(commandType as any)) {
            if (!token) {
                this.logger.sLog({ token }, "EpService::_assertSpaceAuthorization:: token is missing");
                this.logger.sLog({ commandType, authOptions }, "EpService::_assertSpaceAuthorization:: commandType not allowed without authorization");
                throwBadRequest(`Token is missing,Scope of Command: "${commandType}" is not allowed without authorization, check authOptions on ${space} Space Model`);
            };

            const tokenRes = verifyJWTToken(token, { throwOnError: false });
            if (!tokenRes) {
                this.logger.sLog({ token }, "EpService::_assertSpaceAuthorization:: invalid token");
                throwBadRequest(`Invalid token for ${space} Space on AuthOptions`);
            }

            const { userDetails: { id: userId } } = tokenRes as any;

            if (!userId) {
                this.logger.sLog({ userId }, "EpService::_prepareOperationResources:: invalid token details");
                throwBadRequest(`Invalid token`);
            }

            const recordSpace = await this.recordSpacesService.findOne({
                query: { slug: space.toLowerCase(), user: userId, projectSlug, projectId }
            });

            if (!recordSpace) {
                this.logger.sLog({ recordSpace }, "EpService::_prepareOperationResources:: authOptions recordSpace does not exist")
                throwBadRequest(`AuthOptions Space:  "slug: ${space}"  does not exist`);
            }


            const userIdExist = await this.getRecordById({
                query: {
                    _id: userId,
                },
                options: {
                    skipPreOperation: true,
                    throwOnEmpty: false,
                }
            });


            if (!userIdExist) {
                this.logger.sLog({ userIdExist }, "EpService::_prepareOperationResources:: token user does not exist");
                throwBadRequest(`Token user does not exist`);
            }

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

        const userId = String(user._id);

        const { "auto-create-project": autoCreateProject, "auto-create-record-space": autoCreateRecordSpace, structure, options } = headers;

        const parsedOptions = options ? JSON.parse(options) : null;

        const { authOptions = null, ...latestRecordSpaceInputDetails } = structure as CreateRecordSpaceInput;

        const { recordStructure, projectSlug, slug: recordSpaceSlug } = latestRecordSpaceInputDetails;

        const authEnabled = Boolean(authOptions) && authOptions.active !== false;

        const { project, recordSpace } = await this.recordSpacesService.handleRecordSpaceCheckInPreOperation({
            recordSpaceSlug,
            projectSlug,
            autoCreateRecordSpace,
            recordStructure,
            userId,
            latestRecordSpaceInputDetails,
            autoCreateProject
        });

        if (authEnabled) {
            await this.processSpaceAuthorization({
                authOptions,
                parsedOptions,
                userId,
                functionArgs,
                trace,
                projectSlug,
                projectId: String(project._id)
            })
        }

        const fieldsToConsider = !isEmpty(query) ? query : body;

        const { typeErrors } = validateFields({ recordStructure, fields: fieldsToConsider, logger: this.logger });

        if (typeErrors.length) {
            this.logger.sLog({ typeErrors }, "EpService::_prepareOperationResources:: typeErrors ocurred")
            throwBadRequest(typeErrors);
        }

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
            recordSpace,
            options: parsedOptions,
            recordStructure,
            projectSlug,
            fieldsToConsider,
            user,
            project
        }
    }
}
