import { Inject, Injectable, Scope } from '@nestjs/common';
import { CustomLogger as Logger } from '@/logger/logger.service';
import { Context, EpCompositeArgs, RecordSpaceWithRecordFields, TraceObject } from '@/types';
import { throwBadRequest } from '@/utils/exceptions';
import { generateJWTToken } from '@/utils/jwt';
import { REQUEST } from '@nestjs/core';
import { EpService } from '@/ep/ep.service';
import { RecordSpacesService } from '@/record-spaces/record-spaces.service';
import { ProjectsService } from '@/projects/projects.service';
import { FunctionDto } from '@/ep/dto/function.dto';
import { ClientHeaderContract, FunctionName } from './resources/types';
import { functionsMetaData, utils } from './resources';
import { validateFields } from '@/ep/utils';
import { contextGetter } from '@/utils';


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
    this.contextFactory = contextGetter(this.context.req, this.logger);

  }


  private contextFactory: ReturnType<typeof contextGetter>;


  async sendOtp(args: Omit<EpFunctionsDataResponse, "functionName">) {
    this.logger.sLog({}, "EpFunctionsService::sendOtp");

    const { receivedBody: { email }, receivedParams, user, recordSpace } = args;
    console.log({ receivedParams });

    const records = this.epService.getRecord({
      params: { projectSlug: receivedParams.projectSlug, recordSpaceSlug: recordSpace.slug },
      query: {
        email
      }
    }, { skipPreOperation: true })


    return records;
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
    }, { skipPreOperation: true });

    const token = generateJWTToken({ details: { id: matchedUser.id } })

    return { token };
  }


  async processFunction(args: EpCompositeArgs<FunctionDto>) {
    this.logger.sLog(
      {
        params: args?.params,
        body: args?.body,
        "context.header": this.context.req.headers
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
    console.log({ a: this.context })

    const headers = this.contextFactory.getValue(["headers"]);
    const user = this.contextFactory.getValue(["user"]);


    const { mustExistSpaceStructures: [recordSpaceStructure, ..._] } = JSON.parse(headers["function-resources"]) as ClientHeaderContract["function-resources"];

    const {
      slug: recordSpaceSlug,
      recordStructure,
      projectSlug: projectSlugOnStructure,
    } = recordSpaceStructure;

    if (projectSlugOnParam !== projectSlugOnStructure) {
      this.logger.sLog({ projectSlugOnParam, projectSlugOnStructure }, "EpFunctions::preOperation:: mismatched projectSlug on param and structure")
      throwBadRequest("Project Slug on Param and Structure is different");
    };

    const functionMetaData = functionsMetaData[functionName];

    const { errors } = validateFields({ recordStructure, fields: receivedBody, logger: this.logger, functionMetaData });

    if (errors.length) {
      this.logger.sLog({ errors }, "EpFunctionsService::PreOperation: throw validation Error")
      throwBadRequest(errors);
    }

    const project = await this.projectService.assertProjectExistence({ projectSlug: projectSlugOnParam, userId: user._id });

    this.context.req.trace.project = project;

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

    this.context.req.trace.recordSpace = updatedRecordSpace || recordSpace;

    return { functionName, project, user, receivedBody, receivedParams, recordSpace: updatedRecordSpace || recordSpace };
  }

}
