import { CustomLoggerInstance as Logger } from "@/logger/logger.service";
import * as bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

const hash = async (str: string | number): Promise<string> => {
  const r = Math.random();
  console.time("hashing" + r);
  Logger.debug("hash::hash");
  const _hash = await bcrypt.hash(str, SALT_ROUNDS);
  console.timeEnd("hashing" + r);
  return _hash;
}

const compare = async (str: string | number, hashedStr: string): Promise<boolean> => {
  console.time("compare");
  Logger.debug("hash::compare");
  const hash = await bcrypt.compare(str, hashedStr);
  console.timeEnd("compare");
  return hash;
}

export const bcryptAbs = {
  hash,
  compare
}