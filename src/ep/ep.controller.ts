import { EpFunctionsService } from '@/ep-functions/ep-functions.service';
import { CommandType } from '@/types';
import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { BaseRecordSpaceSlugDto } from './dto/base-record-space-slug.dto';
import { IdQueryDto, RecordSpaceSlugParamDto } from './dto/delete-record.dto';
import { FunctionDto } from './dto/function.dto';
import { EpService } from './ep.service';

@ApiBearerAuth()
@Controller()
export class EpController {
    constructor(private readonly epService: EpService, private readonly epFunctionsService: EpFunctionsService) { }

    @Get(":projectSlug/:recordSpaceSlug")
    getRecords(@Param() params: RecordSpaceSlugParamDto, @Query() query: any) {
        return this.epService.getRecords({ params, query, commandType: CommandType.FIND }, { throwOnEmpty: false });
    }

    @Get(":projectSlug/:recordSpaceSlug/_single_")
    getRecord(@Param() params: BaseRecordSpaceSlugDto, @Query() query: any) {
        return this.epService.getRecord({ params, query, commandType: CommandType.FIND }, { throwOnEmpty: false });
    }

    @Post(":projectSlug/:recordSpaceSlug")
    addRecords(@Param() params: BaseRecordSpaceSlugDto, @Body() bodyArray: Record<string, any>[]) {
        return this.epService.addRecords({ params, bodyArray, commandType: CommandType.INSERT });
    }

    @Post(":projectSlug/:recordSpaceSlug/_single_")
    addRecord(@Param() params: BaseRecordSpaceSlugDto, @Body() body: Record<string, any>) {
        return this.epService.addRecord({ params, body, commandType: CommandType.INSERT });
    }

    @Post(":projectSlug/:recordSpaceSlug/updateById")
    updateRecordById(@Param() params: BaseRecordSpaceSlugDto, @Body() body: Record<string, any>, @Query() query: IdQueryDto) {
        return this.epService.updateRecordById({ query, params, body, commandType: CommandType.UPDATE });
    }

    @Post(":projectSlug/:recordSpaceSlug/update")
    updateRecord(@Param() params: BaseRecordSpaceSlugDto, @Body() update: Record<string, any>, @Query() query: Record<string, any>) {
        return this.epService.updateRecord({ params, query, update, commandType: CommandType.UPDATE });
    }

    @Delete(":projectSlug/:recordSpaceSlug")
    delete(@Param() params: RecordSpaceSlugParamDto, @Query() query: IdQueryDto) {
        return this.epService.deleteRecord({ params, query, commandType: CommandType.DELETE });
    }

    @Post(":projectSlug/function/:functionName")
    async processFunction(@Param() params: FunctionDto, @Body() body: Record<string, any>) {
        return await this.epFunctionsService.processFunction({ params, body });
    }

}
