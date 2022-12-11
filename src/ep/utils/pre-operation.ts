import { CreateRecordSpaceInput } from "@/record-spaces/dto/create-record-space.input";
import { Context, RecordSpaceWithRecordFields } from "@/types";
import { getRecordStructureHash } from "@/utils";
import { throwBadRequest } from "@/utils/exceptions";
import { validateFieldType } from "./validate-field-type";
import { CustomLoggerInstance as Logger } from "@/logger/logger.service";
import { isEmpty } from "lodash";
import { RecordSpacesService } from "@/record-spaces/record-spaces.service";
import { EpService } from "../ep.service";


export const preOperation = async (args: any[], epService: any) => {
    try {
        const { context, logger, recordSpacesService, assertProjectExistence } = epService;
        const { args, headers, params, query, body, user, trace } = context;
        logger.sLog(
            { args, query, params, headers, user, body, trace },
            'EpService:preOperation'
        );

        const userId = user._id;

        const { "auto-create-project": autoCreateProject, "auto-create-record-space": autoCreateRecordSpace, structure, options } = headers;

        if (options) {
            context.trace.clientCall = { options: JSON.parse(options) };
        }

        const fieldsToConsider = !isEmpty(query) ? query : body;

        const { isQuery: requestIsAQuery } = trace;

        if (!requestIsAQuery && isEmpty(fieldsToConsider)) {
            logger.sLog({ query, body }, "EpService:preOperation:: Both query and body parameters are empty");
            throwBadRequest("Absent Fields");
        }


        if (autoCreateProject === 'true') {

            if (!structure) {
                throwBadRequest("Structure is absent")
            }

            const objectifiedStructure = JSON.parse(
                structure,
            ) as CreateRecordSpaceInput;

            const {
                slug: recordSpaceSlug,
                recordStructure,
                projectSlug,
            } = objectifiedStructure;

            const project = await assertProjectExistence({ projectSlug, userId })

            validateFieldType({ recordStructure, fields: fieldsToConsider, logger });

            const { _id: projectId } = project;

            const recordSpace = await recordSpacesService.findOne({
                query: { slug: recordSpaceSlug },
                user,
                projectSlug,
                populate: "recordFields",
                projectId
            }) as RecordSpaceWithRecordFields;

            const recordSpaceExists = !!recordSpace;

            logger.sLog(
                { recordSpaceExists },
                'EpService::preOperation;create:true',
            );

            let latestRecordSpace = recordSpace;

            switch (recordSpaceExists) {
                case false: {
                    latestRecordSpace = await recordSpacesService.create(
                        objectifiedStructure as CreateRecordSpaceInput,
                        userId,
                        projectId,
                        true
                    );
                    break;
                }
                default: {
                    const { recordStructureHash: existingRecordStructureHash } = recordSpace
                    const presentRecordStructureHash = getRecordStructureHash(recordStructure);

                    const newRecordStructureIsDetected = existingRecordStructureHash !== presentRecordStructureHash;
                    logger.sLog({ new: recordStructure, existingRecordStructureHash, presentRecordStructureHash }, newRecordStructureIsDetected ? "newRecordStructure detected" : "same old recordStructure");


                    if (newRecordStructureIsDetected) {
                        latestRecordSpace = await recordSpacesService.createFieldsFromNonIdProps(
                            {
                                recordSpaceSlug,
                                recordStructure,
                                projectSlug,
                            },
                            user,
                            recordSpace,
                        );
                    }

                    break;
                }
            }
            context.trace.recordSpace = latestRecordSpace;
        }
    } catch (error) {
        console.log('EpService::preOperation:error', error);
        throwBadRequest(error);
    }
}