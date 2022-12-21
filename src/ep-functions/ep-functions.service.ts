import { Inject, Injectable, Scope } from '@nestjs/common';
import { CustomLogger as Logger } from '@/logger/logger.service';
import { allOfAIsInB } from '@/ep/utils/gen';
import { Context, EpCompositeArgs, RecordSpaceWithRecordFields, TraceObject } from '@/types';
import { throwBadRequest } from '@/utils/exceptions';
import { generateJWTToken } from '@/utils/jwt';
import { REQUEST } from '@nestjs/core';
import { EpService } from '@/ep/ep.service';
import { RecordSpacesService } from '@/record-spaces/record-spaces.service';
import { ProjectsService } from '@/projects/projects.service';
import { FunctionDto } from '@/ep/dto/function.dto';
import { ClientHeaderContract, FunctionName } from './resources/types';
import { LoginFunctionResources, SendOtpFunctionResources } from './resources';
import { CreateRecordSpaceInput } from '@/record-spaces/dto/create-record-space.input';
import { validateFieldType } from '@/ep/utils';

interface EpFunctionsDataResponse {
  functionName: FunctionName;
  project: TraceObject["project"];
  recordSpace: TraceObject["recordSpace"];
  user: any;
  receivedBody: Record<string, any>;
  receivedParams: Record<string, any>
}


@Injectable({ scope: Scope.REQUEST })
export class EpFunctionsService {

  constructor(
    private logger: Logger,
    @Inject(REQUEST) private context: Context,
    private recordsSpacesService: RecordSpacesService,
    private projectService: ProjectsService,
    private epService: EpService,
  ) {
  }


  async sendOtp(args: Omit<EpFunctionsDataResponse, "functionName">) {
    this.logger.sLog({}, "EpFunctionsService::sendOtp");

    const { project: { slug: projectSlug, _id: projectId }, user, recordSpace } = args;

    this.context.trace.recordSpace = recordSpace;


  }

  async login(args: Omit<EpFunctionsDataResponse, "functionName">) {
    this.logger.sLog(
      args,
      'EpFunctionsService::login',
    );

    const { recordSpace: { slug: recordSpaceSlug }, project: { slug: projectSlug }, user, receivedBody } = args;

    const matchedUser = await this.epService.getRecord({
      params: {
        recordSpaceSlug,
        projectSlug
      },
      query: receivedBody,
      user
    }, { skipPreOperation: true });

    const token = generateJWTToken({ details: { id: matchedUser.id } })

    return { token };
  }


  async processFunction(args: EpCompositeArgs<FunctionDto>) {
    this.logger.sLog(
      {
        params: args?.params,
        body: args?.body,
        "context.header": this.context.headers
      },
      'EpFunctions:processFunction',
    );
    const { functionName, ...otherPreoperationPayload } = await this.preOperation(args);

    if (functionName === "login") {
      return this.login({ ...otherPreoperationPayload });
    }

    if (functionName === "send-otp") {
      return this.sendOtp({ ...otherPreoperationPayload });
    }
  }

  async preOperation(args: EpCompositeArgs<FunctionDto>): Promise<EpFunctionsDataResponse> {
    this.logger.sLog(args, "EpFunctions::preOperation");

    const { params: receivedParams, body: receivedBody, } = args;
    const { functionName, projectSlug: projectSlugOnParam } = receivedParams;

    const { headers, user } = this.context;

    const { compulsorySpaceStructures: [recordSpaceStructure, ..._] } = JSON.parse(headers["function-resources"]) as ClientHeaderContract["function-resources"];

    const {
      slug: recordSpaceSlug,
      recordStructure,
      projectSlug: projectSlugOnStructure,
    } = recordSpaceStructure;

    if (projectSlugOnParam !== projectSlugOnStructure) {
      this.logger.sLog({ projectSlugOnParam, projectSlugOnStructure }, "EpFunctions::preOperation:: mismatched projectSlug on param and structure")
      throwBadRequest("Project Slug on Param and Structure is different");
    };

    validateFieldType({ recordStructure, fields: receivedBody, logger: this.logger });

    const project = await this.projectService.assertProjectExistence({ projectSlug: projectSlugOnParam, userId: user._id });

    this.context.trace.project = project;

    const recordSpace = await this.recordsSpacesService.findOne({
      query: { slug: recordSpaceSlug },
      user,
      projectSlug: projectSlugOnParam,
      populate: "recordFields",
      projectId: project._id
    }) as RecordSpaceWithRecordFields;


    if (!recordSpace) {
      throwBadRequest(`RecordSpace: ${recordSpaceSlug} does not exist for ${functionName} Function `)
    }

    const updatedRecordSpace = await this.recordsSpacesService.updateRecordSpaceStructureByHash({
      recordSpace,
      recordStructure
    });

    this.context.trace.recordSpace = updatedRecordSpace || recordSpace;


    return { functionName, project, user, receivedBody, receivedParams, recordSpace: updatedRecordSpace || recordSpace };
  }

}
