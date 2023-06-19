import { Inject, Injectable, Scope } from '@nestjs/common';
import { CONTEXT } from '@nestjs/graphql';
import { CustomLogger as Logger } from '@/logger/logger.service';
import { Context } from '@/types';
import { contextGetter } from '@/utils';
import { RecordSpacesService } from '@/record-spaces/record-spaces.service';
import { ProjectsService } from '@/projects/projects.service';
import { MProject, MRecordSpace } from '@/schemas';
import { Filter } from 'mongodb';

@Injectable({ scope: Scope.REQUEST })
export class GateWayService {

  constructor(
    @Inject(CONTEXT) private context: Context,
    private recordSpacesService: RecordSpacesService,
    private projectService: ProjectsService,
    private logger: Logger,
  ) {
    this.contextFactory = contextGetter(this.context.req, this.logger);
  }

  private contextFactory: ReturnType<typeof contextGetter>;

  private GraphQlUserId() {
    this.logger.sLog({}, "GatewayService:GraphQlUserId");
    const user = this.contextFactory.getValue(["user"], { silent: true });
    return user ? user?._id : "";
  }


  async getProjects(query?: Filter<MProject>): Promise<(MProject & {
    recordSpaces: MRecordSpace[];
  })[]> {
    this.logger.sLog({ query }, "GatewayService:findForUser");
    const projects = await this.projectService.find({ ...query, user: this.GraphQlUserId() });
    const projectsWithRecordSpaces = await Promise.all(projects.map(async (project) => {
      const recordSpaces = await this.recordSpacesService.find({ project: project.id });
      return { ...project, recordSpaces };
    }));

    return projectsWithRecordSpaces;
  }
}
