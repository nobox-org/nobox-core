import { CustomLogger as Logger } from "@/logger/logger.service";
import * as Argon2 from '@node-rs/argon2';
import * as crypto from "crypto";
import * as util from "util";

const options = {
    timeCost: 2,
    memoryCost: 3384,
    parallelism: 4,
    hashLength: 64,
};

// const getRandomBytes = util.promisify(crypto.randomBytes);

const hash = async (str: string, logger: Logger): Promise<string> => {
    const t0 = performance.now();
    logger.sLog({}, "argon::hash:: hashing");
    const password = Buffer.from(str);
    //  const salt = await getRandomBytes(32);
    const hashedPassword = await Argon2.hash(password, options);
    const t2 = performance.now();
    logger.sLog({ time: t2 - t0 }, `argon::compare:: time taken::: ${t2 - t0}`, "redBright");
    return hashedPassword;
}

const compare = async (str: string, hashedStr: string, logger: Logger): Promise<boolean> => {
    const t0 = performance.now();
    const isCorrect = await Argon2.verify(hashedStr, str);
    const t2 = performance.now();
    logger.sLog({ time: t2 - t0 }, `argon::compare:: time taken::: ${t2 - t0}`, "redBright");
    return isCorrect;
}

export const argonAbs = {
    hash,
    compare
}

