import { CreateRecordSpaceInput } from '@/record-spaces/dto/create-record-space.input';
import { RecordStructureType } from '@/record-spaces/dto/record-structure-type.enum';
import { FunctionsMetaData } from '../types';

export interface loginFunctionResources {
    authRecordSpaceSlug: string;
}

export const loginFunctionMetaData: FunctionsMetaData = {
    name: 'login',
    payload: {
        body: {
            username: {
                type: 'string',
                required: true,
            },
            password: {
                type: 'string',
                required: true,
            },
        }
    },
    // resources: {
    //     recordSpaces: {
    //         authStore: {
    //             getCreationInput: ({ projectSlug }: Pick<CreateRecordSpaceInput, "projectSlug">) => ({
    //                 name: 'Auth Store',
    //                 description: 'Authentication Record Space for Users',
    //                 projectSlug,
    //                 slug: 'users',
    //                 recordStructure: [
    //                     {
    //                         name: 'username',
    //                         description: 'User Name',
    //                         slug: 'username',
    //                         type: RecordStructureType.TEXT,
    //                         required: true,
    //                     },
    //                     {
    //                         name: 'password',
    //                         description: 'Password',
    //                         slug: 'password',
    //                         type: RecordStructureType.TEXT,
    //                         required: true,
    //                     }
    //                 ],
    //             }),
    //         },
    //     },
    // },
};
