import { CommandType } from '@/types';
import {
   Body,
   Controller,
   Delete,
   Get,
   Param,
   Post,
   Query,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { BaseRecordSpaceSlugDto } from './dto/base-record-space-slug.dto';
import { FunctionDto } from './dto/function.dto';
import { SearchRecordDto } from './dto/search-record.dto';
import { ClientService } from './client.service';
import { IdQueryDto, RecordSpaceSlugParamDto } from './dto/general.dto';
import { ClientFunctionsService } from '../client-functions/client-functions.service';
import { SendMailDto } from '../email/dto/send-mail.dto';
import { EmailService } from '../email/email.service';

@ApiBearerAuth()
@Controller()
export class ClientController {
   constructor(
      private readonly epService: ClientService,
      private readonly clientFunctionsService: ClientFunctionsService,
      private readonly emailService: EmailService,
   ) {}

   @Get(':projectSlug/:recordSpaceSlug')
   getRecords(@Param() params: RecordSpaceSlugParamDto, @Query() query: any) {
      return this.epService.getRecords(
         { params, query, commandType: CommandType.FIND },
         { throwOnEmpty: false },
      );
   }

   @Get(':projectSlug/:recordSpaceSlug/search')
   searchRecords(
      @Param() params: RecordSpaceSlugParamDto,
      @Query() query: SearchRecordDto,
   ) {
      return this.epService.searchRecords(
         { params, query, commandType: CommandType.FIND },
         { throwOnEmpty: false },
      );
   }

   @Get(':projectSlug/:recordSpaceSlug/_single_')
   getRecord(@Param() params: BaseRecordSpaceSlugDto, @Query() query: any) {
      return this.epService.getRecord(
         { params, query, commandType: CommandType.FIND },
         { throwOnEmpty: false },
      );
   }

   @Post(':projectSlug/:recordSpaceSlug')
   addRecords(
      @Param() params: BaseRecordSpaceSlugDto,
      @Body() bodyArray: Record<string, any>[],
   ) {
      return this.epService.addRecords({
         params,
         bodyArray,
         commandType: CommandType.INSERT,
      });
   }

   @Post(':projectSlug/:recordSpaceSlug/_single_')
   addRecord(
      @Param() params: BaseRecordSpaceSlugDto,
      @Body() body: Record<string, any>,
   ) {
      return this.epService.addRecord({
         params,
         body,
         commandType: CommandType.INSERT,
      });
   }

   @Post(':projectSlug/:recordSpaceSlug/update-by-id')
   updateRecordById(
      @Param() params: BaseRecordSpaceSlugDto,
      @Body() body: Record<string, any>,
      @Query() query: IdQueryDto,
   ) {
      return this.epService.updateRecordById({
         query,
         params,
         body,
         commandType: CommandType.UPDATE,
      });
   }

   @Post(':projectSlug/:recordSpaceSlug/update')
   updateRecord(
      @Param() params: BaseRecordSpaceSlugDto,
      @Body() update: Record<string, any>,
      @Query() query: Record<string, any>,
   ) {
      return this.epService.updateRecord({
         params,
         query,
         update,
         commandType: CommandType.UPDATE,
      });
   }

   @Get(':projectSlug/:recordSpaceSlug/get-token-owner')
   getTokenOwner(@Param() params: BaseRecordSpaceSlugDto) {
      return this.epService.getTokenOwner({
         params,
         commandType: CommandType.FIND,
      });
   }

   @Delete(':projectSlug/:recordSpaceSlug')
   delete(
      @Param() params: RecordSpaceSlugParamDto,
      @Query() query: IdQueryDto,
   ) {
      return this.epService.deleteRecord({
         params,
         query,
         commandType: CommandType.DELETE,
      });
   }

   @Post(':projectSlug/:recordSpaceSlug/set-key-values')
   setKeyValues(
      @Param() params: BaseRecordSpaceSlugDto,
      @Body() body: Record<string, any>,
   ) {
      return this.epService.setKeyValues({
         params,
         body,
         commandType: CommandType.INSERT,
      });
   }

   @Get(':projectSlug/:recordSpaceSlug/get-key-values')
   getKeyValues(@Param() params: BaseRecordSpaceSlugDto) {
      return this.epService.getKeyValues({
         params,
         commandType: CommandType.INSERT,
      });
   }

   @Post(':projectSlug/function/:functionName')
   async processFunction(
      @Param() params: FunctionDto,
      @Body() body: Record<string, any>,
   ) {
      return await this.clientFunctionsService.processFunction({
         params,
         body,
      });
   }

   @Post(':projectSlug/:recordSpaceSlug/mail')
   async sendMail(
      @Param() params: FunctionDto,
      @Body() body: SendMailDto,
   ) {
      // return await this.emailService.sendEmail(...body);
      const {to, subject, text, html} = body;
      return this.emailService.sendEmail(to, subject, text, html);
   }
}
