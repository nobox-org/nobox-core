import { Inject, Injectable, Scope } from '@nestjs/common';
import { CustomLogger as Logger } from '@/logger/logger.service';
import { Context, EpCompositeArgs, TraceObject } from '@/types';
import { throwBadRequest } from '@/utils/exceptions';
import { generateJWTToken } from '@/utils/jwt';
import { REQUEST } from '@nestjs/core';
import { EpService } from '@/ep/ep.service';
import { RecordSpacesService } from '@/record-spaces/record-spaces.service';
import { ProjectsService } from '@/projects/projects.service';
import { FunctionDto } from '@/ep/dto/function.dto';
import { FunctionName } from './resources/types';
import { functionsMetaData, utils } from './resources';
import { validateFields } from '@/ep/utils';
import { contextGetter } from '@/utils';
import { EmailTemplate } from './resources/utils/email/types';
import { randomNumbers } from '@/utils/randomCardCode';


interface EpFunctionsDataResponse {
  functionName: FunctionName;
  project: TraceObject["project"];
  recordSpace: TraceObject["recordSpace"];
  user: any;
  receivedBody: Record<string, any>;
  receivedParams: Record<string, any>;
  functionResources: any;
}


@Injectable({ scope: Scope.REQUEST })
export class EpFunctionsService {

  constructor(
    private logger: Logger,
    @Inject(REQUEST) private context: Context,
    private recordSpaceService: RecordSpacesService,
    private projectService: ProjectsService,
    private epService: EpService,
  ) {
    this.contextFactory = contextGetter(this.context.req, this.logger);
  }


  private contextFactory: ReturnType<typeof contextGetter>;


  async sendOtp(args: Omit<EpFunctionsDataResponse, "functionName">) {
    this.logger.sLog({}, "EpFunctionsService::sendOtp");

    const { receivedBody, receivedParams, recordSpace, functionResources, project } = args;

    const { keys: { postmark: { apiKey: postmarkApiKey, senderEmail } } } = project;

    if (!postmarkApiKey) {
      this.logger.sLog({}, "EpFunctionsService::sendOtp::No apiKey found")
      throwBadRequest("No apiKey found");
    }

    const record = await this.epService.getRecord({
      params: {
        projectSlug: receivedParams.projectSlug,
        recordSpaceSlug: recordSpace.slug
      },
      query: { ...receivedBody }
    }, {
      skipPreOperation: true,
      idOnly: true,
    });


    const otp = randomNumbers(6);

    const { id: recordId } = record;

    const records = await this.epService.updateRecord(recordId, { projectSlug: receivedParams.projectSlug, recordSpaceSlug: recordSpace.slug },
      {
        otp
      }, { skipPreOperation: true });

    const { receiverEmailField, receiverHiNameField } = functionResources;

    const receiverEmail = records[receiverEmailField];
    const receiverName = records[receiverHiNameField];

    const { name: projectName, siteUrl: projectSiteUrl = "", businessDetails: { name: projectBusinessName, address: projectBusinessAddress } } = project;

    // utils.sendEmail({
    //   recipient: { email: receiverEmail },
    //   sender: { email: senderEmail },
    //   templateType: EmailTemplate.OTP,
    //   variables: {
    //     "product_name": projectName,
    //     "product_url": projectSiteUrl,
    //     "hi_name": receiverName,
    //     "support_url": projectSiteUrl,
    //     "otp": otp,
    //     "company_name": projectBusinessName,
    //     "company_address": projectBusinessAddress,
    //     "present_year": new Date().getFullYear()
    //   },
    //   apiKey: postmarkApiKey,
    //   logger: this.logger,
    // }).catch((error: any) => {
    //   this.logger.sLog({ error }, "EpFunctionsService::sendOtp::Error sending email")
    // })

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

    const functionResources = this.contextFactory.getValue(["headers", "functionResources"]);
    const user = this.contextFactory.getValue(["user"]);


    const { mustExistSpaceStructures: [incomingRecordSpaceStructure, ..._] } = functionResources;

    const {
      recordStructure,
      projectSlug: projectSlugOnStructure,
    } = incomingRecordSpaceStructure;

    if (projectSlugOnParam !== projectSlugOnStructure) {
      this.logger.sLog({ projectSlugOnParam, projectSlugOnStructure }, "EpFunctions::preOperation:: mismatched projectSlug on param and structure")
      throwBadRequest("Project Slug on Param and SpaceStructure is different");
    };

    const functionMetaData = functionsMetaData[functionName];

    const { errors } = validateFields({ recordStructure, fields: receivedBody, logger: this.logger, functionMetaData });

    if (errors.length) {
      this.logger.sLog({ errors }, "EpFunctionsService::PreOperation: throw validation Error")
      throwBadRequest(errors);
    }

    const project = await this.projectService.assertProjectExistence({ projectSlug: projectSlugOnParam, userId: user._id });

    this.context.req.trace.project = project;

    const latestRecordSpace = await this.recordSpaceService.createOrUpdateRecordSpace({
      user,
      project,
      latestRecordSpaceInputDetails: incomingRecordSpaceStructure
    });

    this.context.req.trace.recordSpace = latestRecordSpace;

    return { functionResources, functionName, project, user, receivedBody, receivedParams, recordSpace: latestRecordSpace };
  }
}
