
import { Inject, Injectable, Scope } from '@nestjs/common';
import { isEmpty } from 'lodash';
import fnv from 'fnv-plus';
import { RecordSpacesService } from '@/record-spaces/record-spaces.service';
import { CustomLogger as Logger } from '@/logger/logger.service';
import { throwBadRequest } from '@/utils/exceptions';
import { RecordsService } from '@/records/records.service';
import {
    formatRecordForEpResponse,
    prepareRecordQuery,
    prepareRecordDocument,
    validateInBulk,
} from './utils';
import { MongoDocWithTimeStamps, PreOperationPayload, RecordSpaceWithRecordFields, RequestWithEmail } from '@/types';
import { isMongoId, isNotEmpty } from 'class-validator';
import { User } from '../user/graphql/model';
import { BaseRecordSpaceSlugDto } from './dto/base-record-space-slug.dto';
import { handleOperation } from './decorators/handleOperation';
import { CONTEXT } from '@nestjs/graphql';
import { CreateRecordSpaceInput } from '@/record-spaces/dto/create-record-space.input';
import { RecordStructureType } from '@/record-spaces/dto/record-structure-type.enum';
import { getRecordStructureHash } from '../utils';
import { ProjectsService } from '@/projects/projects.service';

const PRE_OPERATION_PAYLOAD = "_preOperationPayload_";

@Injectable({ scope: Scope.REQUEST })
@handleOperation()
export class EpService {
    constructor(
        @Inject(CONTEXT) private context,
        private recordSpacesService: RecordSpacesService,
        private projectService: ProjectsService,
        private recordsService: RecordsService,
        private logger: Logger,
    ) { }


    private preOperationPayload: PreOperationPayload;

    async getRecords(args: {
        params: { recordSpaceSlug: string; projectSlug: string };
        query: Record<string, string>;
        user: User;
    }) {
        this.logger.sLog(args, 'EpService:getRecords');
        const {
            params: { recordSpaceSlug, projectSlug },
            query,
            user,
        } = args;

        const { preparedRecordQuery } = await this.prepare({ recordQuery: query, user, acrossRecords: true });

        const records = await this.recordsService.getRecords({
            query: preparedRecordQuery,
            recordSpaceSlug,
            projectSlug,
            userId: user._id,
        });
        if (!records) {
            throwBadRequest(
                `No records found for project: ${projectSlug}, recordSpaceSlug: ${recordSpaceSlug}`,
            );
        }
        return records.map(formatRecordForEpResponse);
    }

    async deleteRecord(
        recordSpaceSlug: string,
        projectSlug: string,
        recordId: string,
        req: RequestWithEmail,
    ) {
        this.logger.sLog(
            { recordSpaceSlug, recordId, userId: req.user._id },
            'EpService:deleteRecord',
        );
        validateInBulk(
            [
                { validation: isNotEmpty, message: 'should be Defined' },
                { validation: isMongoId, message: 'should be a mongoid' },
            ],
            { recordId, userId: req.user._id },
        );
        return this.recordsService.deleteRecord(
            recordId,
            { slug: recordSpaceSlug },
            projectSlug,
            req.user,
        );
    }

    async getRecord(args: {
        params: { recordSpaceSlug: string; projectSlug: string };
        query: Record<string, string>;
        user: User;
    }) {
        this.logger.sLog(args, 'EpService:getRecord');

        const {
            params: { recordSpaceSlug, projectSlug },
            query,
            user,
        } = args;

        const { preparedRecordQuery } = await this.prepare({ recordQuery: query, user });

        const record = await this.recordsService.getRecord({
            query: preparedRecordQuery,
            recordSpaceSlug,
            projectSlug,
            userId: user._id,
            _recordSpace: this.preOperationPayload.recordSpace
        });

        if (!record) {
            throwBadRequest(
                `No record found for project: ${projectSlug}, recordSpaceSlug: ${recordSpaceSlug}`,
            );
        }
        return formatRecordForEpResponse(
            record as MongoDocWithTimeStamps<typeof record>,
        );
    }

    async addRecords(
        recordSpaceSlug: string,
        projectSlug: string,
        bodyArray: Record<string, string>[],
        req: RequestWithEmail,
    ) {
        this.logger.sLog({ recordSpaceSlug, bodyArray }, 'EpService:addRecord');
        if (!Array.isArray(bodyArray)) {
            throwBadRequest(`Body must be an array`);
        }

        if (bodyArray.length === 0) {
            throwBadRequest(`Array should not be empty`);
        }

        return Promise.all(
            bodyArray.map(body =>
                this.addRecord(recordSpaceSlug, projectSlug, body, req),
            ),
        );
    }

    async addRecord(
        recordSpaceSlug: string,
        projectSlug: string,
        body: Record<string, string>,
        req: RequestWithEmail,
    ) {
        this.logger.sLog(
            { recordSpaceSlug, projectSlug, body, user: req.user },
            'EpService:addRecord',
        );

        if (Array.isArray(body)) {
            throwBadRequest(`Body can't be an array`);
        }

        if (Object.keys(body).length === 0) {
            throwBadRequest(`Body should not be empty`);
        }

        const { preparedRecordDocument } = await this.prepare(
            { recordDocument: body, user: req.user },
        );

        const record = await this.recordsService.create(
            { ...preparedRecordDocument, recordSpaceSlug, projectSlug },
            req.user._id,
            this.preOperationPayload.recordSpace
        );
        if (!record) {
            throwBadRequest(`No record found for ${recordSpaceSlug}`);
        }
        return formatRecordForEpResponse(
            record as MongoDocWithTimeStamps<typeof record>,
        );
    }

    async updateRecord(
        id: string,
        { recordSpaceSlug, projectSlug }: BaseRecordSpaceSlugDto,
        body: Record<string, string>,
        req: RequestWithEmail,
    ) {
        this.logger.sLog(
            { id, recordSpaceSlug, body, projectSlug },
            'EpService:updateRecord',
        );

        if (Array.isArray(body)) {
            throwBadRequest(`Body can't be an array`);
        }

        if (Object.keys(body).length === 0) {
            throwBadRequest(`Body should not be empty`);
        }

        const { preparedRecordDocument } = await this.prepare(
            { recordDocument: body, user: req.user, requiredFieldsAreOptional: true }
        );

        const record = await this.recordsService.updateRecord(
            id,
            preparedRecordDocument,
        );

        if (!record) {
            throwBadRequest(`No record found for ${recordSpaceSlug}`);
        }

        return formatRecordForEpResponse(
            record as MongoDocWithTimeStamps<typeof record>,
        );
    }

    private async prepare(
        {
            recordQuery,
            recordDocument,
            user,
            acrossRecords = false,
            requiredFieldsAreOptional = false,
        }: Partial<{
            recordQuery: Record<string, string>;
            recordDocument: Record<string, string>;
            user: User;
            acrossRecords: boolean;
            requiredFieldsAreOptional: boolean
        }>,
    ) {
        this.logger.sLog(
            { recordQuery, recordDocument, user },
            'EpService:prepare',
        );

        const { recordSpace } = this.preOperationPayload;
        const { _id: recordSpaceId, recordFields: recordSpaceRecordFields, slug: recordSpaceSlug } = recordSpace;

        const ret: Partial<{
            preparedRecordQuery: ReturnType<typeof prepareRecordQuery>;
            preparedRecordDocument: ReturnType<typeof prepareRecordDocument>;
        }> = {};

        if (recordQuery) {
            ret.preparedRecordQuery = prepareRecordQuery(
                recordSpaceSlug,
                recordSpaceId,
                recordQuery,
                recordSpaceRecordFields,
                this.logger,
                acrossRecords
            );
        }

        if (recordDocument) {
            ret.preparedRecordDocument = prepareRecordDocument(
                recordSpaceId,
                recordDocument,
                recordSpaceRecordFields,
                this.logger,
                requiredFieldsAreOptional
            );
        }

        return ret;
    }

    private validateFieldType(recordStructure: CreateRecordSpaceInput["recordStructure"], fields: Record<string, any>[] | Record<string, any>) {
        this.logger.sLog({ fields }, "EpService::validateFieldType")
        const arrField = Array.isArray(fields) ? fields : new Array(fields);
        for (let i = 0; i < arrField.length; i++) {
            validate(recordStructure, arrField[i]);
        }

        function validate(recordStructure, fields) {
            const error = [];
            for (let index = 0; index < recordStructure.length; index++) {
                const { slug, type } = recordStructure[index];
                const value = fields[slug];
                if (value && type === RecordStructureType.NUMBER && isNaN(value)) {
                    error.push(`${slug} should be a number value`);
                }
            }

            if (error.length) {
                throwBadRequest(error);
            }
            return error;
        }


    }

    protected async preOperation(args: any[]): Promise<{ [PRE_OPERATION_PAYLOAD]: PreOperationPayload }> {
        try {
            const { args, headers, params, query, body, user } = this.context;
            this.logger.sLog(
                { args, query, params, headers, user, body },
                'EpService:preOperation',
            );
            const { create, structure } = headers;

            const fieldsToConsider = !isEmpty(query) ? query : body;

            if (isEmpty(fieldsToConsider)) {
                this.logger.sLog({ query, body }, "EpService:preOperation:: Both query and body parameters are empty");
                throwBadRequest("Absent Fields");
            }


            if (create === 'true') {

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

                const project = await this.projectService.findOne({ slug: projectSlug });

                if (!project) {
                    throwBadRequest('Project does not exist');
                }

                this.validateFieldType(recordStructure, fieldsToConsider);

                const { _id: projectId } = project;

                const recordSpace = await this.recordSpacesService.findOne({
                    query: { slug: recordSpaceSlug },
                    user,
                    projectSlug,
                    populate: "recordFields",
                    projectId
                }) as RecordSpaceWithRecordFields;

                const recordSpaceExists = !!recordSpace;

                this.logger.sLog(
                    { recordSpaceExists },
                    'EpService::preOperation;create:true',
                );

                let latestRecordSpace = recordSpace;

                switch (recordSpaceExists) {
                    case false: {
                        latestRecordSpace = await this.recordSpacesService.create(
                            objectifiedStructure as CreateRecordSpaceInput,
                            user._id,
                            projectId,
                            true
                        );
                        break;
                    }
                    default: {
                        const { recordStructureHash: existingRecordStructureHash } = recordSpace
                        const presentRecordStructureHash = getRecordStructureHash(recordStructure);

                        const newRecordStructureIsDetected = existingRecordStructureHash !== presentRecordStructureHash;
                        this.logger.sLog({ new: recordStructure, existingRecordStructureHash, presentRecordStructureHash }, newRecordStructureIsDetected ? "newRecordStructure detected" : "same old recordStructure");


                        if (newRecordStructureIsDetected) {

                            latestRecordSpace = await this.recordSpacesService.createFieldsFromNonIdProps(
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
                this.preOperationPayload = { recordSpace: latestRecordSpace };

                return { [PRE_OPERATION_PAYLOAD]: { recordSpace } }
            }
        } catch (error) {
            console.log(error);
            this.logger.debug('EpService::preOperation:error', error);
            throwBadRequest(error);
        }
    }
}
