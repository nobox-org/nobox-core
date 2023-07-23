import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { GateWayService } from './gateway.service';
import { ProjectUserDto, ProjectSlugDto } from './dto/gen.dto';

@ApiBearerAuth()
@Controller('gateway/*')
export class GatewayController {
   constructor(private readonly gatewayService: GateWayService) { }

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

   @Post('projects/add-user')
   addUserToProject(
      @Body() body: ProjectUserDto,
   ) {
      return this.gatewayService.addProjectUser(body);
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
}
