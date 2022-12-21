import { PartialType } from '@nestjs/swagger';
import { CreateEpFunctionDto } from './create-ep-function.dto';

export class UpdateEpFunctionDto extends PartialType(CreateEpFunctionDto) {}
