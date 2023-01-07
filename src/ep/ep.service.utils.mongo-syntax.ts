
import { Inject, Injectable, Scope } from '@nestjs/common';
import { FindOptions, Filter, OptionalId, UpdateOptions, UpdateFilter, ObjectId, RootFilterOperators } from 'mongodb';
import { User } from "@/user/graphql/model";
import { Context, ObjectIdOrString, ParamRelationship, RecordDbContentType } from '@/types';
import { CustomLogger as Logger } from '@/logger/logger.service';
import { REQUEST } from '@nestjs/core';
import { throwBadRequest } from '@/utils/exceptions';
import { RecordStructureType } from '@/record-spaces/dto/record-structure-type.enum';
import { getQueryFieldDetails } from './utils';
import { getExistingKeysWithType } from './utils/get-existing-keys-with-type';
import { RecordsService } from '@/records/records.service';
import { bcryptAbs, contextGetter } from '@/utils';
import { MRecord, MRecordField } from '@/schemas';
import { perfTime } from './decorators/perf-time';
@perfTime()
@Injectable({ scope: Scope.REQUEST })
export class EpServiceMongoSyntaxUtil {
    constructor(
        @Inject(REQUEST) private context: Context,
        private logger: Logger,
        private recordsService: RecordsService,
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
            user: User;
            paramRelationship: ParamRelationship;
            requiredFieldsAreOptional: boolean;
        }>,
    ): Promise<Partial<{
        recordQuerySyntax: Filter<MRecord>;
        allHashedFieldsInQuery: Array<{ value: string | number, slug: string }>;
        recordCommandSyntax: {
            recordSpace: string;
            fieldsContent: any[];
        };
        errors?: string[]
    }>
    > {
        const { recordQuery, recordDocument, user, paramRelationship = "And", requiredFieldsAreOptional = false } = args;

        this.logger.sLog(
            { recordQuery, recordDocument, user, paramRelationship, requiredFieldsAreOptional },
            'EpServiceMongoSyntaxUtil:createSyntax',
        );


        const { _id: recordSpaceId, hydratedRecordFields: recordSpaceRecordFields, slug: recordSpaceSlug } = this.contextFactory.getValue(["trace", "recordSpace"]);

        const result = {} as any;
        if (recordQuery) {
            const { preparedQuery, allHashedFieldsInQuery } = await this._createRecordQuerySyntax(
                recordSpaceSlug,
                recordSpaceId,
                recordQuery,
                recordSpaceRecordFields,
                paramRelationship === "Or",
            )
            result.recordQuerySyntax = preparedQuery;
            result.allHashedFieldsInQuery = allHashedFieldsInQuery;
        }


        if (recordDocument) {
            const { preparedCommand, errors } = await this._createRecordCommandSyntax(
                recordSpaceId,
                recordDocument,
                recordSpaceRecordFields,
                requiredFieldsAreOptional
            )

            if (errors?.length) {
                return {
                    errors
                };
            }

            result.recordCommandSyntax = preparedCommand
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
        this.logger.sLog({ recordSpaceSlug, recordSpaceId, query, recordFields, acrossRecords }, "EpServiceMongoSyntaxUtil::prepareRecordQuery");
        const { queryKeys, preparedQuery } = this._initPreparedQuery(recordSpaceId, query, acrossRecords);

        const allHashedFieldsInQuery = [];

        for (let index = 0; index < queryKeys.length; index++) {
            const queryKey = queryKeys[index];
            const fieldDetails = getQueryFieldDetails(queryKey.toLowerCase(), recordFields, this.logger);

            const { hashed, slug } = fieldDetails;

            if (!fieldDetails) {
                const errorMessage = `${queryKey} does not exist for ${recordSpaceSlug}, existing fields are "${getExistingKeysWithType(recordFields)}" `
                this.logger.sLog({ recordFields, queryKeys }, `createRecordQuerySyntax:: ${errorMessage} `)
                throwBadRequest(`Query field: ${errorMessage}`);
            }

            const { _id: fieldId, type } = fieldDetails;
            const dbType = this._mapToDbValueField(type);
            const value = String(query[queryKey]);

            if (hashed) {
                allHashedFieldsInQuery.push({ value, slug });
            }

            if (!hashed) {
                const _queryByField = this._createQueryByField({
                    dbType,
                    value,
                    fieldId
                });
                switch (acrossRecords) {
                    case true:
                        preparedQuery.$or.push(_queryByField);
                        break;
                    case false:
                        preparedQuery.$and.push(_queryByField);
                        break;
                }
            }
        }
        this.logger.sLog({ preparedQuery }, "createRecordQuerySyntax::result")
        return {
            allHashedFieldsInQuery, preparedQuery
        }
    }

    private async _createRecordCommandSyntax(recordSpaceId: string, body: Record<string, string>, recordFields: MRecordField[], requiredFieldsAreOptional = false) {
        this.logger.sLog({ recordFields, recordSpaceId, body }, "EpServiceMongoSyntaxUtil::createRecordCommandSyntax")

        const preparedCommand = {
            recordSpace: recordSpaceId,
            fieldsContent: []
        }

        const bodyStore = { ...body };
        const wronglyOmittedFields = [];
        const errors = [];
        const urgentErrors = [];

        for (let index = 0; index < recordFields.length; index++) {
            const recordField = recordFields[index];
            const { slug, required, type } = recordField;

            delete bodyStore[slug];

            const value = body[slug];

            const fieldExistInBody = Boolean(value);

            const fieldIsWronglyOmitted = !requiredFieldsAreOptional && !fieldExistInBody && required;

            if (fieldIsWronglyOmitted) {
                wronglyOmittedFields.push(slug);
                continue;
            }

            if (wronglyOmittedFields.length) {
                continue;
            }

            const fieldCanBeOmitted = !fieldExistInBody && (!required || requiredFieldsAreOptional);

            if (fieldCanBeOmitted) {
                continue;
            }

            const validationError = this._validateValues(value, type, slug);

            if (validationError) {
                errors.push(validationError);
            }

            if (!errors.length) {
                const fieldContent = await this._createDocumentByField(recordField, value)

                if (fieldContent.error) {
                    urgentErrors.push(fieldContent.error);
                    break;
                };

                preparedCommand.fieldsContent.push(fieldContent);
            };
        }

        if (urgentErrors.length) {
            return {
                errors: urgentErrors
            }
        };

        const badFields = Object.keys(bodyStore);

        if (wronglyOmittedFields.length) {
            errors.push(`the following compulsory body fields: '${String(wronglyOmittedFields)}' should be set`);
        }

        if (badFields.length) {
            errors.push(`the following body fields: '${String(badFields)}' does not exist, hence , not allowed`);
        }

        if (errors.length) {
            return {
                errors
            }
        }

        return { preparedCommand };
    }

    private async _createDocumentByField(fieldDetails: MRecordField, value: string) {
        const { _id: fieldId, type, unique, name: fieldName, hashed } = fieldDetails;
        const dbValueField = this._mapToDbValueField(type);

        if (unique) {
            const { exists: similarRecordExists } = await this.recordsService.isRecordFieldValueUnique({ field: fieldId, dbContentType: dbValueField, value });
            if (similarRecordExists) {
                return {
                    error: `A similar "value: ${value}" already exist for unique "field: ${fieldName}"`
                }
            }
        }

        this.context.req.trace.optionallyHashedOnTransit = true;

        const res = {
            [dbValueField]: hashed ? await bcryptAbs.hash(value) : value,
            field: fieldId,
        };

        return res;
    }

    private _createQueryByField(args: {
        dbType: RecordDbContentType,
        value: string | number,
        fieldId: ObjectIdOrString,
    }) {
        this.logger.sLog(args, "createQueryByField")
        const { fieldId, dbType, value } = args;
        return {
            fieldsContent: { $elemMatch: { field: fieldId, [dbType]: value } }
        }
    }

    private _initPreparedQuery(recordSpaceId: string, query: Record<string, string>, acrossRecords: boolean) {
        this.logger.sLog({ recordSpaceId, query, acrossRecords }, "EpServiceMongoSyntaxUtil::_initPreparedQuery");
        const preparedQuery = {
            recordSpace: recordSpaceId,
        } as RootFilterOperators<MRecord>;

        if (query.id) {
            if (!ObjectId.isValid(query.id)) {
                throwBadRequest(`Query field Id: ${query.id} is not a valid ObjectId`);
            }
            preparedQuery._id = query.id;
            delete query.id;
        }

        const queryKeys = Object.keys(query);
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
        return { queryKeys, preparedQuery }
    }

    private _validateValues(value: string, type: string, bodyKey: string) {
        if (type === RecordStructureType.NUMBER && typeof value !== 'number') {
            return `Value for Body field: '${bodyKey}' should be a valid number`;
        }

        if (type === RecordStructureType.TEXT && typeof value !== 'string') {
            return `Value for Body field: '${bodyKey}' should be a valid string`;
        }
    }


    private _mapToDbValueField(type: RecordStructureType): RecordDbContentType {
        const recordStructureTypeToDbRecordContentTypeMap: Record<RecordStructureType, RecordDbContentType> = {
            [RecordStructureType.TEXT]: "textContent",
            [RecordStructureType.NUMBER]: "numberContent",
        };

        return recordStructureTypeToDbRecordContentTypeMap[type]
    };
}
