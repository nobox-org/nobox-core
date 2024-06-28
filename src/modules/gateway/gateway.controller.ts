import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { GateWayService } from './gateway.service';
import { ProjectUserDto, ProjectSlugDto, CreateProjectDto, RecordSpaceViewBodyDto, AddRecordSpaceViewParamDto, QueryViewDto, LogsQueryDto } from './dto/gen.dto';

@ApiBearerAuth()
@Controller('gateway/*')
export class GatewayController {
   constructor(
      private readonly gatewayService: GateWayService
   ) { }

   @Get('projects')
   getProjects() {
      return this.gatewayService.getProjects();
   }

   @Get('shared-projects')
   getSharedProjects() {
      return this.gatewayService.getSharedProjects();
   }

   @Get('shared-project-tokens')
   getSharedProjectTokens() {
      return this.gatewayService.getSharedProjectTokens();
   }

   @Get('bulk-project-resources')
   getBulkProjectResources() {
      return this.gatewayService.getBulkProjectResources();
   }

   @Get('records-by-recordspace_id')
   getRecordsByRecordspaceId() {
      return this.gatewayService.getSharedProjects();
   }

   @Post('projects/add-user')
   addUserToProject(
      @Body() body: ProjectUserDto,
   ) {
      return this.gatewayService.addProjectUser(body);
   }

   @Post('views/:projectId/:recordSpaceId')
   addView(
      @Param() params: AddRecordSpaceViewParamDto,
      @Body() body: RecordSpaceViewBodyDto,
   ) {
      return this.gatewayService.addRecordSpaceView(params, body);
   }

   @Get('views/:projectId/:recordSpaceId')
   getViews(
      @Param() params: AddRecordSpaceViewParamDto,
   ) {
      return this.gatewayService.getRecordSpaceViews(params);
   }

   @Post('views/:id')
   editView(
      @Param() params: QueryViewDto,
      @Body() body: RecordSpaceViewBodyDto,
   ) {
      return this.gatewayService.editView(params, body);
   }

   @Get('views/:id')
   getView(
      @Param() params: QueryViewDto,
   ) {
      return this.gatewayService.getView(params);
   }


   @Get('logs')
   getLogs(
      @Query() query: LogsQueryDto,
   ) {
      return this.gatewayService.getLogs(query);
   }

   @Post('projects/remove-user')
   removeUserFromProject(
      @Body() body: ProjectUserDto,
   ) {
      return this.gatewayService.removeProjectUser(body);
   }

   @Get('projects/users/:projectId')
   getProjectUsers(
      @Param() query: ProjectSlugDto,
   ) {
      return this.gatewayService.getProjectUsers(query);
   }

   @Post('project')
   createProject(
      @Body() query: CreateProjectDto,
   ) {
      return this.gatewayService.createProject(query);
   }
}
