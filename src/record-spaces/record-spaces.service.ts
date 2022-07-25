import { RecordField, RecordSpace } from '@/schemas';
import { Inject, Injectable, Scope } from '@nestjs/common';
import { CONTEXT } from '@nestjs/graphql';
import { CustomLogger as Logger } from 'src/logger/logger.service';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { FilterQuery, Model, ProjectionFields, UpdateQuery } from 'mongoose';
import { CreateRecordSpaceInput } from './dto/create-record-space.input';
import { ProjectsService } from '@/projects/projects.service';
import { RecordStructure } from './entities/record-structure.entity';
import { throwGraphqlBadRequest } from '@/utils/exceptions';
import { Endpoint } from './entities/endpoint.entity';
import { HTTP_METHODS } from './dto/https-methods.enum';
import { ACTION_SCOPE } from './dto/action-scope.enum';
import { UserService } from '@/user/user.service';

@Injectable({ scope: Scope.REQUEST })
export class RecordSpacesService {

  constructor(
    @InjectModel(RecordSpace.name) private recordSpaceModel: Model<RecordSpace>,
    @InjectModel(RecordField.name) private recordFieldModel: Model<RecordField>,
    private projectService: ProjectsService,
    private userService: UserService,
    @Inject(CONTEXT) private context,
    private logger: Logger
  ) {
  }

  private GraphQlUserId() {
    const { req } = this.context;
    return req?.user ? req.user._id : "";
  }

  private async assertCreation(projectId: string, userId: string, slug: string) {
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      throwGraphqlBadRequest("Invalid Project Id");
    }
    const projectExists = await this.projectService.findOne({ _id: projectId, user: userId });
    if (!projectExists) {
      throwGraphqlBadRequest("Project does not exist");
    };

    const recordSpaceExists = await this.recordSpaceModel.findOne({ slug });
    if (recordSpaceExists) {
      throwGraphqlBadRequest("Record Space with this slug already exists");
    }
  }

  private async createFields(recordSpaceId: string, recordStructure: RecordStructure[]): Promise<void> {
    this.logger.sLog(recordStructure, "RecordSpaceService:createFields");
    const slugList = recordStructure.map(field => field.slug);
    const trimmedSlugList = [...new Set(slugList)];
    if (slugList.length !== trimmedSlugList.length) {
      throwGraphqlBadRequest("Duplicate Form Field slugs found, Use Unique Slugs");
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

  async getEndpoints(query?: FilterQuery<RecordField>): Promise<Endpoint[]> {
    this.logger.sLog(query, "RecordSpaceService:getEndpoints");
    const { slug, developerMode } = await this.findOne(query);

    if (!slug) {
      throwGraphqlBadRequest("RecordSpace does not exist");
    }

    if (!developerMode) {
      return [];
    };

    return [
      { path: `/${slug}`, method: HTTP_METHODS.GET },
      { path: `/${slug}/_single_`, method: HTTP_METHODS.GET },
      { path: `/${slug}`, method: HTTP_METHODS.POST },
      { path: `/${slug}/_single_`, method: HTTP_METHODS.POST },
      { path: `/${slug}/_single`, method: HTTP_METHODS.GET },
      { path: `/${slug}/update`, method: HTTP_METHODS.GET },
    ]
  }

  async update(query?: FilterQuery<RecordSpace>, update?: UpdateQuery<RecordSpace>, scope: ACTION_SCOPE = ACTION_SCOPE.JUST_THIS_RECORD_SPACE): Promise<RecordSpace> {
    this.logger.sLog(query, "RecordSpaceService:update:query");
    const response = await this.recordSpaceModel.findOneAndUpdate(query, update, { new: true });
    this.logger.sLog(response, "RecordSpaceService:update:response");
    if (!response) {
      throwGraphqlBadRequest("RecordSpace does not exist");
    }

    if (scope === ACTION_SCOPE.ALL_OTHER_RECORD_SPACES) {
      await this.recordSpaceModel.findOneAndUpdate({ project: response.project, _id: { $ne: response._id } }, update, { new: true });
      this.logger.sLog(query, "RecordSpaceService:update:all other record spaces updated");
    }

    return response;
  }


  async addAdminToRecordSpace(id: string, userId: string, scope: ACTION_SCOPE = ACTION_SCOPE.JUST_THIS_RECORD_SPACE): Promise<RecordSpace> {
    this.logger.sLog({ id, userId, scope }, "RecordSpaceService:addAdminToRecordSpace:query");
    const { bool: userExist } = await this.userService.exists({ id: userId });
    if (!userExist) {
      throwGraphqlBadRequest("Admin User does not exist");
    }

    return this.update({ _id: id }, { $addToSet: { "admins": userId } }, scope)
  }

  async remove(query?: FilterQuery<RecordSpace>): Promise<void> {
    this.logger.sLog(query, "RecordSpaceService:remove");
    await this.recordSpaceModel.deleteOne(query);
  }
}
