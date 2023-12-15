import {
   FindOptions,
   Filter,
   UpdateFilter,
   ObjectId,
   IndexSpecification,
} from 'nobox-shared-lib';
import { Inject, Injectable, Scope } from '@nestjs/common';
import { CustomLogger as Logger } from '@/modules/logger/logger.service';
import { RecordSpacesService } from '@/modules/record-spaces/record-spaces.service';
import { throwBadRequest } from '@/utils/exceptions';
import { CObject, Context, RecordStructureType } from '@/types';
import {
   contextGetter,
   measureTimeTaken,
   queryWithoutHashedFields,
} from '@/utils';
import {
   getRecordModel,
   MRecord,
   MRecordFieldContent,
   MRecordSpace,
   getRecordDumpModel,
   MRecordDump,
   ObjectIdOrString,
} from 'nobox-shared-lib';
import { postOperateRecordDump } from '@/modules/client/utils/post-operate-record-dump';
import { createRegexSearchObject } from '@/utils/create-regex-search-object';
import { RecordFieldContentInput } from './types';
import { mergeFieldContent } from '../client-functions/utils';

@Injectable({ scope: Scope.REQUEST })
export class RecordsService {
   private recordModel: ReturnType<typeof getRecordModel>;
   private recordDumpModel: ReturnType<typeof getRecordDumpModel>;

   constructor(
      private recordSpaceService: RecordSpacesService,
      @Inject('REQUEST') private context: Context,
      private logger: Logger,
   ) {
      this.contextFactory = contextGetter(this.context.req, this.logger);
      this.recordModel = getRecordModel(this.logger);
      this.recordDumpModel = getRecordDumpModel(this.logger);
   }

   private contextFactory: ReturnType<typeof contextGetter>;

   async saveRecordDump(args: { formattedRecord: CObject; record: MRecord }) {
      this.logger.sLog(args, 'RecordService:saveRecordDump');
      const { formattedRecord, record } = args;

      const result = await measureTimeTaken({
         func: this.recordDumpModel.insert({
            record,
            recordId: String(record._id),
            ...formattedRecord,
         }),
         tag: 'RecordService:saveRecordDump',
         context: this.context,
      });

      return result;
   }

   async deleteAllRecordsInProject(
      projectSlug: string,
      projectId: string,
   ): Promise<boolean> {
      this.logger.sLog(
         { projectSlug, projectId },
         'RecordService:deleteAllRecordsInProject',
      );
      const allRecordSpaces = await this.recordSpaceService.find({
         projectSlug,
         project: projectId,
      });
      await Promise.all(
         allRecordSpaces.map(recordSpace =>
            this.clearAllRecords(String(recordSpace._id)),
         ),
      );
      this.logger.sLog(
         { projectSlug, numberOfRecordSpaces: allRecordSpaces.length },
         'ProjectService:deleteAllRecordSpaces: records and recordSpaces cleared',
      );
      return true;
   }

   async updateRecordDump(args: {
      query: Filter<MRecordDump>;
      update: UpdateFilter<MRecordDump>;
      record: MRecord;
   }) {
      this.logger.sLog(args, 'RecordService:updateRecordDump');
      const { update, record, query } = args;

      const result = await measureTimeTaken({
         func: this.recordDumpModel.findOneAndUpdate(query, {
            $set: {
               record,
               recordId: String(record._id),
               ...update,
            },
         }),
         tag: 'RecordService:updateRecordDump',
         context: this.context,
      });

      return result;
   }

   async clearAllRecords(recordSpaceId: string) {
      this.logger.sLog({ recordSpaceId }, 'RecordService: clearAllRecords');
      const result = await Promise.all([
         this.clearRecordDump(recordSpaceId),
         this.clearRecords(recordSpaceId),
      ]);
      await this.recordSpaceService.update({
         query: {
            _id: new ObjectId(recordSpaceId),
         },
         update: {
            $set: {
               initialDataExist: false,
            },
         },
         throwOnEmpty: false,
      });
      return result;
   }

   private async clearRecordDump(recordSpaceId: string) {
      this.logger.sLog({ recordSpaceId }, 'RecordService:clearRecordDump');

      const result = await measureTimeTaken({
         func: this.recordDumpModel.deleteAll({
            'record.recordSpace': recordSpaceId,
         }),
         tag: 'RecordService:clearRecordDump',
         context: this.context,
      });

      this.logger.sLog({ result }, 'RecordService:clearRecordDump::result');
      return result;
   }

   private async clearRecords(recordSpaceId: string) {
      this.logger.sLog({ recordSpaceId }, 'RecordService: clearRecords');

      const result = await measureTimeTaken({
         func: this.recordModel.deleteAll({
            recordSpace: recordSpaceId,
         }),
         tag: 'RecordService: clearRecords::result',
         context: this.context,
      });

      this.logger.sLog({ result }, 'RecordService: clearRecords::result');
      return result;
   }

   async searchRecordDump(args: {
      recordSpace: MRecordSpace;
      searchText: string;
      options?: FindOptions<MRecordDump>;
      indexes?: IndexSpecification;
      reMappedRecordFields: CObject;
      searchableFields: string[];
   }) {
      this.logger.sLog(args, 'RecordService::searchRecordDump');
      const {
         searchText,
         options: _,
         recordSpace,
         reMappedRecordFields,
      } = args;

      const composedQuery = {
         'record.recordSpace': { $eq: String(recordSpace._id) },
      };

      this.logger.sLog(
         { searchText, composedQuery },
         'RecordService::searchRecordDump::composedQuery',
      );

      const regex = createRegexSearchObject(args.searchableFields, searchText);

      const recordDumps = await measureTimeTaken({
         func: this.recordDumpModel.find({
            $and: [
               { ...composedQuery },
               {
                  ...regex,
               },
            ],
         }),
         tag: 'RecordService::searchRecordDump::composedQuery',
         context: this.context,
      });

      const t0 = performance.now();

      const finalRecords = (
         await Promise.all(
            recordDumps.map(async recordDump => {
               const _ = await postOperateRecordDump(
                  {
                     recordDump,
                     reMappedRecordFields,
                  },
                  this.logger,
               );
               return _;
            }),
         )
      ).filter(record => record !== null);

      const t1 = performance.now();

      this.logger.sLog(
         { t1, t0, diff: t1 - t0 },
         'RecordService::searchRecordDump::postOperationRecordDump::time',
      );

      return finalRecords;
   }

   async findRecordDump(args: {
      recordSpace: MRecordSpace;
      query: Filter<MRecordDump>;
      options?: FindOptions<MRecordDump>;
      reMappedRecordFields: CObject;
      allHashedFieldsInQuery: { value: string | number; slug: string }[];
   }) {
      this.logger.sLog(args, 'RecordService::findRecordDump');
      const {
         query,
         options,
         recordSpace,
         reMappedRecordFields,
         allHashedFieldsInQuery,
      } = args;

      const composedQuery = {
         ...queryWithoutHashedFields({
            query,
            allHashedFieldsInQuery,
            logger: this.logger,
         }),
         'record.recordSpace': String(recordSpace._id),
      };

      this.logger.sLog(
         { composedQuery, query, allHashedFieldsInQuery },
         'RecordService::findRecordDump::composedQuery',
      );

      const recordDumps = await measureTimeTaken({
         func: this.recordDumpModel.find(composedQuery, options),
         tag: 'RecordService::findRecordDump',
         context: this.context,
      });

      if (!allHashedFieldsInQuery.length && !recordSpace.hasHashedFields) {
         const finalRecords = recordDumps.map(recordDump => {
            const { record, ...rest } = recordDump;
            return rest;
         });
         return finalRecords;
      }

      const t0 = performance.now();

      const finalRecords = (
         await Promise.all(
            recordDumps.map(async recordDump => {
               const _ = await postOperateRecordDump(
                  {
                     recordDump,
                     allHashedFieldsInQuery,
                     reMappedRecordFields,
                  },
                  this.logger,
               );
               return _;
            }),
         )
      ).filter(record => record !== null);

      const t1 = performance.now();

      this.logger.sLog(
         { t1, t0, diff: t1 - t0 },
         'postOperationRecordDump::time',
      );

      return finalRecords;
   }

   private UserIdFromContext() {
      this.logger.sLog({}, 'ProjectService:UserIdFromContext');
      const user = this.contextFactory.getValue(['user'], { silent: true });
      return user ? user?._id : '';
   }

   async updateRecordById(
      id: string,
      args: {
         existingFieldContent: MRecordFieldContent[];
         newFieldContent: MRecordFieldContent[];
         recordSpace: string;
      },
   ): Promise<MRecord> {
      this.logger.sLog({ args }, 'RecordService:UpdateRecordById');

      const { existingFieldContent, newFieldContent, recordSpace } = args;

      this.assertFieldContentValidation(newFieldContent);

      const mergedFieldContents = mergeFieldContent(
         { existingFieldContent, newFieldContent },
         this.logger,
      );

      const update: UpdateFilter<MRecord> = {
         recordSpace,
         fieldsContent: mergedFieldContents,
      };

      const record = await measureTimeTaken({
         func: this.recordModel.findOneAndUpdate(
            { _id: new ObjectId(id) },
            {
               $set: update,
            },
            {
               returnDocument: 'after',
            },
         ),
         tag: 'RecordService:Update',
         context: this.context,
      });

      return record;
   }

   async updateRecord(
      query: Filter<MRecord>,
      update: UpdateFilter<MRecord> = {},
   ): Promise<MRecord> {
      this.logger.sLog({ update, query }, 'RecordService:Update');

      this.assertFieldContentValidation(update.fieldsContent, {
         ignoreRequiredFields: true,
      });

      return measureTimeTaken({
         func: this.recordModel.findOneAndUpdate(query, update, {
            returnDocument: 'after',
         }),
         tag: 'RecordService:Update',
         context: this.context,
      });
   }

   async deleteRecord(id: string): Promise<MRecord> {
      this.logger.debug(id, 'RecordService:Delete');
      await this.assertRecordExistence(id);
      return this.recordModel.findOneAndDelete({ _id: new ObjectId(id) });
   }

   async getRecord({
      query,
      projection,
   }: {
      query?: Filter<MRecord>;
      projection?: FindOptions['projection'];
   }): Promise<MRecord> {
      this.logger.sLog({ query, projection }, 'RecordService:getRecord');

      return measureTimeTaken({
         func: this.recordModel.findOne(query, { projection }),
         tag: 'RecordService:getRecord',
         context: this.context,
      });
   }

   async getRecords(args: {
      recordSpaceSlug: string;
      projectSlug: string;
      query?: Filter<MRecord>;
      userId?: string;
      queryOptions?: FindOptions<MRecord>;
   }): Promise<MRecord[]> {
      this.logger.sLog(args, 'RecordService:getRecords');

      const {
         recordSpaceSlug,
         projectSlug,
         query,
         userId = this.UserIdFromContext(),
         queryOptions = null,
      } = args;

      const recordSpace = this.context.req.trace.recordSpace;

      let recordSpaceId = recordSpace?._id;

      if (!recordSpaceId) {
         const _recordSpace = await this.recordSpaceService.findOne({
            query: { slug: recordSpaceSlug, user: userId, projectSlug },
         });

         if (!_recordSpace) {
            throwBadRequest('Record Space does not exist');
         }

         recordSpaceId = _recordSpace._id;
      }

      return measureTimeTaken({
         func: this.recordModel.find(
            { recordSpace: String(recordSpaceId), ...query },
            queryOptions,
         ),
         tag: 'RecordService:getRecords',
         context: this.context,
      });
   }

   private async assertCreation(args: {
      projectSlug?: string;
      userId: string;
      recordSpaceSlug: string;
   }) {
      this.logger.sLog({ args }, 'RecordService:assertCreation');

      const { userId, recordSpaceSlug, projectSlug } = args;

      if (!userId || !projectSlug || !recordSpaceSlug) {
         throwBadRequest(
            'User id, recordSpace Slug and project slug is required',
         );
      }

      const recordSpace = await this.recordSpaceService.findOne({
         query: { slug: recordSpaceSlug, projectSlug, user: userId },
      });

      if (!recordSpace) {
         throwBadRequest('Record Space does not exist');
      }

      return recordSpace;
   }

   async create(args: {
      projectSlug: string;
      recordSpaceId?: string;
      recordSpaceSlug: string;
      fieldsContent: RecordFieldContentInput[];
      userId?: string;
      recordSpaceDetails?: MRecordSpace;
   }) {
      this.logger.sLog({ args }, 'RecordService:create');
      const {
         projectSlug,
         recordSpaceId: _recordSpaceId,
         recordSpaceSlug,
         fieldsContent,
         userId = this.UserIdFromContext(),
         recordSpaceDetails,
      } = args;

      let recordSpace = recordSpaceDetails;

      if (!recordSpace) {
         recordSpace = await this.assertCreation({
            userId,
            recordSpaceSlug,
            projectSlug,
         });
      }

      this.assertFieldContentValidation(fieldsContent);

      const { _id: recordSpaceId } = recordSpace;

      return measureTimeTaken({
         func: this.recordModel.insert({
            user: userId,
            recordSpace: String(recordSpaceId),
            fieldsContent,
         }),
         tag: 'RecordService::create',
         context: this.context,
      });
   }

   assertFieldContentValidation(
      fieldsContent: RecordFieldContentInput[],
      opts = { ignoreRequiredFields: false },
   ) {
      this.logger.sLog(
         { fieldsContent },
         'RecordService:assertFieldContentValidation',
      );

      const recordSpace = this.contextFactory.getValue([
         'trace',
         'recordSpace',
      ]);

      const uniqueFieldIds = [
         ...new Set(
            fieldsContent.map(fieldContent => String(fieldContent.field)),
         ),
      ];
      if (uniqueFieldIds.length !== fieldsContent.length) {
         this.logger.sLog(
            { uniqueFieldIds, fieldsContent },
            'RecordService:assertFieldContentValidation: some fields are repeated',
         );
         throwBadRequest('Some fields are repeated');
      }

      const { recordFields } = recordSpace;

      const { ignoreRequiredFields } = opts;

      if (!ignoreRequiredFields) {
         const requiredFields = recordFields.filter(
            structure => structure.required,
         );

         const requiredUnsetFields = requiredFields
            .filter(field => !uniqueFieldIds.includes(String(field._id)))
            .map(field => field.slug);

         if (requiredUnsetFields.length) {
            this.logger.sLog({
               requiredFields,
               uniqueFieldIds,
               fieldsContent,
               requiredUnsetFields,
            });
            throwBadRequest(
               `All Required Fields are not set, requiredFields: ${requiredUnsetFields.join(
                  ' and ',
               )}`,
            );
         }
      }

      for (let index = 0; index < fieldsContent.length; index++) {
         const fieldContent = fieldsContent[index];

         const field = recordSpace.hydratedRecordFields.find(
            ({ _id }) => String(fieldContent.field) === _id.toString(),
         );

         if (!field) {
            this.logger.sLog(
               { fieldContent, recordSpace: recordSpace._id },
               'RecordService:assertFieldContentValidation: one of the content fields does not exist',
            );
            throwBadRequest(
               'One of the Content Fields does not exist for this record space',
            );
         }

         const getContent = (fieldContent: RecordFieldContentInput) => {
            if (field.type === 'NUMBER') {
               return fieldContent.numberContent;
            }

            if (field.type === 'TEXT') {
               return fieldContent.textContent;
            }

            if (field.type === 'BOOLEAN') {
               return fieldContent.booleanContent;
            }

            if (field.type === 'ARRAY') {
               return fieldContent.arrayContent;
            }
         };

         const content = getContent(fieldContent);

         if (content === undefined || content === null) {
            this.logger.sLog(
               { fieldContent, field },
               'RecordService:assertFieldContentValidation: one field is missing  textContent, numberContent, booleanContent and arrayContent',
            );
            throwBadRequest(
               `A compulsory field has an empty value ${JSON.stringify({
                  [field.name]: content,
               }).replace('\\', '')}`,
            );
         }

         const fieldTypesToTypeChecks: Record<
            RecordStructureType,
            Array<string>
         > = {
            [RecordStructureType.BOOLEAN]: ['text', 'number'],
            [RecordStructureType.NUMBER]: ['text', 'boolean'],
            [RecordStructureType.TEXT]: ['number', 'boolean'],
            [RecordStructureType.ARRAY]: ['number', 'boolean', 'text'],
         };

         const typeChecks = fieldTypesToTypeChecks[field.type];

         for (let index = 0; index < typeChecks.length; index++) {
            const typeCheck = typeChecks[index];
            if (fieldContent[typeCheck + 'Content']) {
               this.logger.sLog(
                  { fieldContent, typeCheck },
                  `RecordService: assertFieldContentValidation: one of the content fields is a text field but has a ${typeCheck} content`,
               );
               throwBadRequest(
                  `One of the Content Fields is a text field but has a ${typeCheck} content`,
               );
            }
         }
      }
   }

   async isRecordFieldValueExisting(args: {
      field: ObjectIdOrString;
      dbContentType:
      | MRecordFieldContent['textContent']
      | MRecordFieldContent['numberContent']
      | MRecordFieldContent['booleanContent']
      | MRecordFieldContent['arrayContent'];
      value: string | number;
   }) {
      this.logger.sLog(args, 'RecordsService:: isRecordFieldValueExisting');

      const { recordSpace } = this.context.req.trace;

      const { field, dbContentType, value } = args;

      const query: Filter<MRecord> = {
         recordSpace: String(recordSpace._id),
         fieldsContent: {
            $elemMatch: {
               field,
               [dbContentType]: value,
            },
         },
      };

      const record = await measureTimeTaken({
         func: this.recordModel.findOne(query),
         tag: 'RecordsService::isRecordFieldValueExisting',
         context: this.context,
      });

      const result = { exists: Boolean(record), record };

      if (result.exists) {
         this.context.req.trace.records[
            String(record._id)
         ] = this.contextFactory.validateRecordContextUpdate(record);
      }

      return result;
   }

   private async assertRecordExistence(recordId: string) {
      this.logger.sLog({ recordId }, 'RecordService:assertRecordExistence');

      const record = await measureTimeTaken({
         func: this.recordModel.findOne({
            _id: new ObjectId(recordId),
         }),
         tag: 'RecordService:assertRecordExistence',
         context: this.context,
      });

      if (!record) {
         throwBadRequest(`Record does not exist`);
      }

      this.context.req.trace.records[
         String(record._id)
      ] = this.contextFactory.validateRecordContextUpdate(record);
   }
}
