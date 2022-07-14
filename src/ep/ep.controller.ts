import { Controller, Get, Param, Query } from '@nestjs/common';
import { EpService } from './ep.service';

@Controller('')
export class EpController {
    constructor(private readonly epService: EpService) { }

    @Get(":record_space_slug")
    getRecords(@Param() params, @Query() query) {
         return this.epService.getRecords(params.record_space_slug, query);
    }
}
