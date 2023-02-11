import { IsNotEmpty } from "class-validator";

export class SearchRecordDto {
    @IsNotEmpty()
    searchableFields: string[];

    @IsNotEmpty()
    searchText: string;
}