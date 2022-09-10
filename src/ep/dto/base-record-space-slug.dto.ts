import { IsNotEmpty } from "class-validator";


export class BaseRecordSpaceSlugDto {
    @IsNotEmpty()
    recordSpaceSlug: string;

    @IsNotEmpty()
    projectSlug: string;
}