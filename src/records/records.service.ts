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

  async getRecords(query: FilterQuery<Record> = {}, freeAccess: boolean = false): Promise<Record[]> {
    this.logger.sLog(query, "RecordService:find");

    if (!freeAccess) {
      const recordSpace = await this.recordSpaceService.findOne({ query: { _id: query.recordSpace, user: this.GraphQlUserId() } });
      if (!recordSpace) {
        throwBadRequest("Record Space does not exist for User");
      }
    }

    return this.recordModel.find(query).populate({
      path: 'fieldsContent',
      model: 'RecordFieldContent',
      populate: {
        path: 'field',
        model: 'RecordField',
      }
    });
  }

  async updateRecord(id: string, update: UpdateQuery<Record> = {}): Promise<Record> {
    this.logger.sLog(update, "RecordService:Update");

    this.assertUpdate(id, update.fieldsContent);

    return this.recordModel.findOneAndUpdate({ _id: id }, update).populate({
      path: 'fieldsContent',
      model: 'RecordFieldContent',
      populate: {
        path: 'field',
        model: 'RecordField',
      }
    });
  }

  async deleteRecord(id: string, recordSpaceQuery: FilterQuery<RecordSpace>): Promise<Record> {
    this.logger.debug(id, "RecordService:Delete");
    await this.assertRecordSpaceExistence(recordSpaceQuery);
    await this.assertRecordExistence(id);
    return this.recordModel.findOneAndDelete({ _id: id });
  }

  async getRecord(query: FilterQuery<Record> = {}, freeAccess: boolean = false): Promise<Record> {
    this.logger.sLog(query, "RecordService:find");

    if (!freeAccess) {
      const recordSpace = await this.recordSpaceService.findOne({ query: { _id: query.recordSpace, user: this.GraphQlUserId() } });
      if (!recordSpace) {
        throwBadRequest("Record Space does not exist for User");
      }
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


  private async assertCreation(args: { projectSlug?: string, userId: string, recordSpaceSlug: string, recordSpaceId?: string }) {
    const { userId, recordSpaceSlug, projectSlug, recordSpaceId } = args;

    if (recordSpaceId) {
      return recordSpaceId;
    }

    if (!userId || !projectSlug || !recordSpaceSlug) {
      throwGraphqlBadRequest("User id, recordSpace Slug and project slug is required");
    }

    const recordSpace = await this.recordSpaceService.findOne({ query: { slug: recordSpaceSlug }, projectSlug });

    if (!recordSpace) {
      throwGraphqlBadRequest("Record Space does not exist");
    }

    return recordSpace._id;
  }

  async create(args: { projectSlug: string, recordSpaceId?: string, recordSpaceSlug: string, fieldsContent: RecordFieldContentInput[] }, userId: string = this.GraphQlUserId()) {

    const { projectSlug, recordSpaceId: _recordSpaceId, recordSpaceSlug, fieldsContent } = args;
    const recordSpaceId = await this.assertCreation({ recordSpaceId: _recordSpaceId, userId, recordSpaceSlug, projectSlug });

    await this.assertRecordSpaceExistence({ _id: recordSpaceId, user: userId });

    await this.assertFieldContentValidation(fieldsContent, recordSpaceId);

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

  async assertFieldContentValidation(fieldsContent: RecordFieldContentInput[], recordSpace: string) {
    this.logger.sLog({ fieldsContent }, "RecordService:assertFieldContentValidation");
    const uniqueFieldIds = [...new Set(fieldsContent.map(fieldContent => fieldContent.field))];
    if (uniqueFieldIds.length !== fieldsContent.length) {
      this.logger.sLog({ uniqueFieldIds, fieldsContent }, "RecordService:assertFieldContentValidation: some fields are repeated");
      throwBadRequest("Some fields are repeated");
    }

    for (let index = 0; index < fieldsContent.length; index++) {

      const fieldContent = fieldsContent[index];

      if (!fieldContent.textContent && !fieldContent.numberContent) {
        this.logger.sLog({ fieldContent }, "RecordService:assertFieldContentValidation: one field is missing both textContent and numberContent");
        throwBadRequest("one field is missing both textContent and numberContent");
      }

      const field = await this.recordFieldModel.findOne({ recordSpace, _id: fieldContent.field });
      if (!field) {
        this.logger.sLog({ fieldContent }, "RecordService:assertFieldContentValidation: one of the content fields does not exist");
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

  private async assertRecordSpaceExistence(query: FilterQuery<RecordSpace>) {
    this.logger.sLog({ query }, "RecordService:assertRecordSpaceExistence");
    const recordSpaceExists = await this.recordSpaceService.findOne({ query });
    if (!recordSpaceExists) {
      throwBadRequest("Record Space does not exist for User");
    };
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
    const record = await this.getRecord({ _id: recordId }, true);
    if (!record) {
      throwBadRequest("Record does not exist");
    };

    const { recordSpace } = record;

    this.assertFieldContentValidation(fieldsContent, recordSpace as string);
  }
}
