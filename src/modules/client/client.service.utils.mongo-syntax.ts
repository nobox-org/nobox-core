import { Inject, Injectable, Scope } from '@nestjs/common';
import {
   CObject,
   Context,
   HydratedRecordSpace,
   ParamRelationship,
   RecordDbContentType,
   RecordStructureType,
} from '@/types';
import { CustomLogger as Logger } from '@/modules/logger/logger.service';
import { REQUEST } from '@nestjs/core';
import { throwBadRequest } from '@/utils/exceptions';
import { getQueryFieldDetails } from './utils';
import { getExistingKeysWithType } from './utils/get-existing-keys-with-type';
import { RecordsService } from '@/modules/records/records.service';
import { argonAbs, contextGetter } from '@/utils';
import { Filter, MRecord, MRecordField, ObjectId, ObjectIdOrString, RootFilterOperators } from "nobox-shared-lib";
import { RecordSpacesService } from '@/modules/record-spaces/record-spaces.service';
import { convertPlainObjectToComparativeArray } from './utils/convert-plain-obj-to-comparative-array';
import { deleteEmptyArrayNodes } from './utils/delete-empty-array-nodes';
import { validateFieldType } from './utils/validate-field-type';
@Injectable({ scope: Scope.REQUEST })
export class ClientServiceMongoSyntaxUtil {
   constructor(
      @Inject(REQUEST) private context: Context,
      private logger: Logger,
      private recordsService: RecordsService,
      private recordSpaceService: RecordSpacesService,
   ) {
      this.contextFactory = contextGetter(this.context.req, this.logger);
   }

   private contextFactory: ReturnType<typeof contextGetter>;

   /**
    * Create Syntax and Validates Fields
    * @param args
    * @returns
    */
   async createSyntax(
      args: Partial<{
         recordQuery: Record<string, string>;
         recordDocument: Record<string, string>;
         paramRelationship: ParamRelationship;
         requiredFieldsAreOptional: boolean;
      }>,
   ): Promise<
      Partial<{
         recordQuerySyntax: Filter<MRecord>;
         allHashedFieldsInQuery: Array<{
            value: string | number;
            slug: string;
         }>;
         recordCommandSyntax: {
            recordSpace: string;
            fieldsContent: any[];
         };
         errors?: string[];
         formattedRecordQuery: Record<string, string>;
      }>
   > {
      const {
         recordQuery,
         recordDocument,
         paramRelationship = 'And',
         requiredFieldsAreOptional = false,
      } = args;

      this.logger.sLog(
         {
            recordQuery,
            recordDocument,
            paramRelationship,
            requiredFieldsAreOptional,
         },
         'ClientServiceMongoSyntaxUtil::createSyntax',
      );

      const {
         _id: recordSpaceId,
         hydratedRecordFields: recordSpaceRecordFields,
         slug: recordSpaceSlug,
      } = this.contextFactory.getValue(['trace', 'recordSpace']);

      const result = { formattedRecordQuery: recordQuery } as any;
      if (recordQuery) {
         const {
            preparedQuery,
            allHashedFieldsInQuery,
            formattedRecordQuery,
         } = await this._createRecordQuerySyntax(
            recordSpaceSlug,
            recordSpaceId,
            recordQuery,
            recordSpaceRecordFields,
            paramRelationship === 'Or',
         );
         result.recordQuerySyntax = preparedQuery;
         result.allHashedFieldsInQuery = allHashedFieldsInQuery;
         result.formattedRecordQuery = formattedRecordQuery;
      }

      if (recordDocument) {
         const {
            preparedCommand,
            errors,
         } = await this._createRecordCommandSyntax(
            recordSpaceId,
            recordDocument,
            recordSpaceRecordFields,
            requiredFieldsAreOptional,
         );

         this.logger.sLog(
            { preparedCommand, errors },
            'ClientServiceMongoSyntaxUtil::createSyntax::preparedCommand',
         );

         if (errors?.length) {
            return {
               errors,
            };
         }

         result.recordCommandSyntax = preparedCommand;
      }

      return result;
   }

   private async _createRecordQuerySyntax(
      recordSpaceSlug: string,
      recordSpaceId: string,
      query: Record<string, string>,
      recordFields: MRecordField[],
      acrossRecords = false,
   ) {
      this.logger.sLog(
         { recordSpaceSlug, recordSpaceId, query, recordFields, acrossRecords },
         'ClientServiceMongoSyntaxUtil::prepareRecordQuery',
      );
      const init = this._initializeQuery(recordSpaceId, query, acrossRecords);
      const { queryKeys, allHashedFieldsInQuery } = init;
      let preparedQuery = init.preparedQuery;
      const formattedRecordQuery = init.formattedRecordQuery;

      for (let index = 0; index < queryKeys.length; index++) {
         const queryKey = queryKeys[index];
         const fieldDetails = getQueryFieldDetails(
            queryKey,
            recordFields,
            this.logger,
         );

         if (!fieldDetails) {
            const errorMessage = `${queryKey} does not exist for ${recordSpaceSlug}, existing fields are "${getExistingKeysWithType(
               recordFields,
            )}" `;
            this.logger.sLog(
               { recordFields, queryKeys },
               `createRecordQuerySyntax:: ${errorMessage} `,
            );
            throwBadRequest(`Query field: ${errorMessage}`);
         }

         const { hashed, slug } = fieldDetails;

         const { _id: fieldId, type } = fieldDetails;
         const dbType = this._mapToDbValueField(type);
         const value = String(query[queryKey]);

         switch (type) {
            case RecordStructureType.BOOLEAN:
               formattedRecordQuery[queryKey] = value === 'true' ? true : false;
               break;
            case RecordStructureType.ARRAY:
               formattedRecordQuery[queryKey] = JSON.parse(value);
               break;
         }

         if (hashed) {
            allHashedFieldsInQuery.push({ value, slug });
         }

         if (!hashed && !acrossRecords) {
            const _queryByField = this._createQueryByField({
               dbType,
               value,
               fieldId,
            });

            preparedQuery.$and.push(_queryByField);
         }
      }

      preparedQuery = deleteEmptyArrayNodes(preparedQuery, ['$and', '$or']);

      this.logger.sLog({ preparedQuery }, 'createRecordQuerySyntax::result');
      return {
         allHashedFieldsInQuery,
         preparedQuery,
         formattedRecordQuery: acrossRecords
            ? convertPlainObjectToComparativeArray(formattedRecordQuery, '$or')
            : formattedRecordQuery,
      };
   }

   private async _createRecordCommandSyntax(
      recordSpaceId: string,
      body: Record<string, string>,
      recordFields: MRecordField[],
      requiredFieldsAreOptional = false,
   ) {
      this.logger.sLog(
         { recordFields, recordSpaceId, body },
         'ClientServiceMongoSyntaxUtil::createRecordCommandSyntax',
      );

      const preparedCommand = {
         recordSpace: String(recordSpaceId),
         fieldsContent: [],
      };

      const bodyStore = { ...body };
      const wronglyOmittedFields = [];
      const errors = [];
      const urgentErrors = [];

      for (let index = 0; index < recordFields.length; index++) {
         const recordField = recordFields[index];
         const { slug, required, type, name, defaultValue } = recordField;

         delete bodyStore[name];

         let value = body[name];

         const fieldDoesNotExistInBody = value === undefined;

         if (
            fieldDoesNotExistInBody &&
            required &&
            defaultValue !== undefined
         ) {
            value = defaultValue;
         }

         const fieldIsWronglyOmitted =
            !requiredFieldsAreOptional &&
            fieldDoesNotExistInBody &&
            required &&
            defaultValue === undefined;

         if (fieldIsWronglyOmitted) {
            wronglyOmittedFields.push(slug);
            continue;
         }

         if (wronglyOmittedFields.length) {
            continue;
         }

         const fieldCanBeOmitted =
            fieldDoesNotExistInBody && (!required || requiredFieldsAreOptional);

         if (fieldCanBeOmitted) {
            continue;
         }

         const typeValidationError = value ? validateFieldType({
            logger: this.logger,
            value,
            type,
            name
         }) : null;

         if (typeValidationError) {
            errors.push(typeValidationError);
         }

         if (!errors.length) {
            const fieldContent = await this._createDocumentByField(
               recordField,
               value,
            );

            if (fieldContent.error) {
               urgentErrors.push(fieldContent.error);
               break;
            }

            preparedCommand.fieldsContent.push(fieldContent);
         }
      }

      if (urgentErrors.length) {
         return {
            errors: urgentErrors,
         };
      }

      const badFields = Object.keys(bodyStore);

      if (wronglyOmittedFields.length) {
         errors.push(
            `the following compulsory body fields: '${String(
               wronglyOmittedFields,
            )}' should be set`,
         );
      }

      if (badFields.length) {
         errors.push(
            `the following body fields: '${String(
               badFields,
            )}' does not exist, hence , not allowed`,
         );
      }

      if (errors.length) {
         return {
            errors,
         };
      }

      this.logger.sLog(
         { preparedCommand },
         'ClientServiceMongoSyntaxUtil::createRecordCommandSyntax::result',
      );

      return { preparedCommand };
   }

   private async _createDocumentByField(
      fieldDetails: MRecordField,
      value: string,
   ) {
      this.logger.sLog(
         { fieldDetails, value },
         'ClientServiceMongoSyntaxUtil::_createDocumentByField',
      );
      const {
         _id: fieldId,
         type,
         unique,
         name: fieldName,
         hashed,
      } = fieldDetails;
      const dbValueField = this._mapToDbValueField(type);

      const formatedValueByType = (() => {
         if (dbValueField === 'arrayContent' || dbValueField === 'objectContent') {
            return JSON.stringify(value);
         }

         return value;
      })();


      if (unique) {
         const {
            exists: similarRecordExists,
            record,
         } = await this.recordsService.isRecordFieldValueExisting({
            field: fieldId,
            dbContentType: dbValueField,
            value: formatedValueByType,
         });

         if (similarRecordExists) {
            const { query } = this.contextFactory.getFullContext();
            const existsForSameRecord = query.id === record._id.toString();
            if (!existsForSameRecord) {
               return {
                  error: `A similar "value: ${formatedValueByType}" already exist for unique "field: ${fieldName}"`,
               };
            }
         }
      }

      this.context.req.trace.optionallyHashedOnTransit = true;

      const res = {
         [dbValueField]: hashed
            ? await argonAbs.hash(formatedValueByType, this.logger)
            : formatedValueByType,
         field: fieldId,
      };

      return res;
   }

   private _createQueryByField(args: {
      dbType: RecordDbContentType;
      value: string | number;
      fieldId: ObjectIdOrString;
   }) {
      this.logger.sLog(args, 'createQueryByField');
      const { fieldId, dbType, value } = args;
      return {
         fieldsContent: { $elemMatch: { field: fieldId, [dbType]: value } },
      };
   }

   private _initializeQuery(
      recordSpaceId: string,
      query: Record<string, string>,
      acrossRecords: boolean,
   ) {
      this.logger.sLog(
         { recordSpaceId, query, acrossRecords },
         'ClientServiceMongoSyntaxUtil::_initializePreparedQuery',
      );
      const preparedQuery = {
         recordSpace: String(recordSpaceId),
      } as RootFilterOperators<MRecord>;

      const clonedQuery = Object.assign({}, query);

      if (clonedQuery.id) {
         if (!ObjectId.isValid(clonedQuery.id)) {
            throwBadRequest(
               `Query field Id: ${clonedQuery.id} is not a valid ObjectId`,
            );
         }
         preparedQuery._id = clonedQuery.id;
         delete clonedQuery.id;
      }

      const queryKeys = Object.keys(clonedQuery);

      if (queryKeys.length) {
         switch (acrossRecords) {
            case true:
               preparedQuery.$or = [];
               break;
            case false:
               preparedQuery.$and = [];
               break;
         }
      }

      return {
         queryKeys,
         preparedQuery,
         allHashedFieldsInQuery: [],
         formattedRecordQuery: Object.assign({}, query) as CObject,
      };
   }

   private _mapToDbValueField(type: RecordStructureType): RecordDbContentType {
      const recordStructureTypeToDbRecordContentTypeMap: Record<
         RecordStructureType,
         RecordDbContentType
      > = {
         [RecordStructureType.TEXT]: 'textContent',
         [RecordStructureType.NUMBER]: 'numberContent',
         [RecordStructureType.BOOLEAN]: 'booleanContent',
         [RecordStructureType.OBJECT]: 'objectContent',
         [RecordStructureType.ARRAY]: 'arrayContent',
      };

      return recordStructureTypeToDbRecordContentTypeMap[type];
   }

   async validatingSearchableText(args: {
      recordSpace: HydratedRecordSpace;
      searchableFields: string[];
   }) {
      this.logger.sLog(
         { searchableFields: args.searchableFields },
         'ClientServiceMongoSyntaxUtil::validatingSearchableText',
      );

      const { recordSpace, searchableFields } = args;

      if (searchableFields.length) {
         const { hydratedRecordFields, slug: recordSpaceSlug } = recordSpace;

         const allowedFieldNames = hydratedRecordFields.map(({ name }) => name);

         const invalidFields = [];

         const existingSearchableFields = recordSpace.searchableFields || [];

         const searchableFieldsIsDifferentByLength =
            existingSearchableFields.length !== searchableFields.length;

         const newSearchableFields = [];

         for (let index = 0; index < searchableFields.length; index++) {
            const field = searchableFields[index];
            if (!allowedFieldNames.includes(field)) {
               invalidFields.push(field);
            }

            if (
               !searchableFieldsIsDifferentByLength &&
               !existingSearchableFields.includes(field)
            ) {
               newSearchableFields.push(field);
            }
         }

         if (invalidFields.length) {
            this.logger.sLog(
               { invalidFields, recordSpaceSlug },
               'ClientService::validatingSearchableText::invalidFields',
            );
            throwBadRequest(
               `Following fields: ${invalidFields.join(
                  ', ',
               )} does not exist for recordSpace: ${recordSpaceSlug}}, Please check the fields and try again`,
            );
         }

         const searchableFieldsIsDifferent =
            searchableFieldsIsDifferentByLength || newSearchableFields.length;

         this.logger.sLog(
            {
               searchableFieldsIsDifferent,
               searchableFieldsIsDifferentByLength,
               newSearchableFields,
               existingSearchableFieldsInRecordSpace:
                  recordSpace.searchableFields,
            },
            'ClientService::validatingSearchableText',
         );

         if (searchableFieldsIsDifferent) {
            this.logger.sLog(
               { searchableFields, recordSpaceSlug },
               'ClientService::validatingSearchableText:: updated searchableFields on recordSpace',
            );
            await this.recordSpaceService.update({
               query: { _id: recordSpace._id },
               update: {
                  $set: {
                     searchableFields,
                  },
               },
            });
         }
      }
   }
}
