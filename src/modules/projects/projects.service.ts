import { Inject, Injectable, Scope } from '@nestjs/common';

import { CustomLogger as Logger } from '@/modules/logger/logger.service';
import { Filter, ObjectId } from '@nobox-org/shared-lib';
import { CreateProjectInput } from './dto/create-project.input';
import { throwBadRequest } from '@/utils/exceptions';
import { Context } from '@/types';
import { contextGetter, measureTimeTaken } from '@/utils';
import {
   getProjectModel,
   MProject,
   getProjectKeysModel,
   getProjectUsersModel,
} from '@nobox-org/shared-lib';
import { Project } from './entities/project.entity';
import { UserService } from '../user/user.service';

@Injectable({ scope: Scope.REQUEST })
export class ProjectsService {
   private projectModel: ReturnType<typeof getProjectModel>;
   private projectKeysModel: ReturnType<typeof getProjectKeysModel>;
   private projectUsersModel: ReturnType<typeof getProjectUsersModel>;

   constructor(
      @Inject('REQUEST') private context: Context,
      private logger: Logger,
      private userService: UserService,
   ) {
      this.contextFactory = contextGetter(this.context.req, this.logger);
      this.projectModel = getProjectModel(this.logger);
      this.projectUsersModel = getProjectUsersModel(this.logger);
   }

   private contextFactory: ReturnType<typeof contextGetter>;

   private UserIdFromContext() {
      this.logger.sLog({}, 'ProjectService:UserIdFromContext');
      const user = this.contextFactory.getValue(['user'], { silent: true });
      return user ? user?._id : '';
   }

   async assertCreation(args: { slug: string; userId: string }) {
      this.logger.sLog(args, 'ProjectService:assertCreation');
      const { slug, userId } = args;

      const projectExists = await measureTimeTaken({
         func: this.projectModel.findOne({
            slug,
            user: userId,
         }),
         tag: 'ProjectService:assertCreation',
         context: this.context,
      });

      if (projectExists) {
         this.logger.sLog(
            {},
            'ProjectService:assertCreation: project already exists',
         );
         throwBadRequest('Project with this slug already exists');
      }
   }

   async create(
      createProjectInput: CreateProjectInput,
      userId: string = this.UserIdFromContext(),
   ) {
      this.logger.sLog(createProjectInput, 'ProjectService:create');
      await this.assertCreation({ slug: createProjectInput.slug, userId });

      const createdProject = await measureTimeTaken({
         func: this.projectModel.insert({
            ...createProjectInput,
            user: userId,
         }),
         tag: 'ProjectService:create',
         context: this.context,
      });

      this.logger.sLog(
         createProjectInput,
         'ProjectService:create project details Saved',
      );
      return createdProject;
   }

   async findForUser(query?: Filter<MProject>): Promise<MProject[]> {
      this.logger.sLog({ query }, 'ProjectService:findForUser');
      return this.find({ ...query, user: this.UserIdFromContext() });
   }

   async find(query: any = {}): Promise<Project[]> {
      this.logger.sLog(query, 'ProjectService:find');
      query.user = this.UserIdFromContext();
      const projects = await measureTimeTaken({
         func: this.projectModel.find({
            ...query,
            ...(query.id ? { _id: query.id } : {}),
         }),
         tag: 'ProjectService:find',
         context: this.context,
      });

      return projects.map(project => ({
         id: String(project._id),
         ...project,
      }));
   }

   async findSharedProjects(args: { email: string }): Promise<Project[]> {
      this.logger.sLog(args, 'ProjectService:findSharedProjects');
      const { email } = args;

      const sharedProjectObjectIds = (
         await measureTimeTaken({
            func: this.projectUsersModel.find({ email }),
            tag: 'ProjectService:findSharedProjects',
            context: this.context,
         })
      ).map(projectUser => {
         const { projectId } = projectUser;
         return new ObjectId(projectId);
      });

      const sharedProjects = await measureTimeTaken({
         func: this.projectModel.find({
            _id: { $in: sharedProjectObjectIds },
         }),
         tag: 'ProjectService:findSharedProjects',
         context: this.context,
      });

      return sharedProjects.map(project => ({
         id: String(project._id),
         ...project,
      }));
   }

   async findOne(query?: Filter<MProject>): Promise<MProject> {
      this.logger.sLog(query, 'ProjectService:findOne');

      const project = await measureTimeTaken({
         func: this.projectModel.findOne(query),
         tag: 'ProjectService:findOne',
         context: this.context,
      });

      return project;
   }

   async update(
      query?: Filter<MProject>,
      update?: Partial<MProject>,
   ): Promise<MProject> {
      this.logger.sLog({ query, update }, 'ProjectService:update');

      if (!query._id && !query.slug) {
         this.logger.sLog(
            {},
            'ProjectService:update::error Both id and slug is not set',
         );
         throwBadRequest('id or slug needs to be set');
      }

      if (query._id && query.slug) {
         this.logger.sLog(
            {},
            "ProjectService:update You can't update with both id and slug",
         );
         throwBadRequest("You can't update with both id and slug");
      }

      query.user = this.UserIdFromContext();

      const project = await measureTimeTaken({
         func: this.projectModel.findOneAndUpdate(
            query,
            { $set: update },
            { returnDocument: 'after' },
         ) as any,
         tag: 'ProjectService:update',
         context: this.context,
      });

      if (!project) {
         this.logger.sLog({}, 'ProjectService:update: project does not exist');
         throwBadRequest('Project Does not Exist');
      }

      if (update.keys) {
         await measureTimeTaken({
            func: this.projectKeysModel.updateOne(
               { project: project._id },
               {
                  $set: {
                     ...update.keys,
                  },
               },
            ),
            tag: 'ProjectService:update::update.keys',
            context: this.context,
         });
      }

      project.id = String(project._id);

      return project;
   }

   async remove(query?: Filter<MProject>): Promise<void> {
      this.logger.sLog(query, 'ProjectService:remove');

      if (query._id && query.slug) {
         throwBadRequest("You can't delete with both id and slug");
      }

      await measureTimeTaken({
         func: this.projectModel.deleteOne(query),
         tag: 'ProjectService:remove',
         context: this.context,
      });
   }

   async assertProjectExistence(
      {
         projectSlug,
         projectId,
         userId,
      }: { projectSlug?: string; userId: string; projectId?: string },
      options: { autoCreate: boolean } = { autoCreate: false },
   ) {
      this.logger.sLog(
         { projectSlug, userId, options, projectId },
         'ProjectService:assertProjectExistence',
      );

      const queryArgs = {
         user: userId,
         ...(projectId ? { _id: new ObjectId(projectId) } : {}),
         ...(projectSlug ? { slug: projectSlug } : {}),
      };

      let project = await this.findOne(queryArgs);
      if (!project) {
         if (!options.autoCreate) {
            throwBadRequest(`Project: ${projectSlug} does not exist`);
         }

         project = await this.create(
            {
               slug: projectSlug,
               name: projectSlug,
            },
            userId,
         );
      }
      return project;
   }

   async addUserToProject({
      projectId,
      projectOwnerId,
      userEmail,
   }: {
      projectId: string;
      projectOwnerId: string;
      userEmail: string;
   }) {
      this.logger.sLog(
         {
            projectId,
            projectOwnerId,
            userEmail,
         },
         'projectService::addUserToProject',
      );

      const project = await this.assertProjectExistence({
         projectId,
         userId: projectOwnerId,
      });

      const { email: projectOwnerEmail } = await this.userService.getUser({
         _id: projectOwnerId,
      });

      if (projectOwnerEmail === userEmail) {
         throwBadRequest(
            `You can't add User: ${projectOwnerEmail} who is already a project owner`,
         );
      }

      const userHasAlreadyBeenAddedToProject = await measureTimeTaken({
         func: this.projectUsersModel.findOne({
            projectId: String(project._id),
            email: userEmail,
         }),
         tag: 'ProjectService:remove',
         context: this.context,
      });

      if (userHasAlreadyBeenAddedToProject) {
         throwBadRequest(`User: ${userEmail} has already been added`);
      }

      await measureTimeTaken({
         func: this.projectUsersModel.insert({
            projectId: String(project._id),
            email: userEmail,
         }),
         tag: 'ProjectService:remove',
         context: this.context,
      });

      return userEmail;
   }

   async getProjectUser({
      projectSlug,
      projectOwnerId,
      projectId,
   }: {
      projectSlug: string;
      projectOwnerId: string;
      projectId: string;
   }) {
      this.logger.sLog(
         {
            projectSlug,
            projectOwnerId,
            projectId,
         },
         'projectService::getProjectUser',
      );
      const project = await this.assertProjectExistence({
         userId: projectOwnerId,
         projectId,
         projectSlug,
      });

      return measureTimeTaken({
         func: this.projectUsersModel.find({
            projectId: String(project._id),
         }),
         tag: 'ProjectService:remove',
         context: this.context,
      });
   }

   async removeUserFromProject({
      projectId,
      userEmail,
   }: {
      projectId: string;
      projectOwnerId: string;
      userEmail: string;
   }) {
      this.logger.sLog(
         {
            projectId,
            userEmail,
         },
         'projectsService::removeUserFromProject',
      );

      await measureTimeTaken({
         func: this.projectUsersModel.findOneAndDelete({
            projectId: projectId,
            email: userEmail,
         }),
         tag: 'ProjectService:remove',
         context: this.context,
      });

      return userEmail;
   }
}
