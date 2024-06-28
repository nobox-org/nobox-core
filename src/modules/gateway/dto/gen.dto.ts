import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional } from 'class-validator';

export class ProjectUserDto {
    @IsNotEmpty()
    email: string;

    @IsNotEmpty()
    projectId: string;
}


export class ProjectSlugDto {
    @IsOptional()
    projectSlug: string;

    @IsOptional()
    projectId: string;
}


export class CreateProjectDto {
    @IsNotEmpty()
    description: string;

    @IsNotEmpty()
    name: string;

    @IsNotEmpty()
    @Transform((input: any) => {
        return input.toLowerCase();
    })
    slug: string;
}

export class AddRecordSpaceViewParamDto {
    @IsNotEmpty()
    recordSpaceId: string;

    @IsNotEmpty()
    projectId: string;
}


export class RecordSpaceViewBodyDto {
    @IsNotEmpty()
    data: any;
}

export class QueryViewDto {
    @IsNotEmpty()
    id: string;
}

export class LogsQueryDto {
    @IsNotEmpty()
    projectId: string;

    recordSpaceId: string;

    recordId: string;
}