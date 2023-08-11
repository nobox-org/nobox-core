import { Filter, FindOptions, UpdateFilter, ObjectId } from "@nobox-org/shared-lib";
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
import { contextGetter, getRecordStructureHash } from '../../utils';
import { Context, PopulatedRecordSpace, RecordSpaceType } from '@/types';
import {
   MProject,
   getRecordSpaceModel,
   getRecordFieldModel,
   MRecordField,
   MRecordSpace,
} from "@nobox-org/shared-lib";
import { Endpoint, GenerateEndpointInput, RecordFieldStructure } from './types';

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

      const project = await this.projectService.findOne({
         slug: projectSlug,
         user: userId,
      });

      if (!project) {
         throwBadRequest('Project does not exist');
      }

      const recordSpaceExists = await this.recordSpaceModel.findOne({
         slug,
         projectSlug,
      });

      if (recordSpaceExists) {
         throwBadRequest('Record Space with this slug already exists');
      }

      return { project };
   }

   async mergeNewAndExistingFields({
      incomingRecordFieldStructures,
      recordSpaceId,
   }: {
      incomingRecordFieldStructures: CreateFieldsInput['recordFieldStructures'];
      recordSpaceId: string;
   }) {
      this.logger.sLog(
         { incomingRecordFieldStructures, recordSpaceId },
         'RecordSpacesService:mergeNewAndExistingFields',
      );
      return Promise.all(
         incomingRecordFieldStructures.map(async incomingFieldDetails => {
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
                  },
               },
               {
                  upsert: true,
                  returnDocument: 'after',
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
      userId?: string,
      recordSpace?: MRecordSpace,
   ) {
      this.logger.sLog(
         { createFieldsInput, userId, recordSpace },
         'createFieldsFromNonIdProps',
      );
      const {
         projectSlug,
         recordSpaceSlug,
         recordFieldStructures: incomingRecordFieldStructures,
      } = createFieldsInput;

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

      const recordFieldsDetails = await this.mergeNewAndExistingFields({
         incomingRecordFieldStructures,
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
               recordStructureHash: getRecordStructureHash(
                  incomingRecordFieldStructures,
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

   async compareRecordStructureHash(args: {
      existingRecordStructureHash: string;
      newRecordStructure: RecordFieldStructure[];
   }) {
      this.logger.sLog(
         { args },
         'RecordSpaceService::compareRecordStructureHash',
      );
      const { existingRecordStructureHash, newRecordStructure } = args;
      const newRecordStructureHash = getRecordStructureHash(
         newRecordStructure,
         this.logger,
      );

      const newRecordStructureIsDetected =
         existingRecordStructureHash !== newRecordStructureHash;
      this.logger.sLog(
         {
            newRecordStructure,
            existingRecordStructureHash,
            newRecordStructureHash,
         },
         newRecordStructureIsDetected
            ? 'newRecordStructure detected'
            : 'same old recordStructure',
      );

      return {
         matched: existingRecordStructureHash === newRecordStructureHash,
      };
   }

   async updateRecordSpaceStructureByHash(args: {
      recordSpace: MRecordSpace;
      recordFieldStructures: RecordFieldStructure[];
   }) {
      this.logger.sLog(
         { args },
         'RecordSpaceService::updateRecordSpaceStructureByHash',
      );

      const { recordSpace, recordFieldStructures } = args;

      const { matched } = await this.compareRecordStructureHash({
         existingRecordStructureHash: recordSpace.recordStructureHash,
         newRecordStructure: recordFieldStructures,
      });

      const newRecordStructureIsDetected = !matched;

      if (newRecordStructureIsDetected) {
         const user = this.contextFactory.getValue(['user']);
         const project = this.contextFactory.getValue(['trace', 'project']);

         const { slug: recordSpaceSlug } = recordSpace;
         return this.createFieldsFromNonIdProps(
            {
               recordSpaceSlug,
               recordFieldStructures,
               projectSlug: project.slug,
            },
            user,
            recordSpace,
         );
      }
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
      const recordField = await this.recordFieldsModel.insert({
         recordSpace: recordSpaceId,
         ...field,
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
         initialData = null,
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

      const createdRecordSpace = await this.recordSpaceModel.insert({
         _id: id,
         project: String(project._id),
         user: userId,
         slug,
         description,
         name,
         recordStructureHash: getRecordStructureHash(
            recordFieldStructures,
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
      });

      return createdRecordSpace;
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

      return this.recordSpaceModel.find(query);
   }

   async findOne(args: {
      query?: Filter<MRecordSpace>;
      projection?: FindOptions['projection'];
   }): Promise<MRecordSpace> {
      this.logger.sLog(args, 'RecordSpaceService:findOne');
      const { query, projection = null } = args;
      return this.recordSpaceModel.findOne(query, { projection });
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
      return this.recordFieldsModel.find({
         _id: { $in: recordFieldIds.map(id => new ObjectId(id)) },
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
         this.projectService.findOne({ _id: new ObjectId(projectId) }),
         this.recordFieldsModel.find({
            _id: { $in: fieldIds.map(id => new ObjectId(id)) },
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

      const response = await this.recordSpaceModel.findOneAndUpdate(
         query,
         atomizedUpdate,
         { returnDocument: 'after' },
      );

      this.logger.sLog(response, 'RecordSpaceService:update:response');

      if (throwOnEmpty && !response) {
         throwBadRequest('RecordSpace does not exist');
      }

      if (scope === ACTION_SCOPE.ALL_OTHER_RECORD_SPACES) {
         await this.recordSpaceModel.findOneAndUpdate(
            {
               project: response.project,
               _id: { $ne: response._id },
            },
            update,
            { returnDocument: 'after' },
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
         throwBadRequest('Admin User does not exist');
      }

      return this.update({
         query: { _id: new ObjectId(id) },
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

      const deleted = await this.recordSpaceModel.deleteOne({
         ...query,
         projectSlug,
         project: String(project),
      });

      if (deleted.deletedCount === 0) {
         throwBadRequest('RecordSpace does not exist');
      }

      return deleted.deletedCount > 0;
   }

   async shouldUpdateRecordSpace(args: {
      recordSpace: MRecordSpace;
      recordFieldStructures: RecordFieldStructure[];
      allowMutation: boolean;
      initialData: any;
   }) {
      this.logger.sLog(args, 'RecordSpaceService::shouldUpdateRecordSpace');
      const { recordSpace, recordFieldStructures, allowMutation } = args;

      const { matched } = await this.compareRecordStructureHash({
         existingRecordStructureHash: recordSpace.recordStructureHash,
         newRecordStructure: recordFieldStructures,
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
      recordFieldStructures: any;
      allowMutation: boolean;
      incomingRecordSpaceStructure: Omit<CreateRecordSpaceInput, 'authOptions'>;
      projectSlug: string;
      userId: string;
   }) {
      this.logger.sLog(args, 'RecordSpaceService:handleRecordSpaceUpdates');

      const {
         recordSpace,
         recordFieldStructures,
         allowMutation,
         incomingRecordSpaceStructure,
         projectSlug,
         userId,
      } = args;

      let recordSpaceAfterUpdates: MRecordSpace = recordSpace;

      const { recordStructureNotTheSame } = await this.shouldUpdateRecordSpace({
         recordSpace,
         recordFieldStructures,
         allowMutation,
         initialData: incomingRecordSpaceStructure.initialData,
      });

      this.logger.sLog(
         { recordStructureNotTheSame },
         'RecordSpaceService:handleRecordSpaceUpdates',
      );

      if (recordStructureNotTheSame) {
         const { slug: recordSpaceSlug } = recordSpace;
         recordSpaceAfterUpdates = await this.createFieldsFromNonIdProps(
            {
               recordSpaceSlug,
               recordFieldStructures,
               projectSlug,
            },
            userId,
            recordSpace,
         );
      }

      return recordSpaceAfterUpdates;
   }

   async handleRecordSpaceMutationInPreOperation(args: {
      recordSpaceSlug: string;
      recordFieldStructures: RecordFieldStructure[];
      projectSlug: string;
      userId: string;
      autoCreateRecordSpace: boolean;
      autoCreateProject: boolean;
      incomingRecordSpaceStructure: Omit<CreateRecordSpaceInput, 'authOptions'>;
      allowMutation: boolean;
   }) {
      this.logger.sLog(args, 'RecordSpaceService::handleRecordSpaceCheck');

      const {
         recordSpaceSlug,
         recordFieldStructures,
         projectSlug,
         userId,
         autoCreateRecordSpace,
         autoCreateProject,
         incomingRecordSpaceStructure,
         allowMutation,
      } = args;

      let recordSpace = await this.findOne({
         query: { slug: recordSpaceSlug, projectSlug, user: userId },
      });

      let project: MProject;

      if (recordSpace) {
         recordSpace = await this.handleRecordSpaceUpdates({
            recordSpace,
            recordFieldStructures,
            allowMutation,
            incomingRecordSpaceStructure,
            projectSlug,
            userId,
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
