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
