import { Record, RecordFieldContent } from '@/schemas';
import { Inject, Injectable, Scope } from '@nestjs/common';
import { CONTEXT } from '@nestjs/graphql';
import { CustomLogger as Logger } from '@/logger/logger.service';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, LeanDocument, Model, UpdateQuery } from 'mongoose';
import { RecordSpacesService } from '@/record-spaces/record-spaces.service';
import { throwBadRequest, throwGraphqlBadRequest } from '@/utils/exceptions';
import { RecordStructureType } from '@/record-spaces/dto/record-structure-type.enum';
import { RecordFieldContentInput } from './entities/record-field-content.input.entity';
import { Context, MongoDocWithTimeStamps, RecordSpaceWithRecordFields, TraceObject } from '@/types';
import { contextGetter } from '@/utils';

@Injectable({ scope: Scope.REQUEST })
export class RecordsService {
  constructor(
    @InjectModel(Record.name) private recordModel: Model<Record>,
    private recordSpaceService: RecordSpacesService,
    @Inject(CONTEXT) private context: Context,
    private logger: Logger
  ) {
    this.contextFactory = contextGetter(this.context.req, this.logger);
  }


  private contextFactory: ReturnType<typeof contextGetter>;

  private GraphQlUserId() {
    this.logger.sLog({}, "ProjectService:GraphQlUserId");
    const user = this.contextFactory.getValue(["user"], { silent: true });
    return user ? user?._id : "";
  }

  async updateRecord(id: string, update: UpdateQuery<Record> = {}): Promise<Record> {
    this.logger.sLog(update, "RecordService:Update");

    this.assertFieldContentValidation(update.fieldsContent);

    return this.recordModel.findOneAndUpdate({ _id: id }, update, { new: true }).populate({
      path: 'fieldsContent',
      model: 'RecordFieldContent',
      populate: {
        path: 'field',
        model: 'RecordField',
      }
    });
  }

  async deleteRecord(id: string): Promise<Record> {
    this.logger.debug(id, "RecordService:Delete");
    await this.assertRecordExistence(id);
    return this.recordModel.findOneAndDelete({ _id: id });
  }

  async getRecord({ query, dontPopulate = false }: { query?: FilterQuery<Record>, dontPopulate?: boolean }): Promise<MongoDocWithTimeStamps<LeanDocument<Record>>> {
    this.logger.sLog({ query }, "RecordService:getRecord");
    const results = this.recordModel.findOne(query);
    if (dontPopulate) {
      return results.lean();
    };

    return results.populate({
      path: 'fieldsContent',
      model: 'RecordFieldContent',
      populate: {
        path: 'field',
        model: 'RecordField',
      }
    }).lean();
  }


  async getRecords(args: { recordSpaceSlug: string, projectSlug: string, query?: FilterQuery<Record>, userId?: string }): Promise<(MongoDocWithTimeStamps<Record>)[]> {
    this.logger.sLog(args, "RecordService:getRecords");
    const { recordSpaceSlug, projectSlug, query, userId = this.GraphQlUserId() } = args;

    let recordSpace = this.context.req.trace.recordSpace;

    if (!recordSpace) {
      recordSpace = await this.recordSpaceService.findOne({ query: { slug: recordSpaceSlug }, user: { _id: userId }, projectSlug, populate: "recordFields" }) as RecordSpaceWithRecordFields;

      if (!recordSpace) {
        throwGraphqlBadRequest("Record Space does not exist");
      }
    }

    return this.recordModel.find({ recordSpace: recordSpace._id, ...query }).populate({
      path: 'fieldsContent',
      model: 'RecordFieldContent',
      populate: {
        path: 'field',
        model: 'RecordField',
      }
    }).lean();
  }

  private async assertCreation(args: { projectSlug?: string, userId: string, recordSpaceSlug: string }) {

    this.logger.sLog({ args }, "RecordService:assertCreation");

    const { userId, recordSpaceSlug, projectSlug } = args;

    if (!userId || !projectSlug || !recordSpaceSlug) {
      throwGraphqlBadRequest("User id, recordSpace Slug and project slug is required");
    }

    const recordSpace = await this.recordSpaceService.findOne({ query: { slug: recordSpaceSlug }, projectSlug, user: { _id: userId }, populate: "recordFields" });

    if (!recordSpace) {
      throwGraphqlBadRequest("Record Space does not exist");
    }

    return recordSpace as RecordSpaceWithRecordFields;
  }

  async create(args: { projectSlug: string, recordSpaceId?: string, recordSpaceSlug: string, fieldsContent: RecordFieldContentInput[] }, userId: string = this.GraphQlUserId(), _recordSpace?: RecordSpaceWithRecordFields) {

    this.logger.sLog({ args, userId }, "RecordService:create");
    const { projectSlug, recordSpaceId: _recordSpaceId, recordSpaceSlug, fieldsContent } = args;

    let recordSpace = _recordSpace;
    if (!recordSpace) {
      recordSpace = await this.assertCreation({ userId, recordSpaceSlug, projectSlug });
    }

    this.assertFieldContentValidation(fieldsContent);

    const { _id: recordSpaceId } = recordSpace


    const createdRecord = (await this.recordModel.create({ user: userId, recordSpace: recordSpaceId, fieldsContent })).populate({
      path: 'fieldsContent',
      model: 'RecordFieldContent',
      populate: {
        path: 'field',
        model: 'RecordField',
      }
    });

    this.logger.sLog({ createdRecord, userId, recordSpaceId, fieldsContent },
      'RecordService:create record details Saved'
    );

    return createdRecord;
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

      if (!fieldContent.textContent && !fieldContent.numberContent) {
        this.logger.sLog({ fieldContent }, "RecordService:assertFieldContentValidation: one field is missing both textContent and numberContent");
        throwBadRequest("one field is missing both textContent and numberContent");
      }

      const field = recordSpace.recordFields.find(({ _id }) => fieldContent.field.toString() === _id.toString());


      if (!field) {
        this.logger.sLog({ fieldContent, recordSpace: recordSpace._id }, "RecordService:assertFieldContentValidation: one of the content fields does not exist");
        throwBadRequest("One of the Content Fields does not exist for this recordspace");
      }

      if (field.type === RecordStructureType.TEXT && Boolean(fieldContent.numberContent)) {
        this.logger.sLog({ fieldContent }, "RecordService:assertFieldContentValidation: one of the content fields is a text field but has a number content");
        throwBadRequest("One of the Content Fields is a text field but has a number content");
      }

      if (field.type === RecordStructureType.NUMBER && Boolean(fieldContent.textContent)) {
        this.logger.sLog({ fieldContent }, "RecordService:assertFieldContentValidation: one of the content fields is a number field but has a text content");
        throwBadRequest("One of the Content Fields is a number field but has a text content");
      }
    }
  }

  async isRecordFieldValueUnique(args: {
    field: string;
    dbContentType: RecordFieldContent["textContent"] | RecordFieldContent["numberContent"];
    value: string | number;
  }) {
    this.logger.sLog(args, "RecordsService:: isRecordFieldValueUnique")

    const { recordSpace } = this.context.req.trace;

    const { field, dbContentType, value } = args;

    const query: FilterQuery<Record> = {
      recordSpace: recordSpace._id,
      fieldsContent: {
        $elemMatch: {
          field,
          [dbContentType]: value
        }
      }
    };
    const record = await this.recordModel.findOne(query) as MongoDocWithTimeStamps<LeanDocument<Record>>;
    const result = { exists: Boolean(record), record };

    if (result.exists) {
      this.context.req.trace.records[record._id] = this.contextFactory.validateRecordContextUpdate(record);
    }

    return result;
  }

  private async assertRecordExistence(recordId: string) {
    this.logger.sLog({ recordId }, "RecordService:assertRecordExistence");
    const record = await this.recordModel.findOne({ _id: recordId }).populate({
      path: 'fieldsContent',
      model: 'RecordFieldContent',
      populate: {
        path: 'field',
        model: 'RecordField',
      }
    }) as MongoDocWithTimeStamps<LeanDocument<Record>>;

    if (!record) {
      throwBadRequest(`Record does not exist`);
    };
    this.context.req.trace.records[record._id] = this.contextFactory.validateRecordContextUpdate(record);
    return record;
  }
}
