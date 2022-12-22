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
import { CreateFieldsInput } from './dto/create-fields.input';
import { contextGetter, getRecordStructureHash } from '../utils';
import { Context, RecordSpaceWithRecordFields } from '@/types';

@Injectable({ scope: Scope.REQUEST })
export class RecordSpacesService {
  constructor(
    @InjectModel(RecordSpace.name)
    private recordSpaceModel: Model<RecordSpace>,
    @InjectModel(RecordField.name)
    private recordFieldModel: Model<RecordField>,
    private projectService: ProjectsService,
    private userService: UserService,
    @Inject(CONTEXT) private context: Context,
    private logger: Logger,
  ) {
    this.contextFactory = contextGetter(this.context.req, this.logger);
  }

  private contextFactory: ReturnType<typeof contextGetter>;


  private GraphQlUserId() {
    this.logger.sLog({}, "ProjectService:GraphQlUserId");
    const user = this.contextFactory.getValue(["user"], { silent: true });
    return user ? user?._id : "";
  }

  private async assertCreation(args: {
    project: { _id?: string; slug?: string };
    userId: string;
    slug: string;
  }) {
    this.logger.sLog(args, 'RecordSpacesService:assertCreation');
    const {
      userId,
      slug,
      project: { _id: projectId, slug: projectSlug },
    } = args;

    if (!userId || !projectSlug) {
      throwGraphqlBadRequest('User id and project slug is required');
    }

    const project = await this.projectService.findOne({
      slug: projectSlug,
      user: userId,
    });

    if (!project) {
      throwGraphqlBadRequest('Project does not exist');
    }

    const recordSpaceExists = await this.recordSpaceModel.findOne({
      slug,
      project: projectId || project._id,
    });

    if (recordSpaceExists) {
      throwGraphqlBadRequest('Record Space with this slug already exists');
    }

    return { project };
  }


  async recordSpaceExists({ slug, projectId }) {
    return this.recordSpaceModel.findOne({
      slug,
      project: projectId
    });
  }

  async mergeNewAndExistingFields({
    incomingRecordStructure,
    recordSpaceId,
  }: {
    incomingRecordStructure: CreateFieldsInput['recordStructure'];
    recordSpaceId: string;
  }) {
    return Promise.all(
      incomingRecordStructure.map(async incomingFieldDetails => {
        const { slug: incomingSlug } = incomingFieldDetails;
        return this.recordFieldModel.findOneAndUpdate(
          {
            recordSpace: recordSpaceId,
            slug: incomingSlug,
          },
          {
            ...incomingFieldDetails,
            recordSpace: recordSpaceId,
            slug: incomingSlug,
          },
          {
            upsert: true,
            new: true,
          },
        );
      }),
    );
  }

  /**
  * This create fields without the projectId and/or recordSpaceId as args
  // trunk-ignore(git-diff-check/error)
  // trunk-ignore(git-diff-check/error)
  * @param createFieldsInput
  * @returns
  */
  async createFieldsFromNonIdProps(
    createFieldsInput: CreateFieldsInput,
    user?: Partial<User>,
    recordSpace?: RecordSpace,
  ) {
    this.logger.sLog(
      { createFieldsInput, user, recordSpace },
      'createFieldsFromNonIdProps',
    );
    const {
      projectSlug,
      recordSpaceSlug,
      recordStructure: incomingRecordStructure,
    } = createFieldsInput;

    let recordSpaceDetails = recordSpace;

    if (!recordSpaceDetails) {
      recordSpaceDetails = await this.findOne({
        query: { slug: recordSpaceSlug },
        projectSlug,
        user,
      });

      if (!recordSpaceDetails) {
        throwGraphqlBadRequest(
          `RecordSpace: ${recordSpaceSlug} does not exist for project: ${projectSlug}`,
        );
      }
    }

    const { _id: recordSpaceId } = recordSpaceDetails;

    const recordFieldsDetails = await this.mergeNewAndExistingFields({
      incomingRecordStructure,
      recordSpaceId,
    });

    return this.update({
      projectSlug,
      query: { slug: recordSpaceSlug },
      update: {
        recordFields: recordFieldsDetails.map(({ _id }) =>
          _id.toHexString(),
        ),
        recordStructureHash: getRecordStructureHash(incomingRecordStructure, this.logger)
      },
      user,
    });
  }

  async assertNewFieldCreation({
    projectSlug,
    recordSpaceSlug,
    recordStructure,
  }: CreateFieldsInput) {
    this.logger.sLog(
      { projectSlug, recordSpaceSlug, recordStructure },
      'RecordSpaceService:assertNewFieldCreation',
    );
    for (let index = 0; index < recordStructure.length; index++) {
      const { slug } = recordStructure[index];
      const recordSpace = await this.findOne({
        query: {
          slug: recordSpaceSlug,
          'recordStructure.slug': slug,
        },
        projectSlug,
      });
      if (recordSpace) {
        throwGraphqlBadRequest(
          `Field with 'slug: ${slug}, recordSpace: ${recordSpaceSlug}, project: ${projectSlug}'  already exists`,
        );
      }
    }
  }

  async reStructure({
    projectSlug,
    recordSpaceSlug,
    recordStructure,
  }: CreateFieldsInput) {
    this.logger.sLog(
      { projectSlug, recordSpaceSlug, recordStructure },
      'RecordSpaceService:assertNewFieldCreation',
    );
    for (let index = 0; index < recordStructure.length; index++) {
      const { slug } = recordStructure[index];
      const recordSpace = await this.findOne({
        query: {
          slug: recordSpaceSlug,
          'recordStructure.slug': slug,
        },
        projectSlug,
      });
      if (recordSpace) {
        throwGraphqlBadRequest(
          `Field with 'slug: ${slug}, recordSpace: ${recordSpaceSlug}, project: ${projectSlug}'  already exists`,
        );
      }
    }
  }

  async compareRecordStructureHash(args: { existingRecordStructureHash: string, newRecordStructure: RecordStructure[] }) {
    const { existingRecordStructureHash, newRecordStructure } = args;
    const newRecordStructureHash = getRecordStructureHash(newRecordStructure, this.logger);

    const newRecordStructureIsDetected = existingRecordStructureHash !== newRecordStructureHash;
    this.logger.sLog({ newRecordStructure, existingRecordStructureHash, newRecordStructureHash }, newRecordStructureIsDetected ? "newRecordStructure detected" : "same old recordStructure");

    return {
      matched: existingRecordStructureHash === newRecordStructureHash
    }
  };

  async updateRecordSpaceStructureByHash(args: {
    recordSpace: RecordSpaceWithRecordFields,
    recordStructure: RecordStructure[],
  }) {

    const { recordSpace, recordStructure } = args;

    const { matched } = await this.compareRecordStructureHash({
      existingRecordStructureHash: recordSpace.recordStructureHash,
      newRecordStructure: recordStructure
    })

    const newRecordStructureIsDetected = !matched;

    if (newRecordStructureIsDetected) {
      const user = this.contextFactory.getValue(["user"]);
      const project = this.contextFactory.getValue(["trace", "project"]);

      const { slug: recordSpaceSlug, } = recordSpace;
      return this.createFieldsFromNonIdProps(
        {
          recordSpaceSlug,
          recordStructure,
          projectSlug: project.slug,
        },
        user,
        recordSpace,
      );
    }

    return null;
  }


  private async createFields(
    recordSpaceId: string,
    recordStructure: RecordStructure[],
  ): Promise<RecordField[]> {
    this.logger.sLog(recordStructure, 'RecordSpaceService:createFields');
    const slugList = recordStructure.map(field => field.slug);
    const trimmedSlugList = [...new Set(slugList)];
    if (slugList.length !== trimmedSlugList.length) {
      throwGraphqlBadRequest(
        'Duplicate Form Field slugs found, Use Unique Slugs',
      );
    }
    return Promise.all(
      recordStructure.map(recordStructure =>
        this.createField(recordSpaceId, recordStructure),
      ),
    );
  }

  private async updateField(
    recordSpaceId: string,
    fieldSlug: string,
    field: RecordStructure,
  ): Promise<RecordField> {
    this.logger.sLog(
      { recordSpaceId, fieldSlug, field },
      'RecordSpaceService:updateField',
    );
    return this.recordFieldModel.findOneAndUpdate(
      { recordSpace: recordSpaceId, slug: fieldSlug },
      field,
    );
  }

  private async findFields(
    recordSpaceId: string,
    fieldSlug: string,
  ): Promise<RecordField[]> {
    this.logger.sLog(
      { recordSpaceId, fieldSlug },
      'RecordSpaceService:findFields',
    );
    return this.recordFieldModel.find({
      recordSpace: recordSpaceId,
      slug: fieldSlug,
    });
  }

  private async createField(
    recordSpaceId: string,
    field: RecordStructure,
  ): Promise<RecordField> {
    const recordField = new this.recordFieldModel({
      recordSpace: recordSpaceId,
      ...field,
    });
    recordField.save();
    this.logger.sLog(
      { recordSpaceId, recordField },
      'RecordSpaceService:createField:recordFields Saved',
    );
    return recordField;
  }

  async create(
    createRecordSpaceInput: CreateRecordSpaceInput,
    userId: string = this.GraphQlUserId(),
    _projectId?: string,
    fullyAsserted = false
  ) {

    this.logger.sLog({ createRecordSpaceInput, userId }, "RecordSpaceService:create");

    const {
      projectSlug,
      recordStructure,
      slug,
      description,
      name,
    } = createRecordSpaceInput;

    if (fullyAsserted && !_projectId) {
      this.logger.debug("ProjectId should be set if fully asserted", "RecordSpaceService: create");
      throwGraphqlBadRequest("Something Unusual Happened");
    }

    let projectId = _projectId;

    if (!fullyAsserted) {
      const { project } = await this.assertCreation({
        project: { slug: projectSlug },
        userId,
        slug,
      });

      projectId = project._id;
    }

    const createdRecordSpace = new this.recordSpaceModel({
      project: projectId,
      user: userId,
      slug,
      description,
      name,
      recordStructureHash: getRecordStructureHash(recordStructure, this.logger)
    });

    const recordFields = await this.createFields(
      createdRecordSpace._id,
      recordStructure,
    );

    createdRecordSpace.recordFields = recordFields.map(({ _id }) => _id);
    const savedRecordSpace = await (await createdRecordSpace.save()).populate("recordFields");

    this.logger.sLog(
      createRecordSpaceInput,
      'RecordSpaceService:create record space details Saved',
    );
    return savedRecordSpace as RecordSpaceWithRecordFields;
  }

  async find(
    query: FilterQuery<RecordSpace> = {},
    projectSlug: string,
    user: string = this.GraphQlUserId(),
  ): Promise<RecordSpace[]> {
    this.logger.sLog(query, 'RecordSpaceService:find');

    const project = await this.projectService.findOne({
      slug: projectSlug,
      user: this.GraphQlUserId(),
    });
    if (!project) {
      throwGraphqlBadRequest('Project does not exist');
    }

    return this.recordSpaceModel.find({
      ...query,
      project: project._id,
    });
  }

  private async getProjectId({ projectSlug, userId }): Promise<FilterQuery<RecordSpace>> {
    this.logger.sLog({ projectSlug, userId }), "RecordSpaceService:getProjectId"
    if (!projectSlug || !userId) {
      throwGraphqlBadRequest(
        'Project Slug and User Id is required when projectId is not provided',
      );
    }

    const project = await this.projectService.findOne({
      slug: projectSlug,
      user: userId,
    });

    if (!project) {
      throwGraphqlBadRequest('Project does not exist');
    }

    return project._id;
  }

  async findOne(args: {
    query?: FilterQuery<RecordSpace>;
    projection?: ProjectionFields<RecordSpace>;
    projectSlug?: string;
    user?: Partial<User>;
    populate?: string;
    projectId?: string;
  }): Promise<RecordSpace> {
    this.logger.sLog(args, 'RecordSpaceService:findOne');
    const { query, projection = null, projectSlug, user, populate, projectId: _projectId } = args;

    const userId = this.GraphQlUserId() || user?._id;

    const directIdIdentityIsNotSet = !query._id;

    if (directIdIdentityIsNotSet) {
      const projectId = !_projectId ? await this.getProjectId({ projectSlug, userId }) : _projectId;
      query.project = projectId;
    }

    const fieldsToPopulate = populate ? 'project ' + populate : 'project';

    return this.recordSpaceModel
      .findOne(query, projection)
      .populate(fieldsToPopulate)
      .lean();
  }

  async getFields(
    query?: FilterQuery<RecordField>,
  ): Promise<RecordField[]> {
    this.logger.sLog(query, 'RecordSpaceService:getFields');
    const { recordFields: populatedRecordFields } = await this.findOne({
      query: { _id: query.recordSpace },
      projection: { recordStructure: 1 },
      populate: 'recordFields',
    });

    return populatedRecordFields as RecordField[];
  }

  async getEndpoints(query?: FilterQuery<RecordSpace>): Promise<Endpoint[]> {
    this.logger.sLog(query, 'RecordSpaceService:getEndpoints');
    const { slug, developerMode, project, recordFields } = await this.findOne(
      {
        query,
        populate: 'recordFields',
      },
    );

    if (!slug) {
      throwGraphqlBadRequest('RecordSpace does not exist');
    }

    if (!developerMode) {
      return [];
    }

    const { serverAddress } = config().serverConfig;
    const basePath = `${serverAddress}/${(project as Project).slug}/${slug}`;

    const populatedRecordFields = recordFields as RecordField[];

    const exampleByParams = this.createExample({
      recordFields: populatedRecordFields,
      type: 'params',
      basePath,
    });

    return [
      {
        path: `${basePath}`,
        method: HTTP_METHODS.GET,
        params: populatedRecordFields,
        example: exampleByParams,
      },
      {
        path: `${basePath}/_single_`,
        method: HTTP_METHODS.GET,
        params: populatedRecordFields,
        example: exampleByParams,
      },
      {
        path: `${basePath}`,
        method: HTTP_METHODS.POST,
        body: populatedRecordFields,
        example: this.createExample({
          recordFields: populatedRecordFields,
          type: 'bodyArray',
          basePath,
        }),
      },
      {
        path: `${basePath}/_single_`,
        method: HTTP_METHODS.POST,
        body: populatedRecordFields,
        example: this.createExample({
          recordFields: populatedRecordFields,
          type: 'body',
          basePath,
        }),
      },
      {
        path: `${basePath}/_single`,
        method: HTTP_METHODS.GET,
        body: populatedRecordFields,
        example: exampleByParams,
      },
      {
        path: `${basePath}/update`,
        method: HTTP_METHODS.GET,
        body: populatedRecordFields,
        example: exampleByParams,
      },
    ];
  }

  private createExample(args: {
    recordFields: RecordField[];
    type: 'body' | 'params' | 'bodyArray';
    basePath?: string;
  }): string {
    this.logger.sLog(args, 'RecordSpaceService:createExamples');

    const { recordFields, type, basePath } = args;

    if (type === 'bodyArray' || type === 'body') {
      const example = {};
      const prettyPrint = (value: Record<any, any>) =>
        JSON.stringify(value, null, 4);
      for (const { slug } of recordFields) {
        example[slug] = 'value';
      }
      return type === 'bodyArray'
        ? `[${prettyPrint(example)}]`
        : prettyPrint(example);
    }

    if (type === 'params') {
      const params = recordFields
        .map(({ slug }) => `${slug}=value`)
        .join('&');
      return `${basePath}?${params}`;
    }
  }

  async assertRecordSpaceMutation(args: {
    projectId: string;
    projectSlug: string;
    userId?: string;
  }) {
    this.logger.sLog(args, 'RecordSpacesService:assertRecordSpaceMutation');
    const { projectId, projectSlug, userId } = args;

    const _userId = userId ?? this.GraphQlUserId();

    if (!projectId && !projectSlug && !_userId) {
      throwGraphqlBadRequest(
        'Project Slug and User Id is required when projectId is not provided',
      );
    }

    const project = await this.projectService.findOne({
      slug: projectSlug,
      user: _userId,
    });
    if (!project) {
      throwGraphqlBadRequest('Project does not exist');
    }

    return project._id;
  }

  async update(args: {
    query?: FilterQuery<RecordSpace>;
    update?: UpdateQuery<RecordSpace>;
    scope?: ACTION_SCOPE;
    projectSlug?: string;
    user?: Partial<User>;
  }) {
    this.logger.sLog(args, 'RecordSpaceService:update:query');

    const {
      query,
      update,
      scope = ACTION_SCOPE.JUST_THIS_RECORD_SPACE,
      projectSlug,
      user,
    } = args;

    const userId = user?._id ?? this.GraphQlUserId();

    if (!query._id) {
      const project = await this.assertRecordSpaceMutation({
        projectId: query.project,
        projectSlug,
        userId,
      });
      query.project = project;
    }

    const response = await this.recordSpaceModel.findOneAndUpdate(
      query,
      update,
      { new: true },
    ).populate("recordFields").lean();

    this.logger.sLog(response, 'RecordSpaceService:update:response');
    if (!response) {
      throwGraphqlBadRequest('RecordSpace does not exist');
    }

    if (scope === ACTION_SCOPE.ALL_OTHER_RECORD_SPACES) {
      await this.recordSpaceModel.findOneAndUpdate(
        {
          project: response.project,
          _id: { $ne: response._id },
        },
        update,
        { new: true },
      );
      this.logger.sLog(
        query,
        'RecordSpaceService:update:all other record spaces updated',
      );
    }

    return response as RecordSpaceWithRecordFields;
  }

  async addAdminToRecordSpace(
    id: string,
    userId: string,
    scope: ACTION_SCOPE = ACTION_SCOPE.JUST_THIS_RECORD_SPACE,
  ): Promise<RecordSpace> {
    this.logger.sLog(
      { id, userId, scope },
      'RecordSpaceService:addAdminToRecordSpace:query',
    );
    const { bool: userExist } = await this.userService.exists({
      id: userId,
    });
    if (!userExist) {
      throwGraphqlBadRequest('Admin User does not exist');
    }

    return this.update({
      query: { _id: id },
      update: { $addToSet: { admins: userId } },
      scope,
    });
  }

  async remove(args: {
    query?: FilterQuery<RecordSpace>;
    projectSlug?: string;
  }): Promise<boolean> {
    this.logger.sLog(args, 'RecordSpaceService:remove');

    const { query, projectSlug } = args;

    const project = await this.assertRecordSpaceMutation({
      projectId: query.project,
      projectSlug,
    });

    const deleted = await this.recordSpaceModel.deleteOne({
      ...query,
      project,
    });

    if (deleted.deletedCount === 0) {
      throwGraphqlBadRequest('RecordSpace does not exist');
    }

    return deleted.deletedCount > 0;
  }
}
