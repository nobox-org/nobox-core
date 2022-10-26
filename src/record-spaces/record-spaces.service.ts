import { Project, RecordField, RecordSpace } from '@/schemas';
import { Inject, Injectable, Scope } from '@nestjs/common';
import { CONTEXT } from '@nestjs/graphql';
import { CustomLogger as Logger } from 'src/logger/logger.service';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, ProjectionFields, UpdateQuery } from 'mongoose';
import { CreateRecordSpaceInput } from './dto/create-record-space.input';
import { ProjectsService } from '@/projects/projects.service';
import { RecordStructure } from './entities/record-structure.entity';
import { throwGraphqlBadRequest } from '@/utils/exceptions';
import { Endpoint } from './entities/endpoint.entity';
import { HTTP_METHODS } from './dto/https-methods.enum';
import { ACTION_SCOPE } from './dto/action-scope.enum';
import { UserService } from '@/user/user.service';
import { User } from '@/user/graphql/model';
import config from '@/config';


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

  private async assertCreation(args: { project: { _id?: string, slug?: string }, userId: string, slug: string }) {
    this.logger.sLog(args, "RecordSpacesService:assertCreation");
    const { userId, slug, project: { _id: projectId, slug: projectSlug } } = args;

    if (!userId || !projectSlug) {
      throwGraphqlBadRequest("User id and project slug is required");
    }


    const project = await this.projectService.findOne({ slug: projectSlug, user: userId });
    if (!project) {
      throwGraphqlBadRequest("Project does not exist");
    };

    const recordSpaceExists = await this.recordSpaceModel.findOne({ slug, project: projectId || project._id });

    if (recordSpaceExists) {
      throwGraphqlBadRequest("Record Space with this slug already exists");
    }

    return { project }
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
    const { projectSlug, recordStructure, slug, description, name } = createRecordSpaceInput;
    const { project } = await this.assertCreation({ project: { slug: projectSlug }, userId, slug });
    const createdRecordSpace = new this.recordSpaceModel({ project: project._id, user: userId, slug, description, name, recordStructure });
    await this.createFields(createdRecordSpace._id, recordStructure);
    await createdRecordSpace.save();
    this.logger.sLog(createRecordSpaceInput,
      'RecordSpaceService:create record space details Saved'
    );
    return createdRecordSpace;
  }

  async find(query: FilterQuery<RecordSpace> = {}, projectSlug: string): Promise<RecordSpace[]> {
    this.logger.sLog(query, "RecordSpaceService:find");

    const project = await this.projectService.findOne({ slug: projectSlug, user: this.GraphQlUserId() });
    if (!project) {
      throwGraphqlBadRequest("Project does not exist");
    };

    return this.recordSpaceModel.find({ ...query, project: project._id });
  }

  async findOne(args: { query?: FilterQuery<RecordSpace>, projection?: ProjectionFields<RecordSpace>, projectSlug?: string, user?: Partial<User> }): Promise<RecordSpace> {
    this.logger.sLog(args, "RecordSpaceService:findOne");
    const { query, projection = null, projectSlug, user } = args;

    const userId = this.GraphQlUserId() || user?._id;

    if (!query._id && (!projectSlug || !userId)) {
      throwGraphqlBadRequest("Project Slug and User Id is required when projectId is not provided");
    }

    if (!query._id) {

      const project = await this.projectService.findOne({ slug: projectSlug, user: userId });

      if (!project) {
        throwGraphqlBadRequest("Project does not exist");
      };

      query.project = project._id;
    }


    return this.recordSpaceModel.findOne(query, projection).populate("project");
  }

  async getFields(query?: FilterQuery<RecordField>, projection: ProjectionFields<RecordField> = null): Promise<RecordField[]> {
    this.logger.sLog(query, "RecordSpaceService:getFields");
    return this.recordFieldModel.find({ recordSpace: query.recordSpace }, projection);
  }

  async getEndpoints(query?: FilterQuery<RecordSpace>): Promise<Endpoint[]> {
    this.logger.sLog(query, "RecordSpaceService:getEndpoints");
    const { slug, developerMode, project, recordStructure } = await this.findOne({ query });

    if (!slug) {
      throwGraphqlBadRequest("RecordSpace does not exist");
    }

    if (!developerMode) {
      return [];
    };

    const { serverAddress } = config().serverConfig;
    const basePath = `${serverAddress}/${(project as Project).slug}/${slug}`;

    return [
      { path: `${basePath}`, method: HTTP_METHODS.GET, params: recordStructure, example: this.createExample({ recordStructure, type: "params", basePath }) },
      { path: `${basePath}/_single_`, method: HTTP_METHODS.GET, params: recordStructure, example: this.createExample({ recordStructure, type: "params", basePath }) },
      { path: `${basePath}`, method: HTTP_METHODS.POST, body: recordStructure, example: this.createExample({ recordStructure, type: "bodyArray", basePath }) },
      { path: `${basePath}/_single_`, method: HTTP_METHODS.POST, body: recordStructure, example: this.createExample({ recordStructure, type: "body", basePath }) },
      { path: `${basePath}/_single`, method: HTTP_METHODS.GET, params: recordStructure, example: this.createExample({ recordStructure, type: "params", basePath }) },
      { path: `${basePath}/update`, method: HTTP_METHODS.GET, params: recordStructure, example: this.createExample({ recordStructure, type: "params", basePath }) },
    ]
  }

  private createExample(args: { recordStructure: RecordStructure[], type: "body" | "params" | "bodyArray", basePath?: string }): string {
    this.logger.sLog(args, "RecordSpaceService:createExamples");

    const { recordStructure, type, basePath } = args;

    if (type === "bodyArray" || type === "body") {
      const example = {};
      const prettyPrint = (value: Record<any, any>) => JSON.stringify(value, null, 4);
      for (const { slug } of recordStructure) {
        example[slug] = "value"
      }
      return type === "bodyArray" ? `[${prettyPrint(example)}]` : prettyPrint(example);
    }

    if (type === "params") {
      const params = recordStructure.map(({ slug }) => `${slug}=value`).join("&");
      return `${basePath}?${params}`;
    }

  }

  async assertRecordSpaceMutation(args: { project: string, projectSlug: string }) {
    this.logger.sLog(args, "RecordSpacesService:assertRecordSpaceMutation");
    const { project, projectSlug } = args;

    const userId = this.GraphQlUserId();

    if (!project && (!projectSlug || userId)) {
      throwGraphqlBadRequest("Project Slug and User Id is required when projectId is not provided");

      const project = await this.projectService.findOne({ slug: projectSlug, user: userId });
      if (!project) {
        throwGraphqlBadRequest("Project does not exist");
      };

      return project._id;
    }

    return project;
  }

  async update(args: { query?: FilterQuery<RecordSpace>, update?: UpdateQuery<RecordSpace>, scope?: ACTION_SCOPE, projectSlug?: string }): Promise<RecordSpace> {
    this.logger.sLog(args, "RecordSpaceService:update:query");

    const { query, update, scope = ACTION_SCOPE.JUST_THIS_RECORD_SPACE, projectSlug } = args;

    if (!query._id) {
      const project = await this.assertRecordSpaceMutation({ project: query.project, projectSlug });
      query.project = project;
    }

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

    return this.update({ query: { _id: id }, update: { $addToSet: { "admins": userId } }, scope })
  }

  async remove(args: { query?: FilterQuery<RecordSpace>, projectSlug?: string }): Promise<boolean> {
    this.logger.sLog(args, "RecordSpaceService:remove");

    const { query, projectSlug } = args;

    const project = await this.assertRecordSpaceMutation({ project: query.project, projectSlug });

    const deleted = await this.recordSpaceModel.deleteOne({ ...query, project });

    if (deleted.deletedCount === 0) {
      throwGraphqlBadRequest("RecordSpace does not exist");
    }

    return deleted.deletedCount > 0;

  }
}
