import { RequestWithEmail } from '@/types';
import { Body, Controller, Get, Param, Post, Query, Request } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { BaseRecordSpaceSlugDto } from './dto/base-record-space-slug.dto';
import { UpdateRecordDto } from './dto/update-record.dto';
import { EpService } from './ep.service';

@ApiBearerAuth()
@Controller()
export class EpController {
    constructor(private readonly epService: EpService) { }

    @Get(":recordSpaceSlug")
    getRecords(@Param() params, @Query() query) {
        return this.epService.getRecords(params.record_space_slug, query);
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

    @Post(":record_space_slug/_single_")
    updateRecord(@Param() params: UpdateRecordDto, @Body() body: Record<string, any>, @Request() req: RequestWithEmail) {
        return this.epService.updateRecord(params, body, req);
    }

}
