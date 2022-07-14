import { Project } from '@/schemas';
import { Inject, Injectable, Scope } from '@nestjs/common';
import { CONTEXT } from '@nestjs/graphql';
import { CustomLogger as Logger } from 'src/logger/logger.service';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, UpdateQuery } from 'mongoose';
import { CreateProjectInput } from './dto/create-project.input';
import { throwBadRequest } from '@/utils/exceptions';

@Injectable({ scope: Scope.REQUEST })
export class ProjectsService {

  constructor(
    @InjectModel(Project.name) private projectModel: Model<Project>,
    @Inject(CONTEXT) private context,
    private logger: Logger
  ) {
  }

  private GraphQlUserId() {
    const { req } = this.context;
    this.logger.sLog(req.user, "ProjectService:GraphQlUserId");
    return req?.user ? req.user._id : "";
  }

  async create(createProjectInput: CreateProjectInput) {
    this.logger.sLog(createProjectInput, "ProjectService:create");
    const projectExists = await this.projectModel.findOne({ slug: createProjectInput.slug });
    if (projectExists) {
      throwBadRequest("Project with this slug already exists");
    }
    const createdProject = new this.projectModel({ ...createProjectInput, user: this.GraphQlUserId() });
    await createdProject.save();
    this.logger.sLog(CreateProjectInput,
      'ProjectService:create record space details Saved'
    );
    return createdProject;
  }

  async findForUser(query?: FilterQuery<Project>): Promise<Project[]> {
    this.logger.sLog({ query }, "ProjectService:findForUser");
    return this.find({ ...query, user: this.GraphQlUserId() });
  }

  async find(query: FilterQuery<Project> = {}): Promise<Project[]> {
    this.logger.sLog(query, "ProjectService:find");
    return this.projectModel.find(query);
  }

  async findOne(query?: FilterQuery<Project>): Promise<Project> {
    this.logger.sLog(query, "ProjectService:findOne");
    return this.projectModel.findOne(query);
  }

  async update(query?: FilterQuery<Project>, update?: UpdateQuery<Project>): Promise<Project> {
    this.logger.sLog(query, "ProjectService:update");
    return this.projectModel.findOneAndUpdate(query, update, { new: true });
  }

  async remove(query?: FilterQuery<Project>): Promise<void> {
    this.logger.sLog(query, "ProjectService:remove");
    await this.projectModel.deleteOne(query);
  }
}
