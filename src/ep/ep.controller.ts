import { EpFunctionsService } from '@/ep-functions/ep-functions.service';
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
        return this.epService.getRecords({ params, query });
    }

    @Get(":projectSlug/:recordSpaceSlug/_single_")
    getRecord(@Param() params: BaseRecordSpaceSlugDto, @Query() query: any) {
        return this.epService.getRecord({ params, query });
    }

    @Post(":projectSlug/:recordSpaceSlug")
    addRecords(@Param() params: BaseRecordSpaceSlugDto, @Body() body: Record<string, any>[]) {
        return this.epService.addRecords(params.recordSpaceSlug, params.projectSlug, body);
    }

    @Post(":projectSlug/:recordSpaceSlug/_single_")
    addRecord(@Param() params: BaseRecordSpaceSlugDto, @Body() body: Record<string, any>) {
        console.log({ params, body })
        return this.epService.addRecord(params.recordSpaceSlug, params.projectSlug, body);
    }

    @Post(":projectSlug/function/:functionName")
    processFunction(@Param() params: FunctionDto, @Body() body: Record<string, any>) {
        return this.epFunctionsService.processFunction({ params, body });
    }

    @Post(":projectSlug/:recordSpaceSlug/update")
    updateRecord(@Param() params: BaseRecordSpaceSlugDto, @Body() body: Record<string, any>, @Query() query: IdQueryDto) {
        return this.epService.updateRecord(query.id, params, body);
    }

    @Delete(":projectSlug/:recordSpaceSlug")
    delete(@Param() params: RecordSpaceSlugParamDto, @Query() query: IdQueryDto) {
        return this.epService.deleteRecord(params.recordSpaceSlug, query.id);
    }
}
