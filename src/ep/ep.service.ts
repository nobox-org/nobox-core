import { RecordSpacesService } from '@/record-spaces/record-spaces.service';
import { Record as Record_, RecordField } from '@/schemas';
import { Injectable } from '@nestjs/common';
import { CustomLogger as Logger } from '@/logger/logger.service';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { throwBadRequest } from '@/utils/exceptions';
import { RecordsService } from '@/records/records.service';
import { RecordStructureType } from '@/record-spaces/dto/record-structure-type.enum';


@Injectable()
export class EpService {
    constructor(
        private recordSpacesService: RecordSpacesService,
        private recordsService: RecordsService,
        private logger: Logger
    ) {
    }

    getQueryFieldDetails = (queryField: any, fieldsDetail: RecordField[]) => {
        for (let index = 0; index < fieldsDetail.length; index++) {
            const fieldDetail = fieldsDetail[index];
            if (fieldDetail.slug === queryField) {
                return fieldDetail;
            }
        }

        return null;

    }

    async assertClientQueryValidation(recordSpaceSlug: string, query: Record<string, string>) {
        const recordSpaceId = await this.getIdFromSlug(recordSpaceSlug);

        const fieldsDetailsFromDb = (await this.recordSpacesService.getFields({ recordSpace: recordSpaceId }));
        const queryKeys = Object.keys(query);
        const mongoQuery$And = [];
        for (let index = 0; index < queryKeys.length; index++) {
            const queryKey = queryKeys[index];
            const fieldDetails = this.getQueryFieldDetails(queryKey.toLowerCase(), fieldsDetailsFromDb);   
            if (!fieldDetails) {
                throwBadRequest(`Invalid query field: ${queryKey}`);
            }
            const { _id, type } = fieldDetails;
            const valueType = {
                [RecordStructureType.TEXT]: "textContent",
                [RecordStructureType.NUMBER]: "numberContent",
            }[type];
            mongoQuery$And.push({ 'fieldsContent.field': _id, [`fieldsContent.${valueType}`]: query[queryKey] });
        }
        const preparedQuery: FilterQuery<Record_> = {
            recordSpace: recordSpaceId,
            $and: mongoQuery$And
        }
        this.logger.sLog({ preparedQuery }, "EpService:assertClientQueryValidation");
        return preparedQuery;
    }



    private async getIdFromSlug(slug: string) {
        const res = await this.recordSpacesService.findOne({ slug }, { _id: 1 });
        this.logger.sLog({ res }, "EpService:getIdFromSlug");
        if (!res) {
            throwBadRequest(`Record space with slug ${slug} not found`);
        };
        return res._id;
    }

    async getRecords(recordSpaceSlug: string, query: Record<string, string>) {
        this.logger.sLog({ recordSpaceSlug, query }, "EpService:getRecords");
        const preparedQuery = await this.assertClientQueryValidation(recordSpaceSlug, query);
        const records = await this.recordsService.getRecords(preparedQuery, true);
        this.logger.sLog({ records }, "EpService:getRecords");
        return records;
    }
}
