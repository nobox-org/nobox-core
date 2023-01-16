import { Inject, Injectable, Scope } from '@nestjs/common';
import { CONTEXT } from '@nestjs/graphql';
import { CustomLogger as Logger } from 'src/logger/logger.service';
import { FindOptions, Filter, OptionalId, UpdateOptions, UpdateFilter } from 'mongodb';
import { CreateProjectInput } from './dto/create-project.input';
import { throwBadRequest } from '@/utils/exceptions';
import { Context } from '@/types';
import { contextGetter } from '@/utils';
import { perfTime } from '@/ep/decorators/perf-time';
import { getProjectModel, MProject } from '@/schemas/slim-schemas/projects.slim.schema';
import { Project } from './entities/project.entity';

@Injectable({ scope: Scope.REQUEST })
export class ProjectsService {
  private projectModel: ReturnType<typeof getProjectModel>;

  constructor(
    @Inject(CONTEXT) private context: Context,
    private logger: Logger
  ) {
    this.contextFactory = contextGetter(this.context.req, this.logger);
    this.projectModel = getProjectModel(this.logger);
  }

  private contextFactory: ReturnType<typeof contextGetter>;

  private GraphQlUserId() {
    this.logger.sLog({}, "ProjectService:GraphQlUserId");
    const user = this.contextFactory.getValue(["user"], { silent: true });
    return user ? user?._id : "";
  }

  async assertCreation(args: { slug: string, userId: string }) {
    this.logger.sLog(args, "ProjectService:assertCreation");
    const { slug, userId } = args;
    const projectExists = await this.projectModel.findOne({ slug, user: userId });
    if (projectExists) {
      throwBadRequest("Project with this slug already exists");
    }
  }

  async create(createProjectInput: CreateProjectInput, userId: string = this.GraphQlUserId()) {
    this.logger.sLog(createProjectInput, "ProjectService:create");
    await this.assertCreation({ slug: createProjectInput.slug, userId });
    const createdProject = await this.projectModel.insert({ ...createProjectInput, user: userId });
    this.logger.sLog(createProjectInput,
      'ProjectService:create project details Saved'
    );
    return createdProject;
  }

  async findForUser(query?: Filter<MProject>): Promise<MProject[]> {
    this.logger.sLog({ query }, "ProjectService:findForUser");
    return this.find({ ...query, user: this.GraphQlUserId() });
  }

  async find(query: any = {}): Promise<Project[]> {
    this.logger.sLog(query, "ProjectService:find");
    query.user = this.GraphQlUserId();
    const projects = await this.projectModel.find({ ...query, ...(query.id ? { _id: query.id } : {}) });
    return projects.map((project) => ({
      id: String(project._id),
      ...project,
    }));
  }

  async findOne(query?: Filter<MProject>): Promise<MProject> {
    this.logger.sLog(query, "ProjectService:findOne");
    const p = await this.projectModel.findOne(query);
    console.log({ p })
    return p;
  }

  async update(query?: Filter<MProject & { _id: string }>, update?: UpdateFilter<MProject>): Promise<MProject> {
    this.logger.sLog({ query, update }, "ProjectService:update");

    if (!query._id && !query.slug) {
      this.logger.sLog({}, "ProjectService:update::error Both id and slug is not set");
      throwBadRequest("id or slug needs to be set");
    }

    if (query._id && query.slug) {
      this.logger.sLog({}, "ProjectService:update You can't update with both id and slug");
      throwBadRequest("You can't update with both id and slug");
    }

    query.user = this.GraphQlUserId()

    const project = await (this.projectModel.findOneAndUpdate(query as any, update, { returnDocument: "after" }) as any);

    if (!project) {
      this.logger.sLog({}, "ProjectService:update: project does not exist");
      throwBadRequest("Project Does not Exist");
    }

    return project;
  }

  async remove(query?: Filter<MProject & { _id: string }>): Promise<void> {
    this.logger.sLog(query, "ProjectService:remove");

    if (query._id && query.slug) {
      throwBadRequest("You can't delete with both id and slug");
    }

    await this.projectModel.deleteOne(query);
  }

  async assertProjectExistence({ projectSlug, userId }: { projectSlug: string, userId: string }, options: { autoCreate: boolean } = { autoCreate: false }) {
    this.logger.sLog({ projectSlug, userId, options }, "ProjectService:assertProjectExistence");
    let project = await this.findOne({ slug: projectSlug, user: userId });
    console.log({ project })
    if (!project) {
      if (!options.autoCreate) {
        throwBadRequest(`Project: ${projectSlug} does not exist`);
      }

      project = await this.create({
        slug: projectSlug,
        name: projectSlug
      }, userId);
    }
    return project;
  }

}
