import { FunctionsMetaData } from '../types';

export interface LoginFunctionResources {
    authRecordSpaceStructure: string;
}

export const loginFunctionMetaData: FunctionsMetaData = {
    name: 'login',
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
