import { FunctionName } from "@/ep-functions/resources/types";
import { IsNotEmpty } from "class-validator";

export class FunctionDto {
    @IsNotEmpty()
    functionName: FunctionName;

    @IsNotEmpty()
    projectSlug: string;
}