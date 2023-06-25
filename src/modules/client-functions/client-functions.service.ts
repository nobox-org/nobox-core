import { Inject, Injectable, Scope } from '@nestjs/common';
import { CustomLogger as Logger } from '@/modules/logger/logger.service';
import { CObject, Context, ClientCompositeArgs, TraceObject } from '@/types';
import { throwBadRequest } from '@/utils/exceptions';
import { generateJWTToken } from '@/utils/jwt';
import { REQUEST } from '@nestjs/core';
import { ClientService } from '@/modules/client/client.service';
import { RecordSpacesService } from '@/modules/record-spaces/record-spaces.service';
import { FunctionDto } from '@/modules/client/dto/function.dto';
import { FunctionName } from './resources/types';
import { functionsMetaData, utils } from './resources';
import { validateFields } from '@/modules/client/utils';
import { contextGetter } from '@/utils';
import { randomNumbers } from '@/utils/randomCardCode';
import { EmailTemplate } from './resources/utils/email/types';
import { epFunctionBodyValidation } from '@/utils/client-function-body-payload-check';
import { getFirebaseAdminInstance } from '@/utils/firebase-admin';
import { ProjectsService } from '@/modules/projects/projects.service';

interface ClientFunctionsEndpointsDataResponse {
  functionName: FunctionName;
  project: TraceObject["project"];
  recordSpace: TraceObject["recordSpace"];
  user: any;
  receivedBody: Record<string, any>;
  receivedParams: Record<string, any>;
  functionResources: any;
}


@Injectable({ scope: Scope.REQUEST })
export class ClientFunctionsService {

  constructor(
    private logger: Logger,
    @Inject(REQUEST) private context: Context,
    private recordSpaceService: RecordSpacesService,
    private projectsService: ProjectsService,
    private epService: ClientService,
  ) {
    this.contextFactory = contextGetter(this.context.req, this.logger);
  }

  private contextFactory: ReturnType<typeof contextGetter>;

  async sendPushNotification(args: Omit<ClientFunctionsEndpointsDataResponse, "functionName">) {
    this.logger.sLog({}, "ClientFunctionsService::sendPushNotifications");

    const { receivedBody, receivedParams, recordSpace, project, functionResources: {
      mustExistSpaceStructures: [{ functionOptions }]
    } } = args;

    const latestProject = await this.projectsService.findOne({ _id: project._id })

    const { keys } = latestProject;

    if (!keys) {
      this.logger.sLog({}, "ClientFunctionsService::sendPushNotification::No API keys are found")
      throwBadRequest("No API keys are found, Please update your project keys");
    }

    const { firebase } = keys;

    if (!firebase) {
      this.logger.sLog({}, "ClientFunctionsService::sendPushNotification::No Firebase keys were found")
      throwBadRequest("No firebase API key is found");
    };

    const { privateKey, projectId, clientEmail } = firebase;

    const firebaseAdmin = getFirebaseAdminInstance({
      projectId,
      clientEmail,
      privateKey,
      logger: this.logger,
    });

    const firebaseMessaging = firebaseAdmin.messaging();

    const { body, findBy } = receivedBody;

    epFunctionBodyValidation({
      body: receivedBody.body,
      logger: this.logger,
      compulsoryParams: ["title", "content"]
    });

    const { title, content } = body;

    let fcmToken = body.fcmToken;


    if (!findBy && !fcmToken) {
      this.logger.sLog({}, "ClientFunctionsService::sendPushNotification::No findBy parameter is found, and no fcmToken is found")
      throwBadRequest("No findBy parameter is found, and no fcmToken is found, please set one of them");
    }

    if (findBy) {
      const record = await this.epService.getRecord({
        params: { projectSlug: receivedParams.projectSlug, recordSpaceSlug: recordSpace.slug },
        query: { ...findBy },
      }, { skipPreOperation: true },
      )

      if (!record) {
        this.logger.sLog({}, "ClientFunctionsService::sendPushNotification::No record is found using findBy parameter")
        throwBadRequest("No record is found using findBy parameter");
      }

      fcmToken = (record as CObject).fcmToken;

      if (!fcmToken) {
        this.logger.sLog({}, "ClientFunctionsService::sendPushNotification::No fcmToken is found in the chosen space record")
        throwBadRequest("No fcmToken is found in the chosed space record");
      }
    }

    this.logger.sLog({ fcmToken, title, body }, "ClientFunctionsService::sendPushNotification::Sending notification")

    const response = await firebaseMessaging.send({
      token: fcmToken,
      notification: {
        title,
        body,
      }
    });

    this.logger.sLog({ response }, "ClientFunctionsService::sendPushNotification::Notification sent")

    return { success: true };
  }

  async sendOtp(args: Omit<ClientFunctionsEndpointsDataResponse, "functionName">) {
    this.logger.sLog({}, "ClientFunctionsService::sendOtp");

    const { receivedBody, receivedParams, recordSpace, functionResources, project } = args;

    const { keys } = project;

    if (!keys) {
      this.logger.sLog({}, "ClientFunctionsService::sendOtp::No API keys are found")
      throwBadRequest("No API keys are found");
    }

    const { postmark } = keys;

    if (!postmark) {
      this.logger.sLog({}, "ClientFunctionsService::sendOtp::No Postmark API key is found")
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
      this.logger.sLog({ error }, "ClientFunctionsService::sendOtp::Error sending email")
    })

    return { success: true };
  }

  async login(args: Omit<ClientFunctionsEndpointsDataResponse, "functionName">) {
    this.logger.sLog(
      args,
      'ClientFunctionsService::login',
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

    epFunctionBodyValidation({
      compulsoryParams,
      body: compulsoryParams,
      logger: this.logger,
    })

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


  async processFunction(args: ClientCompositeArgs<FunctionDto>) {
    this.logger.sLog(
      {
        params: args?.params,
        body: args?.body,
        "context.header": this.context.req.headers
      },
      'ClientFunctionsEndpoints:processFunction',
    );
    const { functionName, ...otherPreoperationPayload } = await this.preOperation(args);

    if (functionName === "login") {
      return this.login({ ...otherPreoperationPayload });
    }

    if (functionName === "send-otp") {
      return this.sendOtp({ ...otherPreoperationPayload });
    }

    if (functionName === "send-push-notification") {
      return this.sendPushNotification({ ...otherPreoperationPayload });
    }
  }

  async preOperation(args: ClientCompositeArgs<FunctionDto>): Promise<ClientFunctionsEndpointsDataResponse> {
    this.logger.sLog(args, "ClientFunctionsEndpoints::preOperation");

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

  private async _prepareOperationDetails(args: ClientCompositeArgs<FunctionDto>) {
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
      this.logger.sLog({ projectSlugOnParam, projectSlugOnStructure }, "ClientFunctionsEndpoints::preOperation:: mismatched projectSlug on param and structure")
      throwBadRequest("Project Slug on Param and SpaceStructure is different");
    };

    const functionMetaData = functionsMetaData[functionName];

    const { errors } = validateFields({ recordStructure, fields: receivedBody, logger: this.logger, functionMetaData });

    if (errors.length) {
      this.logger.sLog({ errors }, "ClientFunctionsService::PreOperation: throw validation Error")
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

    this.logger.sLog({ resources }, "ClientFunctionsEndpoints::preOperation::resources", "bgYellow");

    return resources;
  }
}