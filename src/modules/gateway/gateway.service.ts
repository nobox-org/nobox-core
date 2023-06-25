import { Inject, Injectable, Scope } from '@nestjs/common';
import { CustomLogger as Logger } from '@/modules/logger/logger.service';
import { Context } from '@/types';
import { contextGetter } from '@/utils';
import { RecordSpacesService } from '@/modules/record-spaces/record-spaces.service';
import { ProjectsService } from '@/modules/projects/projects.service';
import { MProject, MRecordSpace } from '@/schemas';
import { Filter } from 'mongodb';

@Injectable({ scope: Scope.REQUEST })
export class GateWayService {

  constructor(
    @Inject("REQUEST") private context: Context,
    private recordSpacesService: RecordSpacesService,
    private projectService: ProjectsService,
    private logger: Logger,
  ) {
    this.contextFactory = contextGetter(this.context.req, this.logger);
  }

  private contextFactory: ReturnType<typeof contextGetter>;

  private UserIdFromContext() {
    this.logger.sLog({}, "GatewayService:UserIdFromContext");
    const user = this.contextFactory.getValue(["user"], { silent: true });
    return user ? user?._id : "";
  }


  async getProjects(query?: Filter<MProject>): Promise<(MProject & {
    recordSpaces: MRecordSpace[];
  })[]> {
    this.logger.sLog({ query }, "GatewayService:findForUser");
    const projects = await this.projectService.find({ ...query, user: this.UserIdFromContext() });
    const projectsWithRecordSpaces = await Promise.all(projects.map(async (project) => {
      const recordSpaces = await this.recordSpacesService.find({ project: project.id });
      return { ...project, recordSpaces };
    }));

    return projectsWithRecordSpaces;
  }
}
