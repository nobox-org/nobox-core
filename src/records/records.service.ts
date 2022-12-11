import { RecordField, Record, RecordSpace } from '@/schemas';
import { Inject, Injectable, Scope } from '@nestjs/common';
import { CONTEXT } from '@nestjs/graphql';
import { CustomLogger as Logger } from '../logger/logger.service';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, UpdateQuery } from 'mongoose';
import { RecordSpacesService } from '@/record-spaces/record-spaces.service';
import { throwBadRequest, throwGraphqlBadRequest } from '@/utils/exceptions';
import { RecordStructureType } from '@/record-spaces/dto/record-structure-type.enum';
import { RecordFieldContentInput } from './entities/record-field-content.input.entity';
import { Context, RecordSpaceWithRecordFields, TraceObject } from '@/types';

@Injectable({ scope: Scope.REQUEST })
export class RecordsService {
  constructor(
    @InjectModel(Record.name) private recordModel: Model<Record>,
    @InjectModel(RecordField.name) private recordFieldModel: Model<RecordField>,
    private recordSpaceService: RecordSpacesService,
    @Inject(CONTEXT) private context: Context,
    private logger: Logger
  ) {
  }

  private GraphQlUserId() {
    const { req } = this.context;
    return req?.user ? req.user._id : "";
  }

  async updateRecord(id: string, update: UpdateQuery<Record> = {}): Promise<Record> {
    this.logger.sLog(update, "RecordService:Update");

    await this.assertRecordExistence(id);
    await this.assertFieldContentValidation(update.fieldsContent);

    const { fieldsContent } = this.context.trace.record;

    return this.recordModel.findOneAndUpdate({ _id: id }, update).populate({
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

  async getRecord({ query }: { query?: FilterQuery<Record> }): Promise<Record> {
    this.logger.sLog({ query }, "RecordService:getRecord");

    return this.recordModel.findOne(query).populate({
      path: 'fieldsContent',
      model: 'RecordFieldContent',
      populate: {
        path: 'field',
        model: 'RecordField',
      }
    });
  }

  async getRecords(args: { recordSpaceSlug: string, projectSlug: string, query?: FilterQuery<Record>, userId?: string }): Promise<Record[]> {
    this.logger.sLog(args, "RecordService:getRecords");
    const { recordSpaceSlug, projectSlug, query, userId = this.GraphQlUserId() } = args;

    let recordSpace = this.context.trace.recordSpace;

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
    });
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

    await this.assertFieldContentValidation(fieldsContent);

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


  async assertFieldContentValidation(fieldsContent: RecordFieldContentInput[]) {
    this.logger.sLog({ fieldsContent }, "RecordService:assertFieldContentValidation");

    const recordSpace = this.context.trace?.recordSpace;

    const uniqueFieldIds = [...new Set(fieldsContent.map(fieldContent => String(fieldContent.field)))];
    if (uniqueFieldIds.length !== fieldsContent.length) {
      this.logger.sLog({ uniqueFieldIds, fieldsContent }, "RecordService:assertFieldContentValidation: some fields are repeated");
      throwBadRequest("Some fields are repeated");
    }

    const { recordFields } = recordSpace;

    const requiredFields = recordFields.filter((structure) => structure.required);

    const requiredUnsetFields = requiredFields.filter((field) => !uniqueFieldIds.includes(String(field._id))).map(field => field.slug);

    if (requiredUnsetFields.length) {
      this.logger.sLog({ requiredFields, uniqueFieldIds, fieldsContent, requiredUnsetFields })
      throwBadRequest(`All Required Fields are not set, requiredFields: ${requiredUnsetFields.join(" and ")}`)
    }


    for (let index = 0; index < fieldsContent.length; index++) {

      const fieldContent = fieldsContent[index];

      if (!fieldContent.textContent && !fieldContent.numberContent) {
        this.logger.sLog({ fieldContent }, "RecordService:assertFieldContentValidation: one field is missing both textContent and numberContent");
        throwBadRequest("one field is missing both textContent and numberContent");
      }

      const field = recordSpace.recordFields.find(({ _id }) => fieldContent.field === _id);

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

  private async assertRecordExistence(recordId: string) {
    this.logger.sLog({ recordId }, "RecordService:assertRecordExistence");
    const record = await this.recordModel.findOne({ _id: recordId }).populate({
      path: 'fieldsContent',
      model: 'RecordFieldContent',
      populate: {
        path: 'field',
        model: 'RecordField',
      }
    });

    if (!record) {
      throwBadRequest(`Record does not exist`);
    };
    this.context.trace.record = record;

    return record;
  }
}
