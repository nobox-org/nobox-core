import { HttpException, HttpStatus, Inject, Injectable, Scope } from '@nestjs/common';
import { CustomLogger as Logger } from '@/modules/logger/logger.service';
import { Context } from '@/types';
import { contextGetter } from '@/utils';
import { RecordSpacesService } from '@/modules/record-spaces/record-spaces.service';
import { ProjectsService } from '@/modules/projects/projects.service';
import { Filter, MProject, MRecordSpace, ObjectId } from "nobox-shared-lib";
import { ProjectUserDto, ProjectSlugDto, CreateProjectDto, AddRecordSpaceViewParamDto, RecordSpaceViewBodyDto, QueryViewDto, LogsQueryDto } from './dto/gen.dto';
import { UserService } from '../user/user.service';
import { Project } from '../projects/entities/project.entity';

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

      return this.addViewsAndRecordSpaces(projects);
   }

   private async addViewsAndRecordSpaces(projects: Project[]) {
      this.logger.sLog({}, 'GatewayService::addViewsAndRecordSpaces');

      const projectsWithRecordSpaces = await Promise.all(
         projects.map(async project => {
            const recordSpaces = await this.recordSpacesService.find({
               project: project.id,
            });

            const views = await this.recordSpacesService.getProjectViews({ projectId: project.id });

            const recordSpacesWithViews = views
               ? recordSpaces.map(recordSpace => {
                  const filteredViews = views.filter(
                     view => view.recordSpaceId === String(recordSpace._id),
                  );
                  return { ...recordSpace, views: filteredViews };
               })
               : recordSpaces;

            return {
               ...project,
               recordSpaces: recordSpacesWithViews,
            };
         })
      );

      return projectsWithRecordSpaces;
   }

   async getSharedProjects({ contextUser }: { contextUser?: any } = {}) {
      this.logger.sLog({}, 'GatewayService::getSharedProjects');
      const user = contextUser ?? this.contextFactory.getFullContext().user;
      const projects = await this.projectService.findSharedProjects({ email: user.email });
      return this.addViewsAndRecordSpaces(projects);
   }

   async getSharedProjectTokens({ contextUser }: { contextUser?: any } = {}) {
      this.logger.sLog({}, 'GatewayService::getSharedProjects');

      const user = contextUser ?? this.contextFactory.getFullContext().user;

      const projects = await this.projectService.findSharedProjects({ email: user.email });
      const sharedProjectTokens = Promise.all(projects.map(async project => {
         const { user, id } = project;
         const userDetails = await this.userService.getUserDetails({ _id: new ObjectId(user) });
         return {
            projectId: id,
            projectToken: userDetails?.apiToken?.token ?? ""
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

   async addRecordSpaceView(
      params: AddRecordSpaceViewParamDto,
      body: RecordSpaceViewBodyDto,
   ) {
      this.logger.sLog({ body, params }, 'GatewayService::addRecordSpaceView');
      const { recordSpaceId, projectId } = params;
      const { data } = body;

      await this.assertRecordSpaceExistence({
         recordSpaceId,
         projectId
      });

      const response = await this.recordSpacesService.addView({
         recordSpaceId,
         data,
         projectId
      });

      return response;
   }

   async getView(
      params: QueryViewDto
   ) {
      this.logger.sLog({ params }, 'GatewayService::addRecordSpaceView');
      const { id } = params;

      const response = await this.recordSpacesService.getViewById(id);
      return response;
   }


   async getLogs(
      query: LogsQueryDto
   ) {
      this.logger.sLog({ query }, 'GatewayService::getLogs');
      const { projectId, recordSpaceId, recordId } = query;

      // const response = await this.recordSpacesService.getViewById(id);
      // return response;
   }


   async assertRecordSpaceExistence(args: {
      recordSpaceId: string;
      projectId: string
   }) {
      const { recordSpaceId, projectId } = args

      const recordSpaceExist = await this.recordSpacesService.findOne({
         query: {
            _id: new ObjectId(recordSpaceId),
            project: projectId
         }
      });

      if (!recordSpaceExist) {
         throw new HttpException('Record space does not exist', HttpStatus.BAD_REQUEST)
      }
   }

   async getRecordSpaceViews(
      params: AddRecordSpaceViewParamDto,
   ) {
      this.logger.sLog({ params }, 'GatewayService::getRecordSpaceView');
      const { recordSpaceId, projectId } = params;

      await this.assertRecordSpaceExistence({
         recordSpaceId,
         projectId
      })

      const response = await this.recordSpacesService.getRecordSpaceViews({
         recordSpaceId,
         projectId
      });

      return response;
   }

   async editView(
      params: QueryViewDto,
      body: RecordSpaceViewBodyDto
   ) {
      this.logger.sLog({ params, body }, 'GatewayService::editView');
      const { id } = params;
      const { data } = body;
      const response = await this.recordSpacesService.editView(id, data);
      return response;
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


   async sendMail() {
    //   this.logger.sLog({}, 'ClientUtilsService::getEmbedding');
      return {
         message: 'This endpoint works'
      };
    }
}
