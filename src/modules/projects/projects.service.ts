import { Inject, Injectable, Scope } from '@nestjs/common';

import { CustomLogger as Logger } from '@/modules/logger/logger.service';
import { Filter, ObjectId } from 'mongodb';
import { CreateProjectInput } from './dto/create-project.input';
import { throwBadRequest } from '@/utils/exceptions';
import { Context } from '@/types';
import { contextGetter } from '@/utils';
import { getProjectModel, MProject, getProjectKeysModel } from '@/schemas';
import { Project } from './entities/project.entity';
import { getProjectUsersModel } from '@/schemas/project-users.schema';
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
      const projectExists = await this.projectModel.findOne({
         slug,
         user: userId,
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
      const createdProject = await this.projectModel.insert({
         ...createProjectInput,
         user: userId,
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
      const projects = await this.projectModel.find({
         ...query,
         ...(query.id ? { _id: query.id } : {}),
      });
      return projects.map(project => ({
         id: String(project._id),
         ...project,
      }));
   }

   async findSharedProjects(args: { email: string }): Promise<Project[]> {
      this.logger.sLog(args, 'ProjectService:findSharedProjects');
      const { email } = args;

      const sharedProjectObjectIds = (await this.projectUsersModel.find({ email })).map(projectUser => {
         const { projectId } = projectUser;
         return new ObjectId(projectId);
      });

      const sharedProjects = await this.projectModel.find({
         _id: { $in: sharedProjectObjectIds }
      });

      return sharedProjects.map(project => ({
         id: String(project._id),
         ...project,
      }));
   }


   async findOne(query?: Filter<MProject>): Promise<MProject> {
      this.logger.sLog(query, 'ProjectService:findOne');
      const p = await this.projectModel.findOne(query);
      return p;
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

      const project = await (this.projectModel.findOneAndUpdate(
         query,
         { $set: update },
         { returnDocument: 'after' },
      ) as any);

      if (!project) {
         this.logger.sLog({}, 'ProjectService:update: project does not exist');
         throwBadRequest('Project Does not Exist');
      }

      if (update.keys) {
         await this.projectKeysModel.updateOne(
            { project: project._id },
            {
               $set: {
                  ...update.keys,
               },
            },
         );
      }

      project.id = String(project._id);

      return project;
   }

   async remove(query?: Filter<MProject>): Promise<void> {
      this.logger.sLog(query, 'ProjectService:remove');

      if (query._id && query.slug) {
         throwBadRequest("You can't delete with both id and slug");
      }

      await this.projectModel.deleteOne(query);
   }

   async assertProjectExistence(
      { projectSlug, projectId, userId }: { projectSlug?: string; userId: string, projectId?: string; },
      options: { autoCreate: boolean } = { autoCreate: false },
   ) {
      this.logger.sLog(
         { projectSlug, userId, options, projectId },
         'ProjectService:assertProjectExistence',
      );

      const queryArgs = {
         user: userId,
         ...(projectId ? { _id: new ObjectId(projectId) } : {}),
         ...(projectSlug ? { slug: projectSlug } : {})
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

   async addUserToProject(
      { projectId, projectOwnerId, userEmail }: { projectId: string; projectOwnerId: string, userEmail: string },
   ) {

      const project = await this.assertProjectExistence({
         projectId,
         userId: projectOwnerId
      });

      const { email: projectOwnerEmail } = await this.userService.getUser({ _id: projectOwnerId });

      if (projectOwnerEmail === userEmail) {
         throwBadRequest(`You can't add User: ${projectOwnerEmail} who is already a project owner`)
      }

      const userHasAlreadyBeenAddedToProject = await this.projectUsersModel.findOne({
         projectId: String(project._id),
         email: userEmail
      })

      if (userHasAlreadyBeenAddedToProject) {
         throwBadRequest(`User: ${userEmail} has already been added`)
      }

      await this.projectUsersModel.insert({
         projectId: String(project._id),
         email: userEmail
      })

      return userEmail;
   }

   async getProjectUser(
      { projectSlug, projectOwnerId, projectId }: { projectSlug: string; projectOwnerId: string, projectId: string },
   ) {

      const project = await this.assertProjectExistence({
         userId: projectOwnerId,
         projectId,
         projectSlug
      });

      return this.projectUsersModel.find({
         projectId: String(project._id),
      })
   }

   async removeUserFromProject(
      { projectId, userEmail }: { projectId: string; projectOwnerId: string, userEmail: string },
   ) {

      await this.projectUsersModel.findOneAndDelete({
         projectId: projectId,
         email: userEmail
      });

      return userEmail;
   }
}
