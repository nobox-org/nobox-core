import {
   HttpException,
   HttpStatus,
   Inject,
   Injectable,
   Scope,
} from '@nestjs/common';
import { RecordSpacesService } from '@/modules/record-spaces/record-spaces.service';
import { CustomLogger as Logger } from '@/modules/logger/logger.service';
import { throwBadRequest } from '@/utils/exceptions';
import { RecordsService } from '@/modules/records/records.service';
import {
   postOperateRecord,
   validateInBulk,
   assertValidation,
   validateFields,
} from './utils';
import {
   CObject,
   CommandType,
   Context,
   ClientSourceFunctionType,
   HydratedRecordSpace,
   ParamRelationship,
   TraceObject,
} from '@/types';
import { arrayNotEmpty, isArray, isMongoId, isNotEmpty } from 'class-validator';
import { BaseRecordSpaceSlugDto } from './dto/base-record-space-slug.dto';
import { REQUEST } from '@nestjs/core';
import { isEmpty } from 'lodash';
import { CreateRecordSpaceInput } from '@/modules/record-spaces/dto/create-record-space.input';
import { ClientServiceMongoSyntaxUtil } from './client.service.utils.mongo-syntax';
import {
   contextGetter,
   hydrateRecordSpace,
} from '@/utils';
import { verifyJWTToken } from '@/utils/jwt';
import { IdQueryDto } from './dto/general.dto';
import { ObjectId, MRecordSpace } from "nobox-shared-lib";
import { ClientHeaders, PreOperationResources } from './type';
import { computeClientHeaders } from '@/utils/gen';
import { LogTrackerService } from '../track-logs/log-tracker.service';
import { convertBooleanQueryField } from './utils/convert-boolean-query';

@Injectable({ scope: Scope.REQUEST })
export class ClientService {
   private contextFactory: ReturnType<typeof contextGetter>;

   constructor(
      @Inject(REQUEST) private context: Context,
      private recordSpacesService: RecordSpacesService,
      private recordsService: RecordsService,
      private mongoSyntaxUtil: ClientServiceMongoSyntaxUtil,
      private logTrackerService: LogTrackerService,
      private logger: Logger,
   ) {
      this.contextFactory = contextGetter(this.context.req, this.logger);
   }

   async getRecords(
      args: {
         params: { recordSpaceSlug: string; projectSlug: string };
         query: Record<string, string>;
         commandType?: CommandType;
      },
      options?: {
         throwOnEmpty?: boolean;
         skipPreOperation?: boolean;
         paramRelationship?: ParamRelationship;
         pagination?: { limit: number; page: number };
         sort?: { by: string; order?: 'asc' | 'desc' };
         recordSpace?: HydratedRecordSpace;
      },
   ) {

      this.logger.sLog({ args, options }, 'ClientService::getRecords');

      const {
         paramRelationship,
         pagination,
         sort,
         recordSpace,
      } = await this.processSkipPreOperation({ params: args.params, options });

      const {
         params: { recordSpaceSlug, projectSlug },
         query,
      } = args;

      const {
         recordQuerySyntax,
         allHashedFieldsInQuery,
         errors,
         formattedRecordQuery,
      } = Object.keys(query).length
            ? await this.mongoSyntaxUtil.createSyntax({
               recordQuery: query,
               paramRelationship,
            })
            : {
               recordQuerySyntax: {},
               allHashedFieldsInQuery: [],
               errors: null,
               formattedRecordQuery: query,
            };

      this.logger.sLog(
         { recordQuerySyntax, formattedRecordQuery },
         'ClientService::getRecords::recordQuerySyntax',
      );

      if (errors) {
         throwBadRequest(errors);
      }

      const skipPagination = pagination
         ? {
            limit: pagination.limit,
            skip: pagination.limit * (pagination.page - 1),
         }
         : null;

      const { reMappedRecordFields } = recordSpace;

      const { by = null, order = 'asc' } = sort || {};
      const numOrder = order === 'asc' ? 1 : -1;

      const records = await this.recordsService.findRecordDump({
         recordSpace,
         query: formattedRecordQuery,
         options: {
            ...skipPagination,
            ...(by ? { sort: [by, numOrder] } : {}),
            projection: { _id: 0, recordId: 0 },
         },
         reMappedRecordFields,
         allHashedFieldsInQuery,
      });

      if (records.length === 0) {
         this.logger.debug(
            `No records found for project : ${projectSlug}, recordSpaceSlug: ${recordSpaceSlug}`,
            'ClientService::getRecords',
         );
         return [];
      }

      return records;
   }

   async searchRecords(
      args: {
         params: { recordSpaceSlug: string; projectSlug: string };
         query: { searchText: string; searchableFields: string[] };
         commandType?: CommandType;
      },
      options?: {
         throwOnEmpty?: boolean;
         skipPreOperation?: boolean;
         pagination?: { limit: number; page: number };
         sort?: { by: string; order?: 'asc' | 'desc' };
         recordSpace?: HydratedRecordSpace;
      },
   ) {
      this.logger.sLog({ args, options }, 'ClientService::searchRecords');

      const { skipPreOperation = false } = options || {};

      if (skipPreOperation && !options.recordSpace) {
         this.logger.sLog(
            { args, options },
            'ClientService::searchRecords::skipPreOperation is true but recordSpace is not provided',
         );
         throwBadRequest('Something went wrong');
      }

      let { pagination = null, sort, recordSpace } = options || {};

      if (!skipPreOperation) {
         if (!args.params) {
            this.logger.sLog(
               { args },
               'ClientService::searchRecords::params not found in args',
            );
            throwBadRequest('Something went wrong');
         }
         await this.preOperation(args as any, 'getRecords');

         ({
            options: { pagination },
         } = this.contextFactory.getValue(['trace', 'clientCall']));
         recordSpace = this.contextFactory.getValue(['trace', 'recordSpace']);
         ({ sort } = this.contextFactory.getValue([
            'trace',
            'clientCall',
            'options',
         ]) as { sort: { by: string; order?: 'asc' | 'desc' } });
      }

      const { by = null, order = 'asc' } = sort || {};
      const numOrder = order === 'asc' ? 1 : -1;

      const {
         params: { recordSpaceSlug, projectSlug },
         query: { searchText, searchableFields },
      } = args;

      const skipPagination = pagination
         ? {
            limit: pagination.limit,
            skip: pagination.limit * (pagination.page - 1),
         }
         : null;

      const { reMappedRecordFields } = recordSpace;

      await this.mongoSyntaxUtil.validatingSearchableText({
         recordSpace,
         searchableFields,
      });

      const records = await this.recordsService.searchRecordDump({
         recordSpace,
         searchText,
         options: {
            ...skipPagination,
            ...(by ? { sort: [by, numOrder] } : {}),
            projection: { _id: 0, recordId: 0 },
         },
         reMappedRecordFields,
         searchableFields,
      });

      if (records.length === 0) {
         this.logger.debug(
            `No records found for project : ${projectSlug}, recordSpaceSlug: ${recordSpaceSlug}`,
            'ClientService::getRecords',
         );
         return [];
      }

      return records;
   }

   async deleteRecord(args: {
      params: { recordSpaceSlug: string; projectSlug: string };
      query: IdQueryDto;
      commandType?: CommandType;
   }) {
      this.logger.sLog({ args }, 'ClientService:deleteRecord');
      const { query } = args;
      const { id: recordId } = query;
      await this.preOperation(args, 'deleteRecord');
      const { _id: userId } = this.contextFactory.getValue(['user']);

      validateInBulk(
         [
            { validation: isNotEmpty, message: 'should be Defined' },
            { validation: isMongoId, message: 'should be a mongoid' },
         ],
         { recordId, userId },
      );


      const record = await this.recordsService.deleteRecord(recordId);
      const { recordSpaceSlug, projectSlug } = args.params;

      const recordSpace = this.contextFactory.getValue(['trace', 'recordSpace']);


      return postOperateRecord(
         {
            record,
            recordSpaceSlug,
            projectSlug,
            options: { noThrow: true },
            reMappedRecordFields: recordSpace.reMappedRecordFields,
            afterRun: async (args: { fullFormattedRecord: CObject }) => {
               await this.recordsService.deleteRecordDump({
                  query: { recordId: recordId },
               });
            },
         },
         this.logger,
      );

   }

   async getRecordById(args: {
      params?: { recordSpaceSlug: string; projectSlug: string };
      query: { _id: string };
      commandType?: CommandType;
      options?: {
         skipPreOperation: boolean;
         throwOnEmpty?: boolean;
         resources?: {
            recordSpace: HydratedRecordSpace;
            params: { recordSpaceSlug: string; projectSlug: string };
         };
      };
   }) {
      this.logger.sLog({ args }, 'ClientService::getRecordById');
      const { options, query } = args;
      const { skipPreOperation = false, throwOnEmpty = true } = options || {};

      if (skipPreOperation && !options?.resources) {
         this.logger.sLog(
            { args, options },
            'ClientService :: getRecordById :: skipPreOperation is true but options resources  is not provided',
         );
         throwBadRequest('Something went wrong');
      }

      let { recordSpace, params } = options.resources || {};

      if (!skipPreOperation) {
         await this.preOperation(args as any, 'getRecordById');
         recordSpace = recordSpace;
         params = args.params;
         recordSpace = this.contextFactory.getValue(['trace', 'recordSpace']);
      }

      const { recordSpaceSlug, projectSlug } = params;

      const record = await this.recordsService.getRecord({
         query: { _id: new ObjectId(query._id) },
      });

      if (!record) {
         this.logger.debug(
            `No records found for project: ${projectSlug}, recordSpaceSlug: ${recordSpaceSlug}`,
            'ClientService:getRecord',
         );
         if (throwOnEmpty) {
            throwBadRequest(`No records found for your request`);
         }
         return null;
      }

      return postOperateRecord(
         {
            record,
            recordSpaceSlug,
            projectSlug,
            options: { noThrow: true },
            reMappedRecordFields: recordSpace.reMappedRecordFields,
         },
         this.logger,
      );
   }

   async getTokenOwner(args: {
      params: { recordSpaceSlug: string; projectSlug: string };
      commandType?: CommandType;
   }) {
      this.logger.sLog({ args }, 'ClientService::getTokenOwner');

      await this.preOperation(args as any, 'getTokenOwner');

      const { params } = args;
      const { recordSpaceSlug, projectSlug } = params;

      const headers = this.contextFactory.getValue(['headers']);
      const hydratedRecordSpace = this.contextFactory.getValue([
         'trace',
         'recordSpace',
      ]);

      const {
         id,
      } = verifyJWTToken(headers.token) as any;;

      const user = await this.getRecordById({
         query: {
            _id: id,
         },
         options: {
            skipPreOperation: true,
            throwOnEmpty: false,
            resources: {
               params: {
                  recordSpaceSlug,
                  projectSlug,
               },
               recordSpace: hydratedRecordSpace,
            },
         },
      });

      if (!user) {
         this.logger.sLog(
            { user },
            'ClientService::_getTokenOwner:: token user does not exist',
         );
         throwBadRequest(`Token user does not exist`);
      }

      return user;
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
         pagination?: { limit: number; page: number };
         sort?: { by: string; order?: 'asc' | 'desc' };
         recordSpace?: HydratedRecordSpace;
      },
   ) {
      this.logger.sLog({ args, options }, 'ClientService::getRecord::');

      const {
         skipPreOperation = false,
         returnIdOnly = false,
         throwOnEmpty = true,
      } = options || {
         skipPreOperation: false,
         paramRelationship: 'And',
         returnIdOnly: false,
         throwOnEmpty: true,
      };

      if (!skipPreOperation) {
         if (!args.params) {
            this.logger.sLog(
               { args },
               'ClientService::getRecord::params not found in args',
            );
            throwBadRequest('Something went wrong');
         }

         await this.preOperation(args as any, 'getRecord');
      }

      const { query, params = this.contextFactory.getValue(['params']) } = args;
      const { recordSpaceSlug, projectSlug } = params;

      const records = await this.getRecords(
         {
            params,
            query,
            commandType: args.commandType,
         },
         {
            ...options,
            throwOnEmpty: false,
            skipPreOperation: true,
            recordSpace: this.contextFactory.getValue(['trace', 'recordSpace']),
         },
      );

      const record = records?.[0];

      if (!record) {
         this.logger.debug(
            `No record found for project: ${projectSlug}, recordSpaceSlug: ${recordSpaceSlug}`,
            'ClientService:getRecord',
         );

         if (throwOnEmpty) {
            throwBadRequest(`No record found for your request`);
         }
         return null;
      }

      if (returnIdOnly) {
         return { id: record.id };
      }

      return record;
   }

   async addRecords(args: {
      params: { recordSpaceSlug: string; projectSlug: string };
      bodyArray: Record<string, string>[];
      commandType: CommandType;
      skipPreOperation?: boolean;
   }) {
      this.logger.sLog(args, 'ClientService:addRecord');
      const { params, bodyArray, skipPreOperation = false } = args;

      if (!skipPreOperation) {
         await this.preOperation(args, 'addRecords');
      }

      assertValidation(
         { validation: isArray, message: 'must be an array' },
         bodyArray,
         'Body',
      );
      assertValidation(
         { validation: arrayNotEmpty, message: 'should not be empty' },
         bodyArray,
         'Body',
      );

      return Promise.all(
         bodyArray.map(body =>
            this.addRecord({ params, body, skipPreOperation }),
         ),
      );
   }

   async addRecord(args: {
      params: { recordSpaceSlug: string; projectSlug: string };
      body: Record<string, string>;
      commandType?: CommandType;
      skipPreOperation?: boolean;
   }) {
      this.logger.sLog(args, 'ClientService:addRecord');
      const {
         params: { recordSpaceSlug, projectSlug },
         body,
         skipPreOperation = false,
      } = args;

      if (!skipPreOperation) {
         await this.preOperation(args, 'addRecord');
      }

      const user = this.contextFactory.getValue(['user']);
      const recordSpace = this.contextFactory.getValue([
         'trace',
         'recordSpace',
      ]);

      assertValidation(
         { validation: v => !Array.isArray(v), message: "can't be an array" },
         body,
         'Body',
      );

      assertValidation(
         {
            validation: v => !(Object.keys(v).length === 0),
            message: 'should not be empty',
         },
         body,
         'Body',
      );

      const {
         recordCommandSyntax,
         errors,
      } = await this.mongoSyntaxUtil.createSyntax({
         recordDocument: body,
      });

      if (errors) {
         this.logger.sLog(
            { errors },
            'ClientService:addRecord:: while creating syntax',
         );
         throwBadRequest(errors);
      }

      const record = await this.recordsService.create({
         ...recordCommandSyntax,
         recordSpaceSlug,
         projectSlug,
         userId: user.id,
         recordSpaceDetails: recordSpace,
      });

      if (!record) {
         throwBadRequest(`No record found for ${recordSpaceSlug}`);
      }

      const reMappedRecordFields = this.contextFactory.getValue([
         'trace',
         'recordSpace',
         'reMappedRecordFields',
      ]);

      this.logger.sLog({ record }, 'ClientService::addRecord::record');

      return postOperateRecord(
         {
            record,
            recordSpaceSlug,
            projectSlug,
            options: { noThrow: true },
            reMappedRecordFields,
            afterRun: async (args: { fullFormattedRecord: CObject }) => {
               const { fullFormattedRecord } = args;
               return this.recordsService.saveRecordDump({
                  record,
                  formattedRecord: {
                     ...fullFormattedRecord,
                     id: String(fullFormattedRecord.id),
                  },
               });
            },
         },
         this.logger,
      );
   }

   async updateRecord(args: {
      params: BaseRecordSpaceSlugDto;
      query: Record<string, string>;
      update: Record<string, string>;
      commandType?: CommandType;
      options?: { skipPreOperation: boolean };
   }) {
      this.logger.sLog(args, 'ClientService::updateRecord');

      const {
         params,
         query,
         update,
         options = { skipPreOperation: false },
      } = args;

      !options.skipPreOperation &&
         (await this.preOperation(args, 'updateRecord'));

      const record = await this.getRecord(
         {
            query,
         },
         {
            skipPreOperation: true,
            returnIdOnly: true,
            recordSpace: this.contextFactory.getValue(['trace', 'recordSpace']),
         },
      );

      return this.updateRecordById({
         query: { id: String(record.id) },
         params,
         body: update,
         options: { skipPreOperation: true },
      });
   }

   async updateRecordById(args: {
      query: IdQueryDto;
      params: BaseRecordSpaceSlugDto;
      body: Record<string, string>;
      commandType?: CommandType;
      options?: { skipPreOperation: boolean };
   }) {
      this.logger.sLog(args, 'ClientService::updateRecordById');

      const {
         query: { id },
         body,
         options = { skipPreOperation: false },
         params,
      } = args;

      const { recordSpaceSlug, projectSlug } = params;

      !options.skipPreOperation &&
         (await this.preOperation(args, 'updateRecordById'));

      if (!ObjectId.isValid(id)) {
         throwBadRequest(`Invalid id`);
         this.logger.sLog(
            { id },
            'ClientService:updateRecordById:: invalid id',
         );
      }

      if (Array.isArray(body)) {
         throwBadRequest(`Body can't be an array`);
      }

      if (Object.keys(body).length === 0) {
         throwBadRequest(`Body should not be empty`);
      }

      const {
         recordCommandSyntax,
         errors,
      } = await this.mongoSyntaxUtil.createSyntax({
         recordDocument: body,
         requiredFieldsAreOptional: true,
      });

      if (errors) {
         throwBadRequest(errors);
      }

      const {
         recordSpace,
         fieldsContent: newFieldContent,
      } = recordCommandSyntax;

      const traceRecords = this.contextFactory.getValue(['trace', 'records']);

      const existingFieldContent =
         traceRecords[id]?.fieldsContent ??
         (
            await this.recordsService.getRecord({
               query: { _id: new ObjectId(id) },
            })
         )?.fieldsContent;

      if (!existingFieldContent) {
         throwBadRequest(`Record does not exist`);
      };

      const record = await this.recordsService.updateRecordById(id, {
         existingFieldContent,
         newFieldContent,
         recordSpace,
      });

      if (!record) {
         throwBadRequest(`No record found for ${recordSpaceSlug}`);
      }

      const reMappedRecordFields = this.contextFactory.getValue([
         'trace',
         'recordSpace',
         'reMappedRecordFields',
      ]);

      return postOperateRecord(
         {
            record,
            recordSpaceSlug,
            projectSlug,
            reMappedRecordFields,
            afterRun: async (args: { fullFormattedRecord: CObject }) => {
               const { fullFormattedRecord } = args;
               await this.recordsService.updateRecordDump({
                  query: { recordId: id },
                  update: fullFormattedRecord,
                  record,
               });
            },
         },
         this.logger,
      );
   }

   async getKeyValues(args: {
      params?: { recordSpaceSlug: string; projectSlug: string };
      commandType?: CommandType;
      options?: {
         skipPreOperation: boolean;
         throwOnEmpty?: boolean;
         resources?: {
            recordSpace: HydratedRecordSpace;
            params: { recordSpaceSlug: string; projectSlug: string };
         };
      };
   }) {
      this.logger.sLog({ args }, 'ClientService::getKeyValues');
      const { options, params } = args;
      const { skipPreOperation = false, throwOnEmpty = true } = options || {};

      if (!skipPreOperation) {
         await this.preOperation(args as any, 'getKeyValues');
      }

      const recordSpace = this.contextFactory.getValue([
         'trace',
         'recordSpace',
      ]);

      const { recordSpaceSlug, projectSlug } = params;

      const reMappedRecordFields = this.contextFactory.getValue([
         'trace',
         'recordSpace',
         'reMappedRecordFields',
      ]);

      const record = await this.recordsService.findRecordDump({
         recordSpace,
         query: { 'record.recordSpace': String(recordSpace._id) },
         reMappedRecordFields,
         allHashedFieldsInQuery: [],
      });

      if (!record) {
         this.logger.debug(
            `No records found for project: ${projectSlug}, recordSpaceSlug: ${recordSpaceSlug}`,
            'ClientService:getKeyValues',
         );
         if (throwOnEmpty) {
            throwBadRequest(`No record found for your request`);
         }
         return null;
      }

      if (record.length > 1) {
         this.logger.debug(
            `More than one records found for project: ${projectSlug}, recordSpaceSlug: ${recordSpaceSlug}`,
            'ClientService:getKeyValues',
         );
         throwBadRequest(`An unexpected error occurred`);
      }

      return record[0];
   }

   /** Key-Value Methods */

   async setKeyValues(args: {
      params: BaseRecordSpaceSlugDto;
      body: Record<string, string>;
      commandType?: CommandType;
      options?: { skipPreOperation: boolean };
   }) {
      this.logger.sLog(args, 'ClientService::setKeyValues');

      const { params, body, options = { skipPreOperation: false } } = args;

      !options.skipPreOperation &&
         (await this.preOperation(args, 'setKeyValues'));

      const { recordSpaceSlug, projectSlug } = params;

      if (Object.keys(body).length === 0) {
         throwBadRequest(`Body should not be empty`);
      }

      const {
         recordCommandSyntax,
         errors,
      } = await this.mongoSyntaxUtil.createSyntax({
         recordDocument: body,
         requiredFieldsAreOptional: true,
      });

      if (errors) {
         throwBadRequest(errors);
      }

      const newFieldContent = recordCommandSyntax.fieldsContent;

      const recordSpaceDetails = this.contextFactory.getValue([
         'trace',
         'recordSpace',
      ]);

      const { _id: recordSpaceId } = recordSpaceDetails;

      const existingRecordUpdate = await this.recordsService.getRecords({
         recordSpaceSlug,
         projectSlug,
         query: { recordSpace: String(recordSpaceId) },
      });

      if (existingRecordUpdate.length > 1) {
         this.logger.sLog(
            { existingRecordUpdate, recordSpaceSlug },
            `ClientService::setKeyValues::Multiple records found for Key-based for ${recordSpaceSlug}`,
         );
      }

      const { record, freshRecord } = await this.createKeyValueRecord({
         existingRecord: existingRecordUpdate[0],
         newFieldContent,
         recordSpaceSlug,
         projectSlug,
         recordSpaceDetails,
         recordCommandSyntax,
      });

      const reMappedRecordFields = this.contextFactory.getValue([
         'trace',
         'recordSpace',
         'reMappedRecordFields',
      ]);

      const recordArr = await postOperateRecord(
         {
            record,
            recordSpaceSlug,
            projectSlug,
            reMappedRecordFields,
            afterRun: async (args: { fullFormattedRecord: CObject }) => {
               const { fullFormattedRecord } = args;
               await (freshRecord
                  ? this.recordsService.saveRecordDump({
                     record,
                     formattedRecord: {
                        ...fullFormattedRecord,
                        id: String(fullFormattedRecord.id),
                     },
                  })
                  : this.recordsService.updateRecordDump({
                     query: { recordId: String(record._id) },
                     update: fullFormattedRecord,
                     record,
                  }));
            },
         },
         this.logger,
      );
      return recordArr[0];
   }

   private async createKeyValueRecord(args: {
      existingRecord: any;
      newFieldContent: any;
      recordSpaceSlug: string;
      projectSlug: string;
      recordSpaceDetails: MRecordSpace;
      recordCommandSyntax: {
         recordSpace: string;
         fieldsContent: any[];
      };
   }) {
      const {
         existingRecord,
         recordSpaceSlug,
         projectSlug,
         recordSpaceDetails,
         recordCommandSyntax,
         newFieldContent,
      } = args;

      if (!existingRecord) {
         this.logger.sLog(
            { recordSpaceSlug },
            'ClientService::updateRecord::First Record for Key-based Value',
         );
         const record = await this.recordsService.create({
            ...recordCommandSyntax,
            recordSpaceSlug,
            projectSlug,
            recordSpaceDetails,
         });

         return {
            record,
            freshRecord: true,
         };
      }

      const {
         fieldsContent: existingFieldContent,
         _id: recordId,
      } = existingRecord;


      const record = await this.recordsService.updateRecordById(String(recordId), {
         existingFieldContent,
         newFieldContent,
         recordSpace: String(recordSpaceDetails._id),
      });

      return {
         record,
         freshRecord: false,
      };
   }

   /** PreOperation Methods */

   async preOperationMutation(args: {
      operationResources: Pick<
         PreOperationResources,
         | 'project'
         | 'recordSpace'
         | 'clearThisRecordSpace'
         | 'initialData'
         | 'clearAllRecordSpaces'
         | 'mutate'
      >;
      params: BaseRecordSpaceSlugDto;
   }) {
      this.logger.sLog({ args }, 'ClientService:preOperationMutation');

      const { operationResources, params } = args;
      const {
         recordSpace: { initialDataExist },
         initialData,
      } = operationResources;

      await this.preOperationClearing({ operationResources, params });

      if (!initialData) {
         this.logger.sLog(
            { params },
            'ClientService:preOperationMutation:: no initial data was sent',
         );
         return;
      }

      this.logger.sLog(
         { initialDataExist },
         'ClientService:preOperationMutation',
      );

      const initialDataNotInDb =
         !initialDataExist ||
         operationResources.clearAllRecordSpaces ||
         operationResources.clearThisRecordSpace;

      if (initialDataNotInDb)
         await this.preOperationDataInitialization({
            operationResources,
            params,
         });
   }

   private async preOperation(
      args: {
         commandType?: CommandType;
         params: BaseRecordSpaceSlugDto;
         [x: string]: any;
      },
      sourceFunctionType: ClientSourceFunctionType,
   ) {

      const context = this.contextFactory.getFullContext();

      const {
         headers,
         params,
         query,
         body,
         user,
         trace,
      } = context;

      this.logger.sLog(
         { args, query, params, headers, user, body, trace },
         'ClientService:preOperation',
      );

      const operationResources = await this._prepareOperationResources({
         headers,
         query,
         trace,
         body,
         user,
         functionArgs: args,
      });

      const { project, recordSpace, mutate } = operationResources;

      this.context.req.trace.project = project;
      this.context.req.trace.recordSpace = this.contextFactory.assignRecordSpace(
         recordSpace,
      );

      this.logTrackerService.addMoreData(
         this.context.req.trace.reqId,
         {
            project: {
               id: String(project._id),
               slug: project.slug,
            },
            recordSpace: {
               id: String(recordSpace._id),
               slug: recordSpace.slug,
            },
         })


      if (mutate) {
         await this.preOperationMutation({ operationResources, params });
      }

      this.logger.sLog({}, 'ClientService::preOperation:: end of preOperation');

      return this.context.req;
   }

   async preOperationClearing(args: {
      operationResources: Pick<
         PreOperationResources,
         | 'project'
         | 'recordSpace'
         | 'clearThisRecordSpace'
         | 'mutate'
         | 'clearAllRecordSpaces'
         | 'initialData'
      >;
      params: BaseRecordSpaceSlugDto;
   }) {
      const { operationResources } = args;
      const {
         project,
         recordSpace,
         clearThisRecordSpace,
         mutate,
         clearAllRecordSpaces,
         initialData,
      } = operationResources;

      this.logger.sLog(
         { mutate, clearAllRecordSpaces, clearThisRecordSpace },
         'ClientService::preOperationClearing',
      );

      if (clearAllRecordSpaces) {
         await this.recordsService.deleteAllRecordsInProject(
            project.slug,
            String(project._id),
         );
         this.logger.sLog(
            {},
            'ClientService::preOperation::clearAllRecordSpaces:: Cleared all records from all recordSpaces',
         );
      }

      if (!clearAllRecordSpaces && clearThisRecordSpace) {
         const res = await this.recordsService.clearAllRecords(
            recordSpace._id.toHexString(),
         );

         this.logger.sLog(
            { res, recordSpaceSlug: recordSpace.slug },
            `ClientService::preOperation::clearAllRecords:: Cleared ${res[0].deletedCount} records from ${recordSpace.slug}`,
         );

         if (!initialData) {
            await this.recordSpacesService.update({
               query: { _id: recordSpace._id },
               update: { initialDataExist: false },
            });
         }

         throw new HttpException(
            `Cleared ${res[0].deletedCount} records from ${recordSpace.slug}`,
            HttpStatus.NO_CONTENT,
         );

      }
   }

   async preOperationDataInitialization(args: {
      operationResources: Pick<
         PreOperationResources,
         | 'project'
         | 'recordSpace'
         | 'clearThisRecordSpace'
         | 'mutate'
         | 'clearAllRecordSpaces'
         | 'initialData'
      >;
      params: BaseRecordSpaceSlugDto;
   }) {
      this.logger.sLog(
         {
            params: args.params,
            initialData: args.operationResources.initialData,
         },
         'ClientService::preOperationDataInitialization',
      );
      const { params, operationResources } = args;
      const { recordSpace, initialData } = operationResources;

      this.logger.sLog(
         { recordSpace },
         'ClientService::preOperationDataInitialization:: filling initialData',
      );
      await this.addRecords({
         params,
         bodyArray: initialData,
         commandType: CommandType.INSERT,
         skipPreOperation: true,
      });
      await this.recordSpacesService.update({
         query: { _id: recordSpace._id },
         update: { $set: { initialDataExist: true } },
      });
   }

   private async processSpaceAuthorization(args: {
      authOptions: CreateRecordSpaceInput['authOptions'];
      options: any;
      projectSlug: string;
      projectId: string;
      functionArgs: {
         commandType?: CommandType;
         params: BaseRecordSpaceSlugDto;
      };
      trace: TraceObject;
      userId: string;
   }) {
      this.logger.sLog({ args }, 'ClientService::_assertSpaceAuthorization');

      const {
         authOptions,
         options,
         functionArgs,
         projectSlug,
         projectId,
         userId: callerId,
      } = args;

      const {
         params: { recordSpaceSlug: spaceInContext },
      } = functionArgs;

      const { commandType } = functionArgs;

      const token = options?.token ?? authOptions?.token;

      const { space: spaceForAuth, scope } = authOptions;

      if (!scope.includes(commandType as any)) {
         this.logger.sLog(
            { commandType, authOptions },
            'ClientService::_assertSpaceAuthorization:: authorization Skipped for commandType',
         );
         return;
      }

      if (scope.includes(commandType as any)) {
         if (!token) {
            this.logger.sLog(
               { token },
               'ClientService::_assertSpaceAuthorization:: token is missing',
            );
            this.logger.sLog(
               { commandType, authOptions },
               'ClientService::_assertSpaceAuthorization:: commandType not allowed without authorization',
            );
            throwBadRequest(
               `Token is missing,Scope of Command: "${commandType}" is not allowed without authorization, check authOptions on ${spaceInContext} Space Model`,
            );
         }

         const tokenRes = verifyJWTToken(token, { throwOnError: false });
         if (!tokenRes) {
            this.logger.sLog(
               { token },
               'ClientService::_assertSpaceAuthorization:: invalid token',
            );
            throwBadRequest(
               `Invalid token for ${spaceForAuth} Space on AuthOptions`,
            );
         }

         const {
            userDetails: { id: userId },
         } = tokenRes as any;

         if (!userId) {
            this.logger.sLog(
               { userId },
               'ClientService::_prepareOperationResources:: invalid token details',
            );
            throwBadRequest(`Invalid token`);
         }

         const recordSpace = await this.recordSpacesService.findOne({
            query: {
               slug: spaceForAuth.toLowerCase(),
               user: callerId,
               projectSlug,
               project: projectId,
            },
         });

         if (!recordSpace) {
            this.logger.sLog(
               { recordSpace },
               'ClientService::_prepareOperationResources:: authOptions recordSpace does not exist',
            );
            throwBadRequest(
               `AuthOptions Space:  "slug: ${spaceForAuth}"  does not exist`,
            );
         }

         const userIdExist = await this.getRecordById({
            query: {
               _id: userId,
            },
            options: {
               skipPreOperation: true,
               throwOnEmpty: false,
               resources: {
                  params: {
                     recordSpaceSlug: spaceForAuth,
                     projectSlug,
                  },
                  recordSpace: hydrateRecordSpace(recordSpace),
               },
            },
         });

         if (!userIdExist) {
            this.logger.sLog(
               { userIdExist },
               'ClientService::_prepareOperationResources:: token user does not exist',
            );
            throwBadRequest(`Token user does not exist`);
         }
      }
   }

   private async _prepareOperationResources(args: {
      headers: ClientHeaders;
      query: CObject;
      body: CObject;
      trace: TraceObject;
      user: any;
      functionArgs: {
         commandType?: CommandType;
         params: BaseRecordSpaceSlugDto;
      };
   }) {
      this.logger.sLog({ args }, 'ClientService::_prepareOperationResources');

      const { headers, query: plainQuery, body, trace, user, functionArgs } = args;

      const convertedQuery = convertBooleanQueryField({
         query: plainQuery,
         headers
      });

      const query = convertedQuery;

      console.log({ plainQuery, query });

      const userId = String(user._id);

      const recordSpaceDetails = await this.recordSpacesService.findOne({
         query: {
            projectSlug: functionArgs.params.projectSlug,
            slug: functionArgs.params.recordSpaceSlug,
            user: userId
         },
      });

      const {
         autoCreateProject,
         autoCreateRecordSpace,
         options,
         mutate,
         incomingRecordSpaceStructure,
         authOptions,
         recordFieldStructures,
         projectSlug,
         clearAllRecordSpaces,
         clearThisRecordSpace,
         initialData,
         authEnabled,
         usePreStoredStructure
      } = computeClientHeaders({
         functionArgs,
         body,
         clientHeaders: headers,
         recordSpaceDetails
      });

      const {
         project,
         recordSpace,
      } = await this.recordSpacesService.handleRecordSpaceMutationInPreOperation(
         {
            autoCreateRecordSpace,
            recordFieldStructures,
            userId,
            incomingRecordSpaceStructure: incomingRecordSpaceStructure as any,
            autoCreateProject,
            allowMutation: Boolean(mutate),
            usePreStoredStructure,
            recordSpaceDetails
         },
      );

      if (authEnabled) {
         await this.processSpaceAuthorization({
            authOptions,
            options,
            userId,
            functionArgs,
            trace,
            projectSlug,
            projectId: String(project._id),
         });
      }

      const fieldsToConsider = !isEmpty(query) ? query : body;

      const { isQuery: requestIsAQuery, isSearch } = trace;

      if (!isSearch) {
         const { typeErrors } = validateFields({
            recordFieldStructures,
            fields: fieldsToConsider,
            logger: this.logger,
         });

         if (typeErrors.length) {
            this.logger.sLog(
               { typeErrors },
               'ClientService::_prepareOperationResources:: typeErrors ocurred',
            );
            throwBadRequest(typeErrors);
         }
      }

      this.context.req.trace.clientCall = options
         ? { options: options }
         : null;

      if (!requestIsAQuery && isEmpty(fieldsToConsider)) {
         this.logger.sLog(
            { query, body },
            'ClientService:preOperation:: Both query and body parameters are empty',
         );
         throwBadRequest('Absent Fields');
      }

      const resources = {
         autoCreateProject,
         autoCreateRecordSpace,
         authOptions,
         recordSpace,
         options,
         recordFieldStructures,
         projectSlug,
         fieldsToConsider,
         user,
         project,
         initialData,
         mutate,
         clearAllRecordSpaces,
         clearThisRecordSpace,
      };

      this.logger.sLog(
         { resources },
         'ClientService::_prepareOperationResources:: resources',
      );

      return resources;
   }

   private async processSkipPreOperation(args: {
      params: { recordSpaceSlug: string; projectSlug: string };
      options: {
         throwOnEmpty?: boolean;
         skipPreOperation?: boolean;
         paramRelationship?: ParamRelationship;
         pagination?: { limit: number; page: number };
         sort?: { by: string; order?: 'asc' | 'desc' };
         recordSpace?: HydratedRecordSpace;
      };
   }) {
      const { options, params } = args;
      const { skipPreOperation = false } = options || {};

      if (skipPreOperation && !options.recordSpace) {
         this.logger.sLog(
            { args, options },
            'ClientService::getRecords::processSkipPreOperation is true but recordSpace is not provided',
         );
         throwBadRequest('Something went wrong');
      }

      let { paramRelationship = 'And', pagination = null, sort, recordSpace } =
         options || {};

      if (!skipPreOperation) {
         if (!params) {
            this.logger.sLog(
               { args },
               'ClientService::processSkipPreOperation::params not found in args',
            );
            throwBadRequest('Something went wrong');
         }

         await this.preOperation(args as any, 'getRecords');

         ({
            options: { paramRelationship, pagination },
         } = this.contextFactory.getValue(['trace', 'clientCall']));
         recordSpace = this.contextFactory.getValue(['trace', 'recordSpace']);
         ({ sort } = this.contextFactory.getValue([
            'trace',
            'clientCall',
            'options',
         ]) as { sort: { by: string; order?: 'asc' | 'desc' } });
      }

      return {
         paramRelationship,
         pagination,
         sort,
         recordSpace,
      };
   }
}
