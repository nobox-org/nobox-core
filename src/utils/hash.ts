import { CustomLoggerInstance as Logger } from "@/logger/logger.service";
import * as bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

const hash = async (str: string | number): Promise<string> => {
  Logger.debug("hash::hash");
  return bcrypt.hash(str, SALT_ROUNDS)
}

const compare = async (str: string | number, hashedStr: string): Promise<boolean> => {
  Logger.debug("hash::compare");
  return bcrypt.compare(str, hashedStr);
}

export const bcryptAbs = {
  hash,
  compare
}