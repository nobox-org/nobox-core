import {
   Filter,
   FindOptions,
   UpdateFilter,
   ObjectId,
} from '@nobox-org/shared-lib';
import { Inject, Injectable, Scope } from '@nestjs/common';

import { CustomLogger as Logger } from '@/modules/logger/logger.service';
import { CreateRecordSpaceInput } from './dto/create-record-space.input';
import { ProjectsService } from '@/modules/projects/projects.service';
import { throwBadRequest } from '@/utils/exceptions';
import { HTTP_METHODS } from './dto/https-methods.enum';
import { ACTION_SCOPE } from './dto/action-scope.enum';
import { UserService } from '@/modules/user/user.service';
import config from '@/config';
import { CreateFieldsInput } from './dto/create-fields.input';
import {
   contextGetter,
   getRecordSpaceTrackedFieldsHash,
   measureTimeTaken,
} from '../../utils';
import { Context, PopulatedRecordSpace, RecordSpaceType } from '@/types';
import {
   MProject,
   getRecordSpaceModel,
   getRecordFieldModel,
   MRecordField,
   MRecordSpace,
} from '@nobox-org/shared-lib';
import {
   Endpoint,
   GenerateEndpointInput,
   RecordFieldStructure,
   TrackedRecordSpaceFields,
} from './types';

@Injectable({ scope: Scope.REQUEST })
export class RecordSpacesService {
   private recordSpaceModel: ReturnType<typeof getRecordSpaceModel>;
   private recordFieldsModel: ReturnType<typeof getRecordFieldModel>;

   constructor(
      private projectService: ProjectsService,
      private userService: UserService,
      @Inject('REQUEST') private context: Context,
      private logger: Logger,
   ) {
      this.contextFactory = contextGetter(this.context.req, this.logger);
      this.recordSpaceModel = getRecordSpaceModel(this.logger);
      this.recordFieldsModel = getRecordFieldModel(this.logger);
   }

   private contextFactory: ReturnType<typeof contextGetter>;

   private UserIdFromContext() {
      this.logger.sLog({}, 'ProjectService:UserIdFromContext');
      const user = this.contextFactory.getValue(['user'], { silent: true });
      return user ? user?._id : '';
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
         throwBadRequest('User id and project slug is required');
      }

      const project = await measureTimeTaken({
         func: this.projectService.findOne({
            slug: projectSlug,
            user: userId,
         }),
         tag: 'RecordSpacesService:assertCreation::project',
         context: this.context,
      });

      if (!project) {
         throwBadRequest('Project does not exist');
      }

      const recordSpaceExists = await measureTimeTaken({
         func: this.recordSpaceModel.findOne({
            slug,
            projectSlug,
         }),
         tag: 'RecordSpacesService:assertCreation',
         context: this.context,
      });

      if (recordSpaceExists) {
         throwBadRequest('Record Space with this slug already exists');
      }

      return { project };
   }

   async addNewFieldDetails({
      incomingRecordFieldStructures,
      recordSpaceId,
   }: {
      incomingRecordFieldStructures: CreateFieldsInput['recordFieldStructures'];
      recordSpaceId: string;
   }) {
      this.logger.sLog(
         { incomingRecordFieldStructures, recordSpaceId },
         'RecordSpacesService::mergeNewAndExistingFields',
      );
      return Promise.all(
         incomingRecordFieldStructures.map(async incomingFieldDetails => {
            const { slug: incomingSlug } = incomingFieldDetails;

            return measureTimeTaken({
               func: this.recordFieldsModel.findOneAndUpdate(
                  {
                     recordSpace: recordSpaceId,
                     slug: incomingSlug,
                  },
                  {
                     $set: {
                        ...incomingFieldDetails,
                        recordSpace: recordSpaceId,
                        slug: incomingSlug,
                     },
                  },
                  {
                     upsert: true,
                     returnDocument: 'after',
                  },
               ),
               tag: 'RecordSpacesService::mergeNewAndExistingFields',
               context: this.context,
            });
         }),
      );
   }

   /**
    *
    * @param args
    * @returns
    */
   async updateRecordSpaceAndFields(args: {
      userId?: string;
      recordSpace?: MRecordSpace;
      incomingRecordSpaceStructure: Omit<CreateRecordSpaceInput, 'authOptions'>;
   }) {
      this.logger.sLog({ args }, 'updateRecordSpaceAndFields');

      const { recordSpace, userId, incomingRecordSpaceStructure } = args;

      const {
         projectSlug,
         recordFieldStructures,
         slug: recordSpaceSlug,
         description,
         webhooks,
         name,
      } = incomingRecordSpaceStructure;

      let recordSpaceDetails = recordSpace;

      if (!recordSpaceDetails) {
         recordSpaceDetails = await this.findOne({
            query: { slug: recordSpaceSlug, projectSlug, user: userId },
         });

         if (!recordSpaceDetails) {
            throwBadRequest(
               `RecordSpace: ${recordSpaceSlug} does not exist for project: ${projectSlug}`,
            );
         }
      }

      const { _id: recordSpaceId } = recordSpaceDetails;

      const recordFieldsDetails = await this.addNewFieldDetails({
         incomingRecordFieldStructures: recordFieldStructures,
         recordSpaceId: String(recordSpaceId),
      });

      const hasHashedFields = (recordFieldsDetails || []).some(
         field => field.hashed,
      );

      const updatedRecordSpace = await this.update({
         projectSlug,
         query: { slug: recordSpaceSlug, _id: recordSpace._id },
         update: {
            $set: {
               recordFields: recordFieldsDetails.map(({ _id }) => _id),
               hydratedRecordFields: recordFieldsDetails,
               webhooks,
               recordStructureHash: getRecordSpaceTrackedFieldsHash(
                  {
                     recordFieldStructures,
                     description,
                     name,
                     webhooks,
                  },
                  this.logger,
               ),
               hasHashedFields,
            },
         },
         userId,
      });

      return updatedRecordSpace;
   }

   async assertNewFieldCreation({
      projectSlug,
      recordSpaceSlug,
      recordFieldStructures,
   }: CreateFieldsInput) {
      this.logger.sLog(
         { projectSlug, recordSpaceSlug, recordFieldStructures },
         'RecordSpaceService:assertNewFieldCreation',
      );
      for (let index = 0; index < recordFieldStructures.length; index++) {
         const { slug } = recordFieldStructures[index];
         const recordSpace = await this.findOne({
            query: {
               slug: recordSpaceSlug,
               'recordStructure.slug': slug,
               projectSlug,
            },
         });

         if (recordSpace) {
            throwBadRequest(
               `Field with 'slug: ${slug}, recordSpace: ${recordSpaceSlug}, project: ${projectSlug}'  already exists`,
            );
         }
      }
   }

   async reStructure({
      projectSlug,
      recordSpaceSlug,
      recordFieldStructures,
   }: CreateFieldsInput) {
      this.logger.sLog(
         { projectSlug, recordSpaceSlug, recordFieldStructures },
         'RecordSpaceService::assertNewFieldCreation',
      );
      for (let index = 0; index < recordFieldStructures.length; index++) {
         const { slug } = recordFieldStructures[index];
         const recordSpace = await this.findOne({
            query: {
               slug: recordSpaceSlug,
               'recordStructure.slug': slug,
               projectSlug,
            },
         });
         if (recordSpace) {
            throwBadRequest(
               `Field with 'slug: ${slug}, recordSpace: ${recordSpaceSlug}, project: ${projectSlug}'  already exists`,
            );
         }
      }
   }

   async compareRecordSpaceHash(args: {
      existingRecordStructureHash: string;
      trackedRecordSpaceFields: TrackedRecordSpaceFields;
   }) {
      this.logger.sLog(
         { args },
         'RecordSpaceService::compareRecordStructureHash',
      );
      const { existingRecordStructureHash, trackedRecordSpaceFields } = args;

      const newFieldsHash = getRecordSpaceTrackedFieldsHash(
         trackedRecordSpaceFields,
         this.logger,
      );

      const newRecordSpaceFieldsIsDetected =
         existingRecordStructureHash !== newFieldsHash;

      this.logger.sLog(
         {
            trackedRecordSpaceFields,
            existingRecordStructureHash,
            newFieldsHash,
         },
         newRecordSpaceFieldsIsDetected
            ? 'new record space fields detected'
            : 'same old record space fields',
      );

      return {
         matched: existingRecordStructureHash === newFieldsHash,
      };
   }

   private async createFields(
      recordSpaceId: string,
      recordStructure: RecordFieldStructure[],
   ): Promise<MRecordField[]> {
      this.logger.sLog(recordStructure, 'RecordSpaceService:createFields');
      const slugList = recordStructure.map(field => field.slug);
      const trimmedSlugList = [...new Set(slugList)];
      if (slugList.length !== trimmedSlugList.length) {
         throwBadRequest('Duplicate Form Field slugs found, Use Unique Slugs');
      }
      return Promise.all(
         recordStructure.map(recordStructure =>
            this.createField(recordSpaceId, recordStructure),
         ),
      );
   }

   private async createField(
      recordSpaceId: string,
      field: RecordFieldStructure,
   ): Promise<MRecordField> {
      this.logger.sLog(
         { recordSpaceId, field },
         'RecordSpaceService::createField',
      );

      const recordField = await measureTimeTaken({
         func: this.recordFieldsModel.insert({
            recordSpace: recordSpaceId,
            ...field,
         }),
         tag: 'RecordSpaceService::createField',
         context: this.context,
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
      recordSpaceType: RecordSpaceType;
   }) {
      const {
         createRecordSpaceInput,
         userId = this.UserIdFromContext(),
         project,
         fullyAsserted = false,
         activateDeveloperMode = false,
         recordSpaceType,
      } = args;
      this.logger.sLog(
         { createRecordSpaceInput, userId },
         'RecordSpaceService:create',
      );

      const {
         projectSlug,
         recordFieldStructures,
         slug,
         description,
         name,
         webhooks,
      } = createRecordSpaceInput;

      if (fullyAsserted && !project) {
         this.logger.debug(
            'Project Details should be set if fully asserted',
            'RecordSpaceService: create',
         );
         throwBadRequest('Something Unusual Happened');
      }

      let _project = project;

      if (!fullyAsserted) {
         const {
            project: projectReturnedFromAssertion,
         } = await this.assertCreation({
            project: { slug: projectSlug },
            userId,
            slug,
         });

         _project = projectReturnedFromAssertion;
      }

      const id = new ObjectId();

      const recordFields = await this.createFields(
         id.toHexString(),
         recordFieldStructures,
      );

      const hasHashedFields = (recordFields || []).some(field => field.hashed);

      const update = {
         _id: id,
         project: String(project._id),
         user: userId,
         slug,
         description,
         name,
         recordStructureHash: getRecordSpaceTrackedFieldsHash(
            {
               recordFieldStructures,
               description,
               name,
               webhooks,
            },
            this.logger,
         ),
         recordFields: recordFields.map(field => new ObjectId(field._id)),
         admins: [],
         hydratedRecordFields: recordFields,
         hydratedProject: project,
         projectSlug,
         hasHashedFields,
         developerMode: activateDeveloperMode,
         type: recordSpaceType,
      };

      await measureTimeTaken({
         func: this.recordSpaceModel.updateOne({
            _id: id
         }, {
            $set: update
         },
            {
               upsert: true
            }),
         tag: 'RecordSpaceService:create',
         context: this.context,
      });

      return update;
   }

   async find(query: Filter<MRecordSpace> = {}): Promise<MRecordSpace[]> {
      this.logger.sLog(query, 'RecordSpaceService:find');

      if (!query.project) {
         if (!query.user) {
            query.user = this.UserIdFromContext();
         }

         if (!query.user) {
            this.logger.sLog(query, 'RecordSpaceService:find:User is required');
            throwBadRequest('Something Unusual Happened');
         }

         const project = await this.projectService.findOne({
            slug: query.projectSlug,
            user: query.user,
         });

         if (!project) {
            throwBadRequest('Project does not exist');
         }

         query.project = String(project._id);
      }

      return measureTimeTaken({
         func: this.recordSpaceModel.find(query),
         tag: 'RecordSpaceService:find',
         context: this.context,
      });
   }

   async findOne(args: {
      query?: Filter<MRecordSpace>;
      projection?: FindOptions['projection'];
   }): Promise<MRecordSpace> {
      this.logger.sLog(args, 'RecordSpaceService:findOne');
      const { query, projection = null } = args;

      return measureTimeTaken({
         func: this.recordSpaceModel.findOne(query, { projection }),
         tag: 'RecordSpaceService:findOne',
         context: this.context,
      });
   }

   async populateRecordSpace(
      recordSpace: MRecordSpace,
      fieldsToPopulate: 'project' | 'recordFields',
   ): Promise<any> {
      this.logger.sLog(
         { recordSpace, fieldsToPopulate },
         'RecordSpaceService:populateRecordSpace',
      );

      const {
         project: xProject,
         recordFields: xRecordFields,
         ...remainingFields
      } = recordSpace;
      const populatedRecordSpace: PopulatedRecordSpace = { ...remainingFields };
      const fieldsToPopulateArr = fieldsToPopulate.split(' ');
      for (let index = 0; index < fieldsToPopulateArr.length; index++) {
         const field = fieldsToPopulateArr[index];

         if (field === 'project') {
            const project = await this.projectService.findOne({
               query: { _id: xProject },
            });
            populatedRecordSpace.project = project;
         }
      }

      return populatedRecordSpace;
   }

   async getFields(recordFieldIds?: string[]): Promise<MRecordField[]> {
      this.logger.sLog(recordFieldIds, 'RecordSpaceService:getFields');

      return measureTimeTaken({
         func: this.recordFieldsModel.find({
            _id: { $in: recordFieldIds.map(id => new ObjectId(id)) },
         }),
         tag: 'RecordSpaceService:getFields',
         context: this.context,
      });
   }

   async getEndpoints(
      recordSpaceDetails?: GenerateEndpointInput,
   ): Promise<Endpoint[]> {
      this.logger.sLog(recordSpaceDetails, 'RecordSpaceService:getEndpoints');

      const { projectId, slug, fieldIds, developerMode } = recordSpaceDetails;

      if (!developerMode) {
         return [];
      }

      const [projectDetails, recordFieldsDetails] = await Promise.all([
         measureTimeTaken({
            func: this.projectService.findOne({ _id: new ObjectId(projectId) }),
            tag: 'RecordSpaceService:getEndpoints',
            context: this.context,
         }),
         measureTimeTaken({
            func: this.recordFieldsModel.find({
               _id: { $in: fieldIds.map(id => new ObjectId(id)) },
            }),
            tag: 'RecordSpaceService:getEndpoints',
            context: this.context,
         }),
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

      const _userId = userId ?? this.UserIdFromContext();

      if (!projectId && !projectSlug && !_userId) {
         throwBadRequest(
            'Project Slug and User Id is required when projectId is not provided',
         );
      }

      const project = await this.projectService.findOne({
         slug: projectSlug,
         user: _userId,
      });
      if (!project) {
         throwBadRequest('Project does not exist');
      }

      return project._id;
   }

   async update(args: {
      query?: Partial<MRecordSpace>;
      update?: UpdateFilter<MRecordSpace>;
      scope?: ACTION_SCOPE;
      projectSlug?: string;
      userId?: string;
      throwOnEmpty?: boolean;
   }) {
      this.logger.sLog(args, 'RecordSpaceService::update::update');

      const {
         query,
         update,
         scope = ACTION_SCOPE.JUST_THIS_RECORD_SPACE,
         projectSlug,
         userId = this.UserIdFromContext(),
         throwOnEmpty = true,
      } = args;

      if (!query._id) {
         if (!projectSlug && query.project) {
            this.logger.sLog(
               {},
               'RecordSpaceService::update::update:: ProjectSlug and projectId is required when recordSpace id is provided',
            );
            throwBadRequest('An Unknown error occurred');
         }

         const project = await this.assertRecordSpaceMutation({
            projectId: query.project,
            projectSlug,
            userId,
         });
         query.project = String(project);
      }

      let atomizedUpdate = update;
      if (!atomizedUpdate.$set) {
         atomizedUpdate = {
            $set: {
               ...atomizedUpdate,
            },
         };
      }

      const response = await measureTimeTaken({
         func: this.recordSpaceModel.findOneAndUpdate(query, atomizedUpdate, {
            returnDocument: 'after',
         }),
         tag: 'RecordSpaceService::update::update',
         context: this.context,
      });

      this.logger.sLog(response, 'RecordSpaceService:update::response');

      if (throwOnEmpty && !response) {
         throwBadRequest('RecordSpace does not exist');
      }

      if (scope === ACTION_SCOPE.ALL_OTHER_RECORD_SPACES) {
         await measureTimeTaken({
            func: this.recordSpaceModel.findOneAndUpdate(
               {
                  project: response.project,
                  _id: { $ne: response._id },
               },
               update,
               { returnDocument: 'after' },
            ),
            tag: 'RecordSpaceService::update::update',
            context: this.context,
         });

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

      const query = { _id: new ObjectId(userId) }

      const userDetails = await this.userService.getUserDetails(query);

      if (!userDetails) {
         throwBadRequest('Admin User does not exist');
      }

      return this.update({
         query,
         update: { $addToSet: { admins: userId } },
         scope,
         userId: this.UserIdFromContext(),
      });
   }

   async remove(args: {
      query?: Partial<MRecordSpace>;
      projectSlug?: string;
      projectId?: ObjectId;
   }): Promise<boolean> {
      this.logger.sLog(args, 'RecordSpaceService:remove');
      const { query, projectSlug } = args;

      let project = args.projectId;

      if (!project) {
         project = await this.assertRecordSpaceMutation({
            projectId: query.project,
            projectSlug,
         });
      }

      const deleted = await measureTimeTaken({
         func: this.recordSpaceModel.deleteOne({
            ...query,
            projectSlug,
            project: String(project),
         }),
         tag: 'RecordSpaceService:remove',
         context: this.context,
      });

      if (deleted.deletedCount === 0) {
         throwBadRequest('RecordSpace does not exist');
      }

      return deleted.deletedCount > 0;
   }

   async shouldUpdateRecordSpace(args: {
      recordSpace: MRecordSpace;
      allowMutation: boolean;
      incomingRecordSpaceStructure: Omit<CreateRecordSpaceInput, 'authOptions'>;
   }) {
      this.logger.sLog(args, 'RecordSpaceService::shouldUpdateRecordSpace');
      const { recordSpace, allowMutation, incomingRecordSpaceStructure } = args;
      const {
         recordFieldStructures,
         description,
         webhooks,
         name,
      } = incomingRecordSpaceStructure;

      const { matched } = await this.compareRecordSpaceHash({
         existingRecordStructureHash: recordSpace.recordStructureHash,
         trackedRecordSpaceFields: {
            description,
            recordFieldStructures,
            webhooks,
            name,
         },
      });

      const recordStructureNotTheSame = !matched;

      const mutationIsRequired = recordStructureNotTheSame;

      if (!allowMutation && mutationIsRequired) {
         this.logger.sLog(
            { allowMutation },
            'ClientService::handleRecordSpaceCheckInPreOperation:: mutation is not allowed',
         );
         throwBadRequest(
            `Mutation is not allowed, recordStructure for "${recordSpace.slug}" was changed`,
         );
      }

      return {
         recordStructureNotTheSame,
      };
   }

   async handleRecordSpaceUpdates(args: {
      recordSpace: MRecordSpace;
      allowMutation: boolean;
      incomingRecordSpaceStructure: Omit<CreateRecordSpaceInput, 'authOptions'>;
      userId: string;
      usePreStoredStructure: boolean;
   }) {
      this.logger.sLog(args, 'RecordSpaceService::handleRecordSpaceUpdates');

      const {
         recordSpace,
         allowMutation,
         incomingRecordSpaceStructure,
         userId,
         usePreStoredStructure
      } = args;

      let recordSpaceAfterUpdates: MRecordSpace = recordSpace;

      if (!usePreStoredStructure) {

         const { recordStructureNotTheSame } = await this.shouldUpdateRecordSpace({
            recordSpace,
            allowMutation,
            incomingRecordSpaceStructure,
         });

         this.logger.sLog(
            { recordStructureNotTheSame },
            'RecordSpaceService::handleRecordSpaceUpdates',
         );

         if (recordStructureNotTheSame) {
            recordSpaceAfterUpdates = await this.updateRecordSpaceAndFields({
               incomingRecordSpaceStructure,
               userId,
               recordSpace,
            });
         }
      }

      return recordSpaceAfterUpdates;
   }

   async handleRecordSpaceMutationInPreOperation(args: {
      recordFieldStructures: RecordFieldStructure[];
      userId: string;
      autoCreateRecordSpace: boolean;
      autoCreateProject: boolean;
      incomingRecordSpaceStructure: Omit<CreateRecordSpaceInput, 'authOptions'>;
      allowMutation: boolean;
      usePreStoredStructure: boolean;
      recordSpaceDetails: MRecordSpace;
   }) {
      this.logger.sLog(args, 'RecordSpaceService::handleRecordSpaceCheck');

      const {
         userId,
         autoCreateRecordSpace,
         autoCreateProject,
         incomingRecordSpaceStructure,
         allowMutation,
         usePreStoredStructure,
         recordSpaceDetails
      } = args;

      const { slug: recordSpaceSlug, projectSlug } = incomingRecordSpaceStructure;

      let recordSpace = recordSpaceDetails;

      if (!recordSpace && usePreStoredStructure) {
         throwBadRequest(`There is no pre-stored structure for this recordSpace: ${recordSpaceSlug}`)
      };

      let project: MProject;

      if (recordSpace) {
         recordSpace = await this.handleRecordSpaceUpdates({
            recordSpace,
            allowMutation,
            incomingRecordSpaceStructure,
            userId,
            usePreStoredStructure
         });

         project = recordSpace.hydratedProject;
      }

      if (!recordSpace) {

         this.logger.sLog(
            { recordSpace },
            'ClientService::_prepareOperationResources:: recordSpace or project does not exist',
         );

         project = await this.projectService.assertProjectExistence(
            { projectSlug, userId },
            { autoCreate: autoCreateProject },
         );

         if (!autoCreateRecordSpace) {
            this.logger.sLog(
               { autoCreateRecordSpace: autoCreateRecordSpace },
               'ClientService::autoCreateRecordSpace:: auto creating recordSpace not allowed',
            );
            throwBadRequest(
               `RecordSpace: "slug: ${recordSpaceSlug}" does not exist`,
            );
            return;
         }

         const trace = this.contextFactory.getValue(['trace']);

         const { uniqueUrlComponent = '' } = trace;

         recordSpace = await this.create({
            createRecordSpaceInput: incomingRecordSpaceStructure,
            userId,
            project,
            fullyAsserted: true,
            activateDeveloperMode: true,
            recordSpaceType: ['set-key-values', 'get-key-values'].includes(
               uniqueUrlComponent,
            )
               ? 'key-value'
               : 'rowed',
         });
      }

      return {
         project,
         recordSpace,
      };
   }
}
