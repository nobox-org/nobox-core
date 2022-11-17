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


@Injectable({ scope: Scope.REQUEST })
export class RecordsService {
  constructor(
    @InjectModel(Record.name) private recordModel: Model<Record>,
    @InjectModel(RecordField.name) private recordFieldModel: Model<RecordField>,
    private recordSpaceService: RecordSpacesService,
    @Inject(CONTEXT) private context,
    private logger: Logger
  ) {
  }

  private GraphQlUserId() {
    const { req } = this.context;
    return req?.user ? req.user._id : "";
  }

  async updateRecord(id: string, update: UpdateQuery<Record> = {}): Promise<Record> {
    this.logger.sLog(update, "RecordService:Update");

    await this.assertUpdate(id, update.fieldsContent);

    return this.recordModel.findOneAndUpdate({ _id: id }, update).populate({
      path: 'fieldsContent',
      model: 'RecordFieldContent',
      populate: {
        path: 'field',
        model: 'RecordField',
      }
    });
  }

  async deleteRecord(id: string, recordSpaceQuery: FilterQuery<RecordSpace>, projectSlug?: string, user?: { _id: string }): Promise<Record> {
    this.logger.debug(id, "RecordService:Delete");
    await this.assertRecordSpaceExistence(recordSpaceQuery, projectSlug, user);
    await this.assertRecordExistence(id);
    return this.recordModel.findOneAndDelete({ _id: id });
  }

  async getRecord(args: { recordSpaceSlug: string, projectSlug: string, query?: FilterQuery<Record>, userId?: string }): Promise<Record> {
    this.logger.sLog(args, "RecordService:getRecord");

    const { recordSpaceSlug, projectSlug, query, userId = this.GraphQlUserId() } = args;

    const recordSpace = await this.recordSpaceService.findOne({ query: { slug: recordSpaceSlug }, user: { _id: userId }, projectSlug });

    if (!recordSpace) {
      throwGraphqlBadRequest("Record Space does not exist");
    }

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

    const recordSpace = await this.recordSpaceService.findOne({ query: { slug: recordSpaceSlug }, user: { _id: userId }, projectSlug });

    if (!recordSpace) {
      throwGraphqlBadRequest("Record Space does not exist");
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


  private async assertCreation(args: { projectSlug?: string, userId: string, recordSpaceSlug: string, recordSpaceId?: string }) {

    this.logger.sLog({ args }, "RecordService:assertCreation");

    const { userId, recordSpaceSlug, projectSlug, recordSpaceId } = args;

    if (recordSpaceId) {
      return recordSpaceId;
    }

    if (!userId || !projectSlug || !recordSpaceSlug) {
      throwGraphqlBadRequest("User id, recordSpace Slug and project slug is required");
    }

    const recordSpace = await this.recordSpaceService.findOne({ query: { slug: recordSpaceSlug }, projectSlug, user: { _id: userId } });

    if (!recordSpace) {
      throwGraphqlBadRequest("Record Space does not exist");
    }

    return recordSpace._id;
  }

  async create(args: { projectSlug: string, recordSpaceId?: string, recordSpaceSlug: string, fieldsContent: RecordFieldContentInput[] }, userId: string = this.GraphQlUserId()) {

    this.logger.sLog({ args, userId }, "RecordService:create");
    const { projectSlug, recordSpaceId: _recordSpaceId, recordSpaceSlug, fieldsContent } = args;
    const recordSpaceId = await this.assertCreation({ recordSpaceId: _recordSpaceId, userId, recordSpaceSlug, projectSlug });

    const recordSpace = await this.assertRecordSpaceExistence({ _id: recordSpaceId, user: userId });

    await this.assertFieldContentValidation(fieldsContent, recordSpace);

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

  async assertFieldContentValidation(fieldsContent: RecordFieldContentInput[], recordSpace: RecordSpace) {
    this.logger.sLog({ fieldsContent, recordSpace }, "RecordService:assertFieldContentValidation");

    const uniqueFieldIds = [...new Set(fieldsContent.map(fieldContent => fieldContent.field))];
    if (uniqueFieldIds.length !== fieldsContent.length) {
      this.logger.sLog({ uniqueFieldIds, fieldsContent }, "RecordService:assertFieldContentValidation: some fields are repeated");
      throwBadRequest("Some fields are repeated");
    }

    const { recordStructure } = recordSpace;

    const requiredFields = recordStructure.filter((structure) => structure.required);

    const requiredUnsetFields = requiredFields.filter((field) => !uniqueFieldIds.includes(String(field.recordField))).map(field => field.slug);

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

      const field = await this.recordFieldModel.findOne({ recordSpace: recordSpace._id, _id: fieldContent.field });
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

  private async assertRecordSpaceExistence(query: FilterQuery<RecordSpace>, projectSlug?: string, user?: { _id: string }) {
    this.logger.sLog({ query }, "RecordService:assertRecordSpaceExistence");
    const recordSpace = await this.recordSpaceService.findOne({ query, projectSlug, user });
    if (!recordSpace) {
      throwBadRequest("Record Space does not exist for User");
    };
    return recordSpace;
  }

  private async assertRecordExistence(recordId: string) {
    this.logger.sLog({ recordId }, "RecordService:assertRecordExistence");
    const recordExists = await this.recordModel.findOne({ _id: recordId });
    if (!recordExists) {
      throwBadRequest("Record does not exist");
    };
  }

  private async assertUpdate(recordId: string, fieldsContent: RecordFieldContentInput[]) {
    this.logger.sLog({ recordId }, "RecordService:assertUpdate");
    const record = await this.recordModel.findOne({ _id: recordId, fieldsContent }).populate({
      path: 'fieldsContent',
      model: 'RecordFieldContent',
      populate: {
        path: 'field',
        model: 'RecordField',
      }
    });

    console.log({ record })

    if (!record) {
      throwBadRequest(`Record does not exist`);
    };

    const { recordSpace } = record;

    const recordSpaceDetails = await this.recordSpaceService.findOne({ query: { _id: recordSpace } });

    this.assertFieldContentValidation(fieldsContent, recordSpaceDetails);
  }
}
