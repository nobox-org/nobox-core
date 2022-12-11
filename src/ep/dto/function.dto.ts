import { IsNotEmpty } from "class-validator";

export class FunctionDto {
    @IsNotEmpty()
    functionName: string;

    @IsNotEmpty()
    projectSlug: string;
}