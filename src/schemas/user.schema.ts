import { CustomLogger as Logger } from "@/logger/logger.service";
import { Gender } from "@/user/graphql/enums/gender.enum";

import { collection } from "@/utils/mongo";
import { MBase } from "./base-model.schema";


const collectionName = 'users';

export interface MTokens {
  resetPassword?: string;

  forgotPassword?: string;
}

export interface MUser extends MBase {
  email: string;

  password: string;

  firstName: string;

  lastName: string;

  profileImage?: string;

  gender?: Gender;

  tokens?: MTokens;
}

export const getUserModel = (logger: Logger) => {
  const col = collection<MUser>(collectionName, logger);
  return col;
}