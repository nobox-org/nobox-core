import { Filter, FindOptions, UpdateFilter, ObjectId, IndexSpecification } from 'mongodb';
import { Inject, Injectable, Scope } from '@nestjs/common';
import { CONTEXT } from '@nestjs/graphql';
import { CustomLogger as Logger } from '@/logger/logger.service';
import { CreateRecordSpaceInput } from './dto/create-record-space.input';
import { ProjectsService } from '@/projects/projects.service';
import { RecordStructure } from './entities/record-structure.entity';
import { throwBadRequest, throwGraphqlBadRequest } from '@/utils/exceptions';
import { Endpoint } from './entities/endpoint.entity';
import { HTTP_METHODS } from './dto/https-methods.enum';
import { ACTION_SCOPE } from './dto/action-scope.enum';
import { UserService } from '@/user/user.service';
import config from '@/config';
import { CreateFieldsInput } from './dto/create-fields.input';
import { contextGetter, getRecordStructureHash } from '../utils';
import { Context, HydratedRecordSpace, PopulatedRecordSpace } from '@/types';
import { MProject, getRecordSpaceModel, getRecordFieldModel, MRecordField, MRecordSpace, getRecordDumpModel } from '@/schemas/slim-schemas';
import { RecordSpace } from './entities/record-space.entity';

@Injectable({ scope: Scope.REQUEST })
export class RecordSpacesService {

  private recordSpaceModel: ReturnType<typeof getRecordSpaceModel>;
  private recordFieldsModel: ReturnType<typeof getRecordFieldModel>;
  private recordDumpModel: ReturnType<typeof getRecordDumpModel>;


  constructor(
    private projectService: ProjectsService,
    private userService: UserService,
    @Inject(CONTEXT) private context: Context,
    private logger: Logger,
  ) {
    this.contextFactory = contextGetter(this.context.req, this.logger);
    this.recordSpaceModel = getRecordSpaceModel(this.logger);
    this.recordFieldsModel = getRecordFieldModel(this.logger);
    this.recordDumpModel = getRecordDumpModel(this.logger);
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
      projectSlug
    });

    if (recordSpaceExists) {
      throwGraphqlBadRequest('Record Space with this slug already exists');
    }

    return { project };
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
            $set: {
              ...incomingFieldDetails,
              recordSpace: recordSpaceId,
              slug: incomingSlug,
            }
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
    userId?: String,
    recordSpace?: MRecordSpace,
  ) {
    this.logger.sLog(
      { createFieldsInput, userId, recordSpace },
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
        query: { slug: recordSpaceSlug, projectSlug, user: userId },
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
      recordSpaceId: String(recordSpaceId),
    });

    const hasHashedFields = (recordFieldsDetails || []).some(field => field.hashed);


    const updatedRecordSpace = await this.update({
      projectSlug,
      query: { slug: recordSpaceSlug, _id: recordSpace._id },
      update: {
        $set: {
          recordFields: recordFieldsDetails.map(({ _id }) => _id),
          hydratedRecordFields: recordFieldsDetails,
          recordStructureHash: getRecordStructureHash(incomingRecordStructure, this.logger),
          hasHashedFields,
        }
      },
      userId,
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
          projectSlug
        },
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
          projectSlug
        }
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

  async create(args: {
    createRecordSpaceInput: CreateRecordSpaceInput;
    userId?: string;
    project?: MProject;
    fullyAsserted?: boolean;
    activateDeveloperMode?: boolean;
  }) {

    const { createRecordSpaceInput, userId = this.GraphQlUserId(), project, fullyAsserted = false, activateDeveloperMode = false } = args;
    this.logger.sLog({ createRecordSpaceInput, userId }, "RecordSpaceService:create");

    const {
      projectSlug,
      recordStructure,
      slug,
      description,
      name,
    } = createRecordSpaceInput;

    if (fullyAsserted && !project) {
      this.logger.debug("Project Details should be set if fully asserted", "RecordSpaceService: create");
      throwGraphqlBadRequest("Something Unusual Happened");
    }

    let _project = project;

    if (!fullyAsserted) {
      const { project: projectReturnedFromAssertion } = await this.assertCreation({
        project: { slug: projectSlug },
        userId,
        slug,
      });

      _project = projectReturnedFromAssertion;
    }

    const id = new ObjectId();

    const recordFields = await this.createFields(
      id.toHexString(),
      recordStructure,
    );

    const hasHashedFields = (recordFields || []).some(field => field.hashed);

    const createdRecordSpace = await this.recordSpaceModel.insert({
      _id: id,
      project: String(project._id),
      user: userId,
      slug,
      description,
      name,
      recordStructureHash: getRecordStructureHash(recordStructure, this.logger),
      recordFields: recordFields.map(field => new ObjectId(field._id)),
      admins: [],
      hydratedRecordFields: recordFields,
      hydratedProject: project,
      projectSlug,
      hasHashedFields,
      developerMode: activateDeveloperMode,
    });

    return createdRecordSpace;
  }

  async find(
    query: Filter<MRecordSpace> = {},
  ): Promise<MRecordSpace[]> {
    this.logger.sLog(query, 'RecordSpaceService:find');


    if (!query.user) {
      query.user = this.GraphQlUserId();
    }

    if (!query.user) {
      this.logger.sLog(query, 'RecordSpaceService:find:User is required');
      throwGraphqlBadRequest('Something Unusual Happened');
    }

    const project = await this.projectService.findOne({
      slug: query.projectSlug,
      user: query.user
    });

    if (!project) {
      throwGraphqlBadRequest('Project does not exist');
    }

    return this.recordSpaceModel.find({
      ...query,
      project: String(project._id),
    });
  }

  async findOne(args: {
    query?: Filter<MRecordSpace>;
    projection?: FindOptions["projection"];
  }): Promise<MRecordSpace> {
    this.logger.sLog(args, 'RecordSpaceService:findOne');
    const { query, projection = null } = args;
    return this.recordSpaceModel.findOne(query, { projection });
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
    }

    return populatedRecordSpace;
  }


  async getFields(
    recordFieldIds?: string[],
  ): Promise<MRecordField[]> {
    this.logger.sLog(recordFieldIds, 'RecordSpaceService:getFields');
    return this.recordFieldsModel.find({ _id: { $in: recordFieldIds.map(id => new ObjectId(id)) } });
  }

  async getEndpoints(recordSpaceDetails?: RecordSpace): Promise<Endpoint[]> {
    this.logger.sLog(recordSpaceDetails, 'RecordSpaceService:getEndpoints');

    const { project, slug, fieldIds, developerMode } = recordSpaceDetails;

    if (!developerMode) {
      return [];
    }

    const [projectDetails, recordFieldsDetails] = await Promise.all([
      this.projectService.findOne({ _id: new ObjectId(project) }),
      this.recordFieldsModel.find({ _id: { $in: fieldIds.map(id => new ObjectId(id)) } })
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
    userId?: String;
    createTextIndex?: boolean;
    existingRecordSpace?: HydratedRecordSpace;
  }) {
    this.logger.sLog(args, 'RecordSpaceService::update::update');

    const {
      query,
      update,
      scope = ACTION_SCOPE.JUST_THIS_RECORD_SPACE,
      projectSlug,
      userId = this.GraphQlUserId(),
      createTextIndex = false,
      existingRecordSpace = null,
    } = args;

    if (createTextIndex && !existingRecordSpace) {
      this.logger.sLog({}, 'RecordSpaceService::update::update:: Existing record space is required to create text index');
      throwGraphqlBadRequest('An Unknown error occurred');
    }

    if (!query._id) {
      if (!projectSlug && query.project) {
        this.logger.sLog({}, "RecordSpaceService::update::update:: ProjectSlug and projectId is required when recordSpace id is provided");
        throwGraphqlBadRequest("An Unknown error occurred");
      }

      const project = await this.assertRecordSpaceMutation({
        projectId: query.project,
        projectSlug,
        userId,
      });
      query.project = String(project);
    }

    const response = await this.recordSpaceModel.findOneAndUpdate(
      query,
      update,
      { returnDocument: "after" },
    );

    if (createTextIndex) {
      const { searchableFields = [] } = response;
      const indexSpecification: IndexSpecification = {};
      const fieldsToIndex = searchableFields.length ? searchableFields : existingRecordSpace.hydratedRecordFields.map(field => field.name);

      for (const field of fieldsToIndex) {
        indexSpecification[field] = 'text';
      }

      this.logger.sLog(indexSpecification, 'RecordSpaceService::update:indexSpecification');
      await this.recordDumpModel.dropIndexes();
      await this.recordDumpModel.createIndex(indexSpecification, {
        partialFilterExpression: {
          'record.recordSpace': String(response._id)
        }
      });
    }

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
      query: { _id: new ObjectId(id) },
      update: { $addToSet: { admins: userId } },
      scope,
      userId: this.GraphQlUserId()
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
      projectSlug,
      project: String(project)
    });

    if (deleted.deletedCount === 0) {
      throwGraphqlBadRequest('RecordSpace does not exist');
    }

    return deleted.deletedCount > 0;
  }

  async handleRecordSpaceCheckInPreOperation(args: {
    recordSpaceSlug: string,
    recordStructure: RecordStructure[],
    projectSlug: string,
    userId: string,
    autoCreateRecordSpace: boolean;
    autoCreateProject: boolean;
    latestRecordSpaceInputDetails: Omit<CreateRecordSpaceInput, "authOptions">,
    allowMutation: boolean;
  }) {
    this.logger.sLog(args, 'RecordSpaceService::handleRecordSpaceCheck');

    const { recordSpaceSlug, recordStructure, projectSlug, userId, autoCreateRecordSpace, autoCreateProject, latestRecordSpaceInputDetails, allowMutation } = args;

    let recordSpace = await this.findOne({
      query: { slug: recordSpaceSlug, projectSlug, user: userId },
    });

    let project: MProject;

    if (recordSpace) {

      const { matched } = await this.compareRecordStructureHash({
        existingRecordStructureHash: recordSpace.recordStructureHash,
        newRecordStructure: recordStructure
      });

      if (!allowMutation && !matched) {
        this.logger.sLog({ allowMutation }, "EpService::handleRecordSpaceCheckInPreOperation:: mutation is not allowed");
        throw new Error("Mutation is not allowed, add {mutate: true} to your query to nobox config");
      }

      if (!matched) {
        const { slug: recordSpaceSlug } = recordSpace;
        const updatedRecordSpace = await this.createFieldsFromNonIdProps(
          {
            recordSpaceSlug,
            recordStructure,
            projectSlug,
          },
          userId,
          recordSpace,
        );
        recordSpace = updatedRecordSpace;
      }
      project = recordSpace.hydratedProject;
    }


    if (!recordSpace) {
      this.logger.sLog({ recordSpace }, "EpService::_prepareOperationResources:: recordSpace or project does not exist");

      project = await this.projectService.assertProjectExistence({ projectSlug, userId }, { autoCreate: autoCreateProject });

      if (!autoCreateRecordSpace) {
        this.logger.sLog({ autoCreateRecordSpace: autoCreateRecordSpace }, "EpService::autoCreateRecordSpace:: auto creating recordSpace not allowed");
        throwBadRequest(`RecordSpace: "slug: ${recordSpaceSlug}" does not exist`);
        return;
      }

      recordSpace = await this.create({
        createRecordSpaceInput: latestRecordSpaceInputDetails,
        userId,
        project,
        fullyAsserted: true,
        activateDeveloperMode: true,
      });
    }

    return {
      project,
      recordSpace
    };
  }
}
