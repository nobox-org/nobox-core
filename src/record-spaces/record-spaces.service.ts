import { Filter, OptionalId, UpdateOptions, FindOptions, UpdateFilter, ObjectId } from 'mongodb';
import { Inject, Injectable, Scope } from '@nestjs/common';
import { CONTEXT } from '@nestjs/graphql';
import { CustomLogger as Logger } from 'src/logger/logger.service';
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
import { Context, HydratedRecordSpace, PopulatedRecordSpace } from '@/types';
import { MProject, getRecordSpaceModel, getRecordFieldModel, MRecordField, MRecordSpace } from '@/schemas/slim-schemas';
import { RecordSpace } from './entities/record-space.entity';
import { perfTime } from '@/ep/decorators/perf-time';

@perfTime()
@Injectable({ scope: Scope.REQUEST })
export class RecordSpacesService {

  private recordSpaceModel: ReturnType<typeof getRecordSpaceModel>;
  private recordFieldsModel: ReturnType<typeof getRecordFieldModel>;


  constructor(
    private projectService: ProjectsService,
    private userService: UserService,
    @Inject(CONTEXT) private context: Context,
    private logger: Logger,
  ) {
    this.contextFactory = contextGetter(this.context.req, this.logger);
    this.recordSpaceModel = getRecordSpaceModel(this.logger);
    this.recordFieldsModel = getRecordFieldModel(this.logger);
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
        return this.recordFieldsModel.findOneAndUpdate(
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
            returnDocument: "after",
          },
        );
      }),
    );
  }

  /**
  * This create fields without the projectId and/or recordSpaceId as args
  * @param createFieldsInput
  * @returns
  */
  async createFieldsFromNonIdProps(
    createFieldsInput: CreateFieldsInput,
    user?: Partial<User>,
    recordSpace?: MRecordSpace,
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

    const updatedRecordSpace = await this.update({
      projectSlug,
      query: { slug: recordSpaceSlug },
      update: {
        recordFields: recordFieldsDetails.map(({ _id }) => _id),
        hydratedRecordFields: recordFieldsDetails,
        recordStructureHash: getRecordStructureHash(incomingRecordStructure, this.logger)
      },
      user,
    });

    return updatedRecordSpace;
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
      'RecordSpaceService::assertNewFieldCreation',
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
    this.logger.sLog({ args }, "RecordSpaceService::compareRecordStructureHash");
    const { existingRecordStructureHash, newRecordStructure } = args;
    const newRecordStructureHash = getRecordStructureHash(newRecordStructure, this.logger);

    const newRecordStructureIsDetected = existingRecordStructureHash !== newRecordStructureHash;
    this.logger.sLog({ newRecordStructure, existingRecordStructureHash, newRecordStructureHash }, newRecordStructureIsDetected ? "newRecordStructure detected" : "same old recordStructure");

    return {
      matched: existingRecordStructureHash === newRecordStructureHash
    }
  };

  async updateRecordSpaceStructureByHash(args: {
    recordSpace: MRecordSpace,
    recordStructure: RecordStructure[],
  }) {
    this.logger.sLog({ args }, "RecordSpaceService::updateRecordSpaceStructureByHash");

    const { recordSpace, recordStructure } = args;

    const { matched } = await this.compareRecordStructureHash({
      existingRecordStructureHash: recordSpace.recordStructureHash,
      newRecordStructure: recordStructure
    })

    const newRecordStructureIsDetected = !matched;

    if (newRecordStructureIsDetected) {
      const user = this.contextFactory.getValue(["user"]);
      const project = this.contextFactory.getValue(["trace", "project"]);

      const { slug: recordSpaceSlug } = recordSpace;
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
  ): Promise<MRecordField[]> {
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

  async createOrUpdateRecordSpace(args: {
    user: User;
    project: MProject;
    latestRecordSpaceInputDetails: CreateRecordSpaceInput;
  }): Promise<MRecordSpace> {
    this.logger.sLog({ args }, "RecordSpaceService::createOrUpdateRecordSpace");
    const { user, project: { _id: projectId }, latestRecordSpaceInputDetails } = args;

    const {
      slug: recordSpaceSlug,
      recordStructure,
      projectSlug,
    } = latestRecordSpaceInputDetails;

    const { _id: userId } = user;

    const recordSpace = await this.findOne({
      query: { slug: recordSpaceSlug },
      user,
      projectSlug,
      projectId
    });

    const recordSpaceExists = !!recordSpace;

    this.logger.sLog({ recordSpaceExists }, "RecordSpaceService::createOrUpdateRecordSpace")

    if (recordSpaceExists) {
      const updatedRecordSpace = await this.updateRecordSpaceStructureByHash({
        recordSpace: recordSpace,
        recordStructure
      })

      return updatedRecordSpace || recordSpace;
    }

    return this.create(
      latestRecordSpaceInputDetails,
      userId,
      projectId,
      true
    );

  };



  private async createField(
    recordSpaceId: string,
    field: RecordStructure,
  ): Promise<MRecordField> {

    const recordField = await this.recordFieldsModel.insert({
      recordSpace: recordSpaceId,
      ...field,
      required: false,
    });

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

    const id = new ObjectId();

    const recordFields = await this.createFields(
      id.toHexString(),
      recordStructure,
    );

    const createdRecordSpace = await this.recordSpaceModel.insert({
      _id: id.toHexString(),
      project: projectId,
      user: userId,
      slug,
      description,
      name,
      recordStructureHash: getRecordStructureHash(recordStructure, this.logger),
      recordFields: recordFields.map(field => new ObjectId(field._id)),
      admins: [],
      developerMode: false,
      hydratedRecordFields: recordFields
    });

    return createdRecordSpace;
  }

  async find(
    query: Filter<MRecordSpace> = {},
    projectSlug: string,
    user: string = this.GraphQlUserId(),
  ): Promise<MRecordSpace[]> {
    this.logger.sLog(query, 'RecordSpaceService:find');

    const project = await this.projectService.findOne({
      slug: projectSlug,
      user
    });

    if (!project) {
      throwGraphqlBadRequest('Project does not exist');
    }

    return this.recordSpaceModel.find({
      ...query,
      project: project._id,
    });
  }

  private async getProjectId({ projectSlug, userId }): Promise<string> {
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
    query?: Filter<MRecordSpace>;
    projection?: FindOptions["projection"];
    projectSlug?: string;
    user?: Partial<User>;
    projectId?: string;
  }): Promise<MRecordSpace> {
    this.logger.sLog(args, 'RecordSpaceService:findOne');
    const { query, projection = null, projectSlug, user, projectId: _projectId } = args;

    const userId = this.GraphQlUserId() || user?._id;

    const directIdIdentityIsNotSet = !query._id;

    if (directIdIdentityIsNotSet) {
      const projectId = !_projectId ? await this.getProjectId({ projectSlug, userId }) : _projectId;
      query.project = projectId;
    }

    return !projection ? this.recordSpaceModel.findOne(query) : this.recordSpaceModel.findOne(query, { projection });
  }

  async populateRecordSpace(recordSpace: MRecordSpace, fieldsToPopulate: "project" | "recordFields"): Promise<any> {
    this.logger.sLog({ recordSpace, fieldsToPopulate }, 'RecordSpaceService:populateRecordSpace');

    const { project: xProject, recordFields: xRecordFields, ...remainingFields } = recordSpace;
    const populatedRecordSpace: PopulatedRecordSpace = { ...remainingFields }
    const fieldsToPopulateArr = fieldsToPopulate.split(' ');
    for (let index = 0; index < fieldsToPopulateArr.length; index++) {
      const field = fieldsToPopulateArr[index];

      if (field === 'project') {
        const project = await this.projectService.findOne({ query: { _id: xProject } });
        populatedRecordSpace.project = project;
      }

      if (field === 'recordFields') {
        const recordFields = await Promise.all(
          xRecordFields.map(
            async (_id) => this.recordFieldsModel.findOne({ _id: new ObjectId(_id) }))
        );
        populatedRecordSpace.recordFields = recordFields;
      }
    }

    return populatedRecordSpace;
  }


  async getFields(
    recordFieldIds?: string[],
  ): Promise<MRecordField[]> {
    this.logger.sLog(recordFieldIds, 'RecordSpaceService:getFields');
    return this.recordFieldsModel.find({ _id: { $in: recordFieldIds } });
  }

  async getEndpoints(recordSpaceDetails?: RecordSpace): Promise<Endpoint[]> {
    this.logger.sLog(recordSpaceDetails, 'RecordSpaceService:getEndpoints');

    const { project, slug, fieldIds, developerMode } = recordSpaceDetails;

    if (!developerMode) {
      return [];
    }

    const [projectDetails, recordFieldsDetails] = await Promise.all([
      this.projectService.findOne({ _id: project }),
      this.recordFieldsModel.find({ _id: { $in: fieldIds } })
    ]);

    const { serverAddress } = config().serverConfig;

    const basePath = `${serverAddress}/${projectDetails.slug}/${slug}`;

    const exampleByParams = this.createExample({
      recordFields: recordFieldsDetails,
      type: 'params',
      basePath,
    });

    return [
      {
        path: `${basePath}`,
        method: HTTP_METHODS.GET,
        params: recordFieldsDetails,
        example: exampleByParams,
      },
      {
        path: `${basePath}/_single_`,
        method: HTTP_METHODS.GET,
        params: recordFieldsDetails,
        example: exampleByParams,
      },
      {
        path: `${basePath}`,
        method: HTTP_METHODS.POST,
        body: recordFieldsDetails,
        example: this.createExample({
          recordFields: recordFieldsDetails,
          type: 'bodyArray',
          basePath,
        }),
      },
      {
        path: `${basePath}/_single_`,
        method: HTTP_METHODS.POST,
        body: recordFieldsDetails,
        example: this.createExample({
          recordFields: recordFieldsDetails,
          type: 'body',
          basePath,
        }),
      },
      {
        path: `${basePath}/_single`,
        method: HTTP_METHODS.GET,
        body: recordFieldsDetails,
        example: exampleByParams,
      },
      {
        path: `${basePath}/update`,
        method: HTTP_METHODS.GET,
        body: recordFieldsDetails,
        example: exampleByParams,
      },
    ];
  }

  private createExample(args: {
    recordFields: MRecordField[];
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
    query?: Partial<MRecordSpace>;
    update?: UpdateFilter<MRecordSpace>;
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
      { returnDocument: "after" },
    );

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
        { returnDocument: "after" },
      );
      this.logger.sLog(
        query,
        'RecordSpaceService:update:all other record spaces updated',
      );
    }

    return response;
  }

  async addAdminToRecordSpace(
    id: string,
    userId: string,
    scope: ACTION_SCOPE = ACTION_SCOPE.JUST_THIS_RECORD_SPACE,
  ): Promise<MRecordSpace> {
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
    query?: Partial<MRecordSpace>;
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
