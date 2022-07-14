import { RecordField, RecordSpace } from '@/schemas';
import { Inject, Injectable, Scope } from '@nestjs/common';
import { CONTEXT } from '@nestjs/graphql';
import { CustomLogger as Logger } from 'src/logger/logger.service';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, ProjectionFields, UpdateQuery } from 'mongoose';
import { CreateRecordSpaceInput } from './dto/create-record-space.input';
import { ProjectsService } from '@/projects/projects.service';
import { RecordStructure } from './entities/record-structure.entity';
import { throwBadRequest } from '@/utils/exceptions';

@Injectable({ scope: Scope.REQUEST })
export class RecordSpacesService {

  constructor(
    @InjectModel(RecordSpace.name) private recordSpaceModel: Model<RecordSpace>,
    @InjectModel(RecordField.name) private recordFieldModel: Model<RecordField>,
    private projectService: ProjectsService,
    @Inject(CONTEXT) private context,
    private logger: Logger
  ) {
  }

  private GraphQlUserId() {
    const { req } = this.context;
    return req?.user ? req.user._id : "";
  }

  private async assertCreation(projectId: string, userId: string, slug: string) {
    const projectExists = await this.projectService.findOne({ _id: projectId, user: userId });
    if (!projectExists) {
      throwBadRequest("Project does not exist");
    };

    const recordSpaceExists = await this.recordSpaceModel.findOne({ slug });
    if (recordSpaceExists) {
      throwBadRequest("Record Space with this slug already exists");
    }
  }

  private async createFields(recordSpaceId: string, recordStructure: RecordStructure[]): Promise<void> {
    this.logger.sLog(recordStructure, "RecordSpaceService:createFields");
    const slugList = recordStructure.map(field => field.slug);
    const trimmedSlugList = [...new Set(slugList)];
    if (slugList.length !== trimmedSlugList.length) {
      throwBadRequest("Duplicate Form Field slugs found, Use Unique Slugs");
    }
    await Promise.all(recordStructure.map(recordStructure => this.createField(recordSpaceId, recordStructure)));
  }

  private async createField(recordSpaceId: string, field: RecordStructure): Promise<RecordField> {
    const recordField = new this.recordFieldModel({
      recordSpace: recordSpaceId,
      ...field
    });
    recordField.save();
    this.logger.sLog({ recordSpaceId, recordField },
      'RecordSpaceService:createField:recordFields Saved'
    );
    return recordField;
  }

  async create(createRecordSpaceInput: CreateRecordSpaceInput, userId: string = this.GraphQlUserId()) {
    const { project, recordStructure, slug } = createRecordSpaceInput;
    await this.assertCreation(project, userId, slug)
    const createdRecordSpace = new this.recordSpaceModel({ ...createRecordSpaceInput, user: userId });
    await Promise.all([createdRecordSpace.save(), this.createFields(createdRecordSpace._id, recordStructure)]);
    this.logger.sLog(createRecordSpaceInput,
      'RecordSpaceService:create record space details Saved'
    );
    return createdRecordSpace;
  }

  async findForUser(query?: FilterQuery<RecordSpace>): Promise<RecordSpace[]> {
    this.logger.sLog({ query }, "RecordSpaceService:findForUser");
    return this.find({ ...query, user: this.GraphQlUserId() });
  }

  async find(query: FilterQuery<RecordSpace> = {}): Promise<RecordSpace[]> {
    this.logger.sLog(query, "RecordSpaceService:find");
    return this.recordSpaceModel.find(query);
  }

  async findOne(query?: FilterQuery<RecordSpace>, projection: ProjectionFields<RecordSpace> = null): Promise<RecordSpace> {
    this.logger.sLog(query, "RecordSpaceService:findOne");
    return this.recordSpaceModel.findOne(query, projection);
  }

  async getFields(query?: FilterQuery<RecordField>, projection: ProjectionFields<RecordField> = null): Promise<RecordField[]> {
    this.logger.sLog(query, "RecordSpaceService:getFields");
    return this.recordFieldModel.find({ recordSpace: query.recordSpace }, projection);
  }

  async update(query?: FilterQuery<RecordSpace>, update?: UpdateQuery<RecordSpace>): Promise<RecordSpace> {
    this.logger.sLog(query, "RecordSpaceService:update");
    return this.recordSpaceModel.findOneAndUpdate(query, update, { new: true });
  }

  async remove(query?: FilterQuery<RecordSpace>): Promise<void> {
    this.logger.sLog(query, "RecordSpaceService:remove");
    await this.recordSpaceModel.deleteOne(query);
  }
}
