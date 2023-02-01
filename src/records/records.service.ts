import { FindOptions, Filter, UpdateFilter, ObjectId } from 'mongodb';
import { Inject, Injectable, Scope } from '@nestjs/common';
import { CONTEXT } from '@nestjs/graphql';
import { CustomLogger as Logger } from '@/logger/logger.service';
import { RecordSpacesService } from '@/record-spaces/record-spaces.service';
import { throwBadRequest, throwGraphqlBadRequest } from '@/utils/exceptions';
import { RecordStructureType } from '@/record-spaces/dto/record-structure-type.enum';
import { RecordFieldContentInput } from './entities/record-field-content.input.entity';
import { CObject, Context, ObjectIdOrString } from '@/types';
import { contextGetter, queryWithoutHashedFields } from '@/utils';
import { getRecordModel, MRecord, MRecordFieldContent, getRecordFieldModel, MRecordSpace, getRecordDumpModel, MRecordDump } from '@/schemas/slim-schemas';
import { perfTime } from '@/ep/decorators/perf-time';
import { postOperateRecordDump } from '@/ep/utils/post-operate-record-dump';

@Injectable({ scope: Scope.REQUEST })
export class RecordsService {

  private recordModel: ReturnType<typeof getRecordModel>;
  private recordDumpModel: ReturnType<typeof getRecordDumpModel>;

  constructor(
    private recordSpaceService: RecordSpacesService,
    @Inject(CONTEXT) private context: Context,
    private logger: Logger
  ) {
    this.contextFactory = contextGetter(this.context.req, this.logger);
    this.recordModel = getRecordModel(this.logger);
    this.recordDumpModel = getRecordDumpModel(this.logger);
  }

  async saveRecordDump(args: { formattedRecord: CObject, record: MRecord }) {
    this.logger.sLog(args, "RecordService:saveRecordDump");
    const { formattedRecord, record } = args;

    const result = await this.recordDumpModel.insert({
      record,
      recordId: String(record._id),
      ...formattedRecord
    });

    return result;
  }

  async updateRecordDump(args: { query: Filter<MRecordDump>, update: UpdateFilter<MRecordDump>, record: MRecord }) {
    this.logger.sLog(args, "RecordService:updateRecordDump");
    const { update, record, query } = args;

    const result = await this.recordDumpModel.findOneAndUpdate(query, {
      $set: {
        record,
        recordId: String(record._id),
        ...update
      }
    });

    return result;
  }


  async findRecordDump(args: {
    recordSpace: MRecordSpace;
    query: Filter<MRecordDump>;
    options?: FindOptions<MRecordDump>;
    reMappedRecordFields: CObject;
    allHashedFieldsInQuery: { value: string | number, slug: string }[];
  },) {
    this.logger.sLog(args, "RecordService::findRecordDump");
    const { query, options, recordSpace, reMappedRecordFields, allHashedFieldsInQuery } = args;

    const composedQuery = {
      ...queryWithoutHashedFields({ query, allHashedFieldsInQuery, logger: this.logger }),
      'record.recordSpace': String(recordSpace._id)
    };

    this.logger.sLog({ composedQuery, query, allHashedFieldsInQuery }, "RecordService::findRecordDump::composedQuery");


    const recordDumps = await this.recordDumpModel.find(composedQuery, options);

    if (!allHashedFieldsInQuery.length && !recordSpace.hasHashedFields) {
      const finalRecords = recordDumps.map((recordDump) => {
        const { record, ...rest } = recordDump;
        return rest;
      });
      return finalRecords;
    }

    const t0 = performance.now();

    const finalRecords = (await Promise.all(recordDumps.map(async recordDump => {
      const _ = await postOperateRecordDump({
        recordDump,
        allHashedFieldsInQuery,
        reMappedRecordFields,
      }, this.logger);
      return _;
    }))).filter(record => record !== null);

    const t1 = performance.now();

    this.logger.sLog({ t1, t0, diff: t1 - t0 }, 'postOperationRecordDump::time');

    return finalRecords;
  }

  private contextFactory: ReturnType<typeof contextGetter>;

  private GraphQlUserId() {
    this.logger.sLog({}, "ProjectService:GraphQlUserId");
    const user = this.contextFactory.getValue(["user"], { silent: true });
    return user ? user?._id : "";
  }

  async updateRecordById(id: string, update: UpdateFilter<MRecord> = {}): Promise<MRecord> {
    this.logger.sLog(update, "RecordService:Update");

    this.assertFieldContentValidation(update.fieldsContent);

    const record = await this.recordModel.findOneAndUpdate({ _id: new ObjectId(id) }, {
      $set: update
    }, {
      returnDocument: "after"
    });

    return record;
  }


  async updateRecord(query: Filter<MRecord>, update: UpdateFilter<MRecord> = {}): Promise<MRecord> {
    this.logger.sLog({ update, query }, "RecordService:Update");

    this.assertFieldContentValidation(update.fieldsContent, {
      ignoreRequiredFields: true
    });

    return this.recordModel.findOneAndUpdate(query, update, { returnDocument: "after" });
  }

  async deleteRecord(id: string): Promise<MRecord> {
    this.logger.debug(id, "RecordService:Delete");
    await this.assertRecordExistence(id);
    return this.recordModel.findOneAndDelete({ _id: new ObjectId(id) });
  }

  async getRecord({ query, projection }: { query?: Filter<MRecord>, projection?: FindOptions["projection"] }): Promise<MRecord> {
    this.logger.sLog({ query, projection }, "RecordService:getRecord");
    return this.recordModel.findOne(query, { projection });
  }


  async getRecords(args: {
    recordSpaceSlug: string,
    projectSlug: string,
    query?: Filter<MRecord>,
    userId?: string,
    queryOptions?: FindOptions<MRecord>
  }): Promise<MRecord[]> {

    this.logger.sLog(args, "RecordService:getRecords");

    const { recordSpaceSlug, projectSlug, query, userId = this.GraphQlUserId(), queryOptions = null } = args;

    const recordSpace = this.context.req.trace.recordSpace;

    let recordSpaceId = recordSpace?._id;

    if (!recordSpaceId) {
      const _recordSpace = await this.recordSpaceService.findOne({ query: { slug: recordSpaceSlug, user: userId, projectSlug } });

      if (!_recordSpace) {
        throwGraphqlBadRequest("Record Space does not exist");
      }

      recordSpaceId = _recordSpace._id;
    }

    console.log({ recordSpace, recordSpaceId })

    return this.recordModel.find({ recordSpace: String(recordSpaceId), ...query }, queryOptions);
  }




  private async assertCreation(args: { projectSlug?: string, userId: string, recordSpaceSlug: string }) {

    this.logger.sLog({ args }, "RecordService:assertCreation");

    const { userId, recordSpaceSlug, projectSlug } = args;

    if (!userId || !projectSlug || !recordSpaceSlug) {
      throwGraphqlBadRequest("User id, recordSpace Slug and project slug is required");
    }

    const recordSpace = await this.recordSpaceService.findOne({ query: { slug: recordSpaceSlug, projectSlug, user: userId, } });

    if (!recordSpace) {
      throwGraphqlBadRequest("Record Space does not exist");
    }

    return recordSpace;
  }

  async create(args: { projectSlug: string, recordSpaceId?: string, recordSpaceSlug: string, fieldsContent: RecordFieldContentInput[] }, userId: string = this.GraphQlUserId(), _recordSpace?: MRecordSpace) {

    this.logger.sLog({ args, userId }, "RecordService:create");
    const { projectSlug, recordSpaceId: _recordSpaceId, recordSpaceSlug, fieldsContent } = args;

    let recordSpace = _recordSpace;
    if (!recordSpace) {
      recordSpace = await this.assertCreation({ userId, recordSpaceSlug, projectSlug });
    }

    this.assertFieldContentValidation(fieldsContent);

    const { _id: recordSpaceId } = recordSpace

    return this.recordModel.insert({ user: userId, recordSpace: String(recordSpaceId), fieldsContent });

  }


  assertFieldContentValidation(fieldsContent: RecordFieldContentInput[], opts = { ignoreRequiredFields: false }) {
    this.logger.sLog({ fieldsContent }, "RecordService:assertFieldContentValidation");

    const recordSpace = this.contextFactory.getValue(["trace", "recordSpace"]);


    const uniqueFieldIds = [...new Set(fieldsContent.map(fieldContent => String(fieldContent.field)))];
    if (uniqueFieldIds.length !== fieldsContent.length) {
      this.logger.sLog({ uniqueFieldIds, fieldsContent }, "RecordService:assertFieldContentValidation: some fields are repeated");
      throwBadRequest("Some fields are repeated");
    }

    const { recordFields } = recordSpace;

    const { ignoreRequiredFields } = opts;


    if (!ignoreRequiredFields) {
      const requiredFields = recordFields.filter((structure) => structure.required);

      const requiredUnsetFields = requiredFields.filter((field) => !uniqueFieldIds.includes(String(field._id))).map(field => field.slug);

      if (requiredUnsetFields.length) {
        this.logger.sLog({ requiredFields, uniqueFieldIds, fieldsContent, requiredUnsetFields })
        throwBadRequest(`All Required Fields are not set, requiredFields: ${requiredUnsetFields.join(" and ")}`)
      }
    }


    for (let index = 0; index < fieldsContent.length; index++) {

      const fieldContent = fieldsContent[index];

      if (!fieldContent.textContent && !fieldContent.numberContent && !fieldContent.booleanContent) {
        this.logger.sLog({ fieldContent }, "RecordService:assertFieldContentValidation: one field is missing  textContent, numberContent and booleanContent");
        throwBadRequest("one field is missing both textContent, numberContent and booleanContent");
      }

      const field = recordSpace.hydratedRecordFields.find(({ _id }) => String(fieldContent.field) === _id.toString());


      if (!field) {
        this.logger.sLog({ fieldContent, recordSpace: recordSpace._id }, "RecordService:assertFieldContentValidation: one of the content fields does not exist");
        throwBadRequest("One of the Content Fields does not exist for this recordspace");
      }

      const fieldTypesToTypeChecks: Record<RecordStructureType, Array<string>> = {
        [RecordStructureType.BOOLEAN]: ["text", "number"],
        [RecordStructureType.NUMBER]: ["text", "boolean"],
        [RecordStructureType.TEXT]: ["number", "boolean"],
      }

      const typeChecks = fieldTypesToTypeChecks[field.type];

      for (let index = 0; index < typeChecks.length; index++) {
        const typeCheck = typeChecks[index];
        if (fieldContent[typeCheck + "Content"]) {
          this.logger.sLog({ fieldContent, typeCheck }, `RecordService:assertFieldContentValidation: one of the content fields is a text field but has a ${typeCheck} content`);
          throwBadRequest(`One of the Content Fields is a text field but has a ${typeCheck} content`);
        }
      }
    }
  }

  async isRecordFieldValueUnique(args: {
    field: ObjectIdOrString;
    dbContentType: MRecordFieldContent["textContent"] | MRecordFieldContent["numberContent"] | MRecordFieldContent["booleanContent"];
    value: string | number;
  }) {
    this.logger.sLog(args, "RecordsService:: isRecordFieldValueUnique")

    const { recordSpace } = this.context.req.trace;

    const { field, dbContentType, value } = args;

    const query: Filter<MRecord> = {
      recordSpace: String(recordSpace._id),
      fieldsContent: {
        $elemMatch: {
          field,
          [dbContentType]: value
        }
      }
    };
    const record = await this.recordModel.findOne(query);
    const result = { exists: Boolean(record), record };

    if (result.exists) {
      this.context.req.trace.records[String(record._id)] = this.contextFactory.validateRecordContextUpdate(record);
    }

    return result;
  }

  private async assertRecordExistence(recordId: string) {
    this.logger.sLog({ recordId }, "RecordService:assertRecordExistence");
    const record = await this.recordModel.findOne({ _id: new ObjectId(recordId) });

    if (!record) {
      throwBadRequest(`Record does not exist`);
    };

    this.context.req.trace.records[String(record._id)] = this.contextFactory.validateRecordContextUpdate(record);
  }
}
