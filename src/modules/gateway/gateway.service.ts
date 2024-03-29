import { Inject, Injectable, Scope } from '@nestjs/common';
import { CustomLogger as Logger } from '@/modules/logger/logger.service';
import { Context } from '@/types';
import { contextGetter } from '@/utils';
import { RecordSpacesService } from '@/modules/record-spaces/record-spaces.service';
import { ProjectsService } from '@/modules/projects/projects.service';
import { Filter, MProject, MRecordSpace, ObjectId } from "nobox-shared-lib";
import { ProjectUserDto, ProjectSlugDto, CreateProjectDto } from './dto/gen.dto';
import { UserService } from '../user/user.service';
import { generateJWTToken } from '@/utils/jwt';

@Injectable({ scope: Scope.REQUEST })
export class GateWayService {
   constructor(
      @Inject('REQUEST') private context: Context,
      private recordSpacesService: RecordSpacesService,
      private projectService: ProjectsService,
      private userService: UserService,
      private logger: Logger,
   ) {
      this.contextFactory = contextGetter(this.context.req, this.logger);
   }

   private contextFactory: ReturnType<typeof contextGetter>;

   private UserIdFromContext() {
      this.logger.sLog({}, 'GatewayService:UserIdFromContext');
      const user = this.contextFactory.getValue(['user'], { silent: true });
      return user ? user?._id : '';
   }

   async getProjects(
      query?: Filter<MProject>,
   ): Promise<
      (MProject & {
         recordSpaces: MRecordSpace[];
      })[]
   > {
      this.logger.sLog({ query }, 'GatewayService::findForUser');

      const projects = await this.projectService.find({
         ...query,
         user: this.UserIdFromContext(),
      });

      const projectsWithRecordSpaces = await Promise.all(
         projects.map(async project => {
            const recordSpaces = await this.recordSpacesService.find({
               project: project.id,
            });
            return { ...project, recordSpaces };
         }),
      );

      return projectsWithRecordSpaces;
   }

   async getSharedProjects({ contextUser }: { contextUser?: any } = {}) {
      this.logger.sLog({}, 'GatewayService::getSharedProjects');

      const user = contextUser ?? this.contextFactory.getFullContext().user;

      const projects = await this.projectService.findSharedProjects({ email: user.email });

      const projectsWithRecordSpaces = await Promise.all(
         projects.map(async project => {
            const recordSpaces = await this.recordSpacesService.find({
               project: project.id,
            });
            return { ...project, recordSpaces };
         }),
      );

      return projectsWithRecordSpaces;
   }

   async getSharedProjectTokens({ contextUser }: { contextUser?: any } = {}) {
      this.logger.sLog({}, 'GatewayService::getSharedProjects');

      const user = contextUser ?? this.contextFactory.getFullContext().user;

      const projects = await this.projectService.findSharedProjects({ email: user.email });
      const sharedProjectTokens = Promise.all(projects.map(async project => {
         const { user, id } = project;
         const userDetails = await this.userService.getUserDetails({ _id: new ObjectId(user) });
         const token = generateJWTToken({ details: userDetails });
         return {
            projectId: id,
            projectToken: token
         };
      }));

      return sharedProjectTokens;
   }

   async getBulkProjectResources(args: {
      getProjectArgs?: { query: Filter<MProject> },
   } = {}) {
      const { getProjectArgs = null } = args;
      this.logger.sLog({}, 'GatewayService::getAllGatwayResources');

      const {
         user,
      } = this.contextFactory.getFullContext();

      const result = await Promise.all([
         this.getProjects(getProjectArgs),
         this.getSharedProjects({ contextUser: user }),
         this.getSharedProjectTokens({ contextUser: user }),
      ])

      return {
         getProjects: result[0],
         getSharedProjects: result[1],
         getSharedProjectTokens: result[2]
      }
   }

   async addProjectUser(
      body: ProjectUserDto
   ) {
      this.logger.sLog({ body }, 'GatewayService::addProjectUser');

      const { projectId, email } = body;

      const {
         user,
      } = this.contextFactory.getFullContext();

      return this.projectService.addUserToProject({
         projectId,
         projectOwnerId: user._id,
         userEmail: email
      })
   }


   async removeProjectUser(
      body: ProjectUserDto
   ) {
      this.logger.sLog({ body }, 'GatewayService::removeProjectUser');

      const { projectId, email } = body;

      const {
         user,
      } = this.contextFactory.getFullContext();

      return this.projectService.removeUserFromProject({
         projectId,
         projectOwnerId: user._id,
         userEmail: email
      })
   }


   async getProjectUsers(
      body: ProjectSlugDto
   ) {
      this.logger.sLog({ body }, 'GatewayService::getProjectUsers');

      const { projectSlug, projectId } = body;

      const {
         user,
      } = this.contextFactory.getFullContext();

      return await this.projectService.getProjectUser({
         projectSlug,
         projectOwnerId: user._id,
         projectId
      })
   }


   async createProject(
      createProjectdto: CreateProjectDto
   ) {
      this.logger.sLog({ createProjectdto }, 'GatewayService::createProject');

      const {
         user,
      } = this.contextFactory.getFullContext();

      return await this.projectService.create(createProjectdto, user.id);
   }
}
