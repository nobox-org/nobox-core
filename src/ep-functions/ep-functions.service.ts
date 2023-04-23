import { Inject, Injectable, Scope } from '@nestjs/common';
import { CustomLogger as Logger } from '@/logger/logger.service';
import { Context, EpCompositeArgs, TraceObject } from '@/types';
import { throwBadRequest } from '@/utils/exceptions';
import { generateJWTToken } from '@/utils/jwt';
import { REQUEST } from '@nestjs/core';
import { EpService } from '@/ep/ep.service';
import { RecordSpacesService } from '@/record-spaces/record-spaces.service';
import { FunctionDto } from '@/ep/dto/function.dto';
import { FunctionName } from './resources/types';
import { functionsMetaData, utils } from './resources';
import { validateFields } from '@/ep/utils';
import { contextGetter } from '@/utils';
import { randomNumbers } from '@/utils/randomCardCode';
import { EmailTemplate } from './resources/utils/email/types';


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
    private epService: EpService,
  ) {
    this.contextFactory = contextGetter(this.context.req, this.logger);
  }

  private contextFactory: ReturnType<typeof contextGetter>;

  async sendOtp(args: Omit<EpFunctionsDataResponse, "functionName">) {
    this.logger.sLog({}, "EpFunctionsService::sendOtp");

    const { receivedBody, receivedParams, recordSpace, functionResources, project } = args;

    const { keys } = project;

    if (!keys) {
      this.logger.sLog({}, "EpFunctionsService::sendOtp::No API keys are found")
      throwBadRequest("No API keys are found");
    }

    const { postmark } = keys;

    if (!postmark) {
      this.logger.sLog({}, "EpFunctionsService::sendOtp::No Postmark API key is found")
      throwBadRequest("No Postmark API key is found");
    };

    const { apiKey: postmarkApiKey, senderEmail } = postmark;

    const otp = randomNumbers(6);

    const record = await this.epService.updateRecord({
      params: { projectSlug: receivedParams.projectSlug, recordSpaceSlug: recordSpace.slug },
      query: receivedBody,
      update: {
        otp
      },
      options: { skipPreOperation: true },
    })

    const { receiverEmailField, receiverHiNameField } = functionResources;

    const receiverEmail = record[receiverEmailField];
    const receiverName = record[receiverHiNameField];

    const { name: projectName, siteUrl: projectSiteUrl = "", businessDetails: { name: projectBusinessName, address: projectBusinessAddress } } = project;

    utils.sendEmail({
      recipient: { email: receiverEmail },
      sender: { email: senderEmail },
      templateType: EmailTemplate.OTP,
      variables: {
        "product_name": projectName,
        "product_url": projectSiteUrl,
        "hi_name": receiverName,
        "support_url": projectSiteUrl,
        "otp": otp,
        "company_name": projectBusinessName,
        "company_address": projectBusinessAddress,
        "present_year": new Date().getFullYear()
      },
      apiKey: postmarkApiKey,
      logger: this.logger,
    }).catch((error: any) => {
      this.logger.sLog({ error }, "EpFunctionsService::sendOtp::Error sending email")
    })

    return { success: true };
  }

  async login(args: Omit<EpFunctionsDataResponse, "functionName">) {
    this.logger.sLog(
      args,
      'EpFunctionsService::login',
    );

    const {
      recordSpace: { slug: recordSpaceSlug },
      project: { slug: projectSlug },
      receivedBody,
      functionResources: {
        mustExistSpaceStructures: [{ functionOptions }]
      }
    } = args;

    const compulsoryParams = functionOptions?.login?.compulsoryParams

    if (compulsoryParams) {
      const sentKeys = Object.keys(receivedBody);
      for (let i = 0; i < compulsoryParams.length; i++) {
        const compulsoryParam = compulsoryParams[i];
        if (!sentKeys.includes(compulsoryParam)) {
          throwBadRequest(`Missing compulsory parameter: "${compulsoryParam}" for login function`);
        }
      }
    }
    const recordSpace = this.contextFactory.getValue(["trace", "recordSpace"]);
    const matchedUser = await this.epService.getRecord({
      params: {
        recordSpaceSlug,
        projectSlug
      },
      query: receivedBody,
    }, {
      skipPreOperation: true,
      recordSpace,
    });

    const token = generateJWTToken({ details: { id: matchedUser?.id } })

    return { token, user: matchedUser };
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

    const { functionName, projectSlug, incomingRecordSpaceStructure, user, receivedBody, receivedParams, functionResources, mutate, clearAllRecordSpaces } = await this._prepareOperationDetails(args);

    const { recordStructure, slug: recordSpaceSlug, clear: clearThisRecordSpace, initialData } = incomingRecordSpaceStructure;

    const { project, recordSpace } = await this.recordSpaceService.handleRecordSpaceMutationInPreOperation({
      recordSpaceSlug,
      projectSlug,
      autoCreateRecordSpace: true,
      recordStructure,
      userId: user._id,
      incomingRecordSpaceStructure,
      autoCreateProject: true,
      allowMutation: mutate
    });

    const hydratedRecordSpace = this.contextFactory.assignRecordSpace(recordSpace);
    this.context.req.trace.recordSpace = hydratedRecordSpace;
    this.context.req.trace.project = project;

    if (mutate) {
      await this.epService.preOperationMutation({
        operationResources: {
          project,
          recordSpace,
          clearThisRecordSpace,
          initialData,
          clearAllRecordSpaces,
          mutate,
        }, params: {
          projectSlug,
          recordSpaceSlug
        }
      });
    };

    return { functionResources, functionName, user, project, receivedBody, receivedParams, recordSpace: hydratedRecordSpace };
  }

  private async _prepareOperationDetails(args: EpCompositeArgs<FunctionDto>) {
    const { params: receivedParams, body: receivedBody, } = args;
    const { functionName, projectSlug: projectSlugOnParam } = receivedParams;

    const functionResources = this.contextFactory.getValue(["headers", "functionResources"]);
    const { mutate, "clear-all-spaces": clearAllRecordSpaces } = this.contextFactory.getValue(["headers"]);

    const user = this.contextFactory.getValue(["user"]);

    const { mustExistSpaceStructures: [incomingRecordSpaceStructure, ..._] } = functionResources;

    const {
      recordStructure,
      projectSlug: projectSlugOnStructure,
      functionOptions,
      clear: clearThisRecordSpace
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

    const resources = {
      functionName,
      projectSlug: projectSlugOnParam,
      incomingRecordSpaceStructure,
      user,
      functionResources,
      receivedBody,
      receivedParams,
      functionOptions,
      mutate: mutate === "true",
      clearAllRecordSpaces: clearAllRecordSpaces === "true",
      clearThisRecordSpace
    };

    this.logger.sLog({ resources }, "EpFunctions::preOperation::resources", "bgYellow");

    return resources;
  }
}