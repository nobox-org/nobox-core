
import { Inject, Injectable, Scope } from '@nestjs/common';
import { User } from "@/user/graphql/model";
import { Context, ParamRelationship, RecordDbContentType } from '@/types';
import { CustomLogger as Logger } from '@/logger/logger.service';
import { REQUEST } from '@nestjs/core';
import { Record as Record_, RecordField } from "@/schemas";
import mongoose, { FilterQuery } from "mongoose";
import { throwBadRequest } from '@/utils/exceptions';
import { RecordStructureType } from '@/record-spaces/dto/record-structure-type.enum';
import { getQueryFieldDetails } from './utils';
import { getExistingKeysWithType } from './utils/get-existing-keys-with-type';
import { RecordsService } from '@/records/records.service';
import { bcryptAbs, contextGetter } from '@/utils';

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

    async createSyntax(
        args: Partial<{
            recordQuery: Record<string, string>;
            recordDocument: Record<string, string>;
            user: User;
            paramRelationship: ParamRelationship;
            requiredFieldsAreOptional: boolean;
        }>,
    ): Promise<Partial<{
        recordQuerySyntax: mongoose.FilterQuery<Record_>;
        allHashedFieldsInQuery: Array<{ value: string | number, slug: string }>;
        recordCommandSyntax: {
            recordSpace: string;
            fieldsContent: any[];
        };
    }>
    > {
        const { recordQuery, recordDocument, user, paramRelationship = "And", requiredFieldsAreOptional = false } = args;

        this.logger.sLog(
            { recordQuery, recordDocument, user, paramRelationship, requiredFieldsAreOptional },
            'EpServiceMongoSyntaxUtil:createSyntax',
        );

        const { _id: recordSpaceId, recordFields: recordSpaceRecordFields, slug: recordSpaceSlug } = this.contextFactory.getValue(["trace", "recordSpace"]);

        if (recordQuery) {
            const { preparedQuery, allHashedFieldsInQuery } = await this._createRecordQuerySyntax(
                recordSpaceSlug,
                recordSpaceId,
                recordQuery,
                recordSpaceRecordFields,
                paramRelationship === "Or",
            )
            return {
                recordQuerySyntax: preparedQuery,
                allHashedFieldsInQuery
            }
        }


        if (recordDocument) {
            const { preparedCommand } = await this._createRecordCommandSyntax(
                recordSpaceId,
                recordDocument,
                recordSpaceRecordFields,
                requiredFieldsAreOptional
            )
            return {
                recordCommandSyntax: preparedCommand
            }
        }
    }

    private async _createRecordQuerySyntax(
        recordSpaceSlug: string,
        recordSpaceId: string,
        query: Record<string, string>,
        recordFields: RecordField[],
        acrossRecords = false,
    ) {
        this.logger.sLog({ recordSpaceSlug, recordSpaceId, query, recordFields, acrossRecords }, "EpServiceMongoSyntaxUtil::prepareRecordQuery");
        const { queryKeys, preparedQuery } = this._initPreparedQuery(recordSpaceId, query, acrossRecords);

        const allHashedFieldsInQuery = [];

        for (let index = 0; index < queryKeys.length; index++) {
            const queryKey = queryKeys[index];
            const fieldDetails = getQueryFieldDetails(queryKey.toLowerCase(), recordFields);

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

    private async _createRecordCommandSyntax(recordSpaceId: string, body: Record<string, string>, recordFields: RecordField[], requiredFieldsAreOptional = false) {
        this.logger.sLog({ recordFields, recordSpaceId, body }, "EpServiceMongoSyntaxUtil::createRecordCommandSyntax")

        const preparedCommand = {
            recordSpace: recordSpaceId,
            fieldsContent: []
        }

        const bodyStore = { ...body };
        const allowedFields = [];
        const wronglyOmittedFields = [];
        const errors = [];

        for (let index = 0; index < recordFields.length; index++) {
            const { slug, required, type } = recordFields[index];

            delete bodyStore[slug];
            allowedFields.push(slug);

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

            if (!errors.length) { preparedCommand.fieldsContent.push(await this._createDocumentByField(recordFields[index], value)) };
        }

        const badFields = Object.keys(bodyStore);

        if (wronglyOmittedFields.length) {
            errors.push(`the following compulsory body fields: '${String(wronglyOmittedFields)}' should be set`);
        }

        if (badFields.length) {
            errors.push(`the following body fields: '${String(badFields)}' does not exist, hence , not allowed`);
        }

        if (errors.length) {
            throwBadRequest(errors);
        }

        return { preparedCommand };
    }

    private async _createDocumentByField(fieldDetails: RecordField, value: string) {
        const { _id: fieldId, type, unique, name: fieldName, hashed } = fieldDetails;
        const dbValueField = this._mapToDbValueField(type);

        if (unique) {
            const { exists: similarRecordExists } = await this.recordsService.isRecordFieldValueUnique({ field: fieldId, dbContentType: dbValueField, value });
            if (similarRecordExists) throwBadRequest(`A similar "value: ${value}" already exist for unique "field: ${fieldName}"`)
        }

        this.context.req.trace.optionallyHashedOnTransit = true;

        return {
            [dbValueField]: hashed ? await bcryptAbs.hash(value) : value,
            field: fieldId,
        }
    }

    private _createQueryByField(args: {
        dbType: RecordDbContentType,
        value: string | number,
        fieldId: string,
    }) {
        this.logger.sLog(args, "createQueryByField")
        const { fieldId, dbType, value } = args;
        return {
            fieldsContent: { $elemMatch: { field: fieldId, [dbType]: value } }
        }
    }

    private _initPreparedQuery(recordSpaceId: string, query: Record<string, string>, acrossRecords: boolean) {
        this.logger.sLog({ recordSpaceId, query, acrossRecords }, "EpServiceMongoSyntaxUtil::_initPreparedQuery");
        const preparedQuery: FilterQuery<Record_> = {
            recordSpace: recordSpaceId,
        }

        if (query.id) {
            if (!mongoose.Types.ObjectId.isValid(query.id)) {
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
