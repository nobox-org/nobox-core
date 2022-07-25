import { RequestWithEmail } from '@/types';
import { Body, Controller, Delete, Get, Param, Post, Query, Request } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { BaseRecordSpaceSlugDto } from './dto/base-record-space-slug.dto';
import { IdQueryDto, RecordSpaceSlugParamDto } from './dto/delete-record.dto';
import { UpdateRecordDto } from './dto/update-record.dto';
import { EpService } from './ep.service';

@ApiBearerAuth()
@Controller()
export class EpController {
    constructor(private readonly epService: EpService) { }

    @Get(":recordSpaceSlug")
    getRecords(@Param() params: RecordSpaceSlugParamDto, @Query() query) {
        return this.epService.getRecords(params.recordSpaceSlug, query);
    }

    @Get(":recordSpaceSlug/_single_")
    getRecord(@Param() params: BaseRecordSpaceSlugDto, @Query() query) {
        return this.epService.getRecord(params.recordSpaceSlug, query);
    }

    @Post(":recordSpaceSlug")
    addRecords(@Param() params: BaseRecordSpaceSlugDto, @Body() body: Record<string, any>[], @Request() req: RequestWithEmail) {
        return this.epService.addRecords(params.recordSpaceSlug, body, req);
    }

    @Post(":recordSpaceSlug/_single_")
    addRecord(@Param() params: BaseRecordSpaceSlugDto, @Body() body: Record<string, any>, @Request() req: RequestWithEmail) {
        return this.epService.addRecord(params.recordSpaceSlug, body, req);
    }

    @Post(":record_space_slug/update")
    updateRecord(@Param() params: UpdateRecordDto, @Body() body: Record<string, any>) {
        return this.epService.updateRecord(params, body);
    }

    @Delete(":recordSpaceSlug")
    delete(@Param() params: RecordSpaceSlugParamDto, @Query() query: IdQueryDto, @Request() req: RequestWithEmail) {
    console.log({ params, query });
        return this.epService.deleteRecord(params.recordSpaceSlug, query.id, req);
    }
}
