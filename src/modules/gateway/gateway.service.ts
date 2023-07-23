import { Inject, Injectable, Scope } from '@nestjs/common';
import { CustomLogger as Logger } from '@/modules/logger/logger.service';
import { Context } from '@/types';
import { contextGetter } from '@/utils';
import { RecordSpacesService } from '@/modules/record-spaces/record-spaces.service';
import { ProjectsService } from '@/modules/projects/projects.service';
import { MProject, MRecordSpace } from '@/schemas';
import { Filter } from 'mongodb';
import { ProjectUserDto, ProjectSlugDto } from './dto/gen.dto';
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

   async getSharedProjects() {
      this.logger.sLog({}, 'GatewayService::getSharedProjects');

      const {
         user,
      } = this.contextFactory.getFullContext();

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

   async getSharedProjectTokens() {
      this.logger.sLog({}, 'GatewayService::getSharedProjects');

      const {
         user,
      } = this.contextFactory.getFullContext();

      const projects = await this.projectService.findSharedProjects({ email: user.email });
      const sharedProjectTokens = Promise.all(projects.map(async project => {
         const { user, id } = project;
         const userDetails = await this.userService.getUser({ _id: user });
         const token = generateJWTToken({ details: userDetails });
         return {
            projectId: id,
            projectToken: token
         };
      }));

      return sharedProjectTokens;
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
}
