import { RequestWithEmail } from '@/types';
import { Body, Controller, Delete, Get, Param, Post, Query, Request } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { BaseRecordSpaceSlugDto } from './dto/base-record-space-slug.dto';
import { IdQueryDto, RecordSpaceSlugParamDto } from './dto/delete-record.dto';
import { FunctionDto } from './dto/function.dto';
import { EpService } from './ep.service';

@ApiBearerAuth()
@Controller()
export class EpController {
    constructor(private readonly epService: EpService) { }

    @Get(":projectSlug/:recordSpaceSlug")
    getRecords(@Param() params: RecordSpaceSlugParamDto, @Query() query: any, @Request() req: RequestWithEmail,) {
        return this.epService.getRecords({ params, query, user: req.user });
    }

    @Get(":projectSlug/:recordSpaceSlug/_single_")
    getRecord(@Param() params: BaseRecordSpaceSlugDto, @Query() query: any, @Request() req: RequestWithEmail,) {
        return this.epService.getRecord({ params, query, user: req.user });
    }

    @Post(":projectSlug/:recordSpaceSlug")
    addRecords(@Param() params: BaseRecordSpaceSlugDto, @Body() body: Record<string, any>[], @Request() req: RequestWithEmail) {
        return this.epService.addRecords(params.recordSpaceSlug, params.projectSlug, body, req);
    }

    @Post(":projectSlug/:recordSpaceSlug/_single_")
    addRecord(@Param() params: BaseRecordSpaceSlugDto, @Body() body: Record<string, any>, @Request() req: RequestWithEmail) {
        return this.epService.addRecord(params.recordSpaceSlug, params.projectSlug, body, req);
    }

    @Post(":projectSlug/function/:functionName")
    processFunction(@Param() params: FunctionDto, @Body() body: Record<string, any>, @Request() req: RequestWithEmail) {
        return this.epService.processFunction({ params, body, req });
    }

    @Post(":projectSlug/:recordSpaceSlug/update")
    updateRecord(@Param() params: BaseRecordSpaceSlugDto, @Body() body: Record<string, any>, @Query() query: IdQueryDto, @Request() req: RequestWithEmail) {
        return this.epService.updateRecord(query.id, params, body, req);
    }

    @Delete(":projectSlug/:recordSpaceSlug")
    delete(@Param() params: RecordSpaceSlugParamDto, @Query() query: IdQueryDto, @Request() req: RequestWithEmail) {
        return this.epService.deleteRecord(params.recordSpaceSlug, query.id, req);
    }
}
