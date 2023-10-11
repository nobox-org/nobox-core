import {
   Body,
   Controller,
   Param,
   Post,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { RecordSpaceSlugParamDto } from '../client/dto/general.dto';
import { ClientUtilsService } from './client-utils.service';

@ApiBearerAuth()
@Controller()
export class ClientUtilsController {
   constructor(
      private readonly clientUtilsService: ClientUtilsService,
   ) { }

   @Post(':projectSlug/:recordSpaceSlug/set-inferred-structure')
   setInferredStructure(@Param() params: RecordSpaceSlugParamDto, @Body() body: any) {
      return this.clientUtilsService.setInferredStructure(
         { params, body },
      );
   }

   @Post(':projectSlug/:recordSpaceSlug/get-inferred-structure')
   getInferredStructure(@Param() params: RecordSpaceSlugParamDto, @Body() body: any) {
      return this.clientUtilsService.getInferredStructure(
         { params, body },
      );
   }

   @Post(':projectSlug/:recordSpaceSlug/set-structure')
   setStructure(@Param() params: RecordSpaceSlugParamDto, @Body() body: any) {
      return this.clientUtilsService.setStructure(
         { params, body },
      );
   }
}
