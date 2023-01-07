import { CustomLogger as Logger } from "@/logger/logger.service";
import { argon2i } from "argon2-ffi";
import * as crypto from "crypto";
import * as util from "util";

const options = {
    timeCost: 2,
    memoryCost: 3384,
    parallelism: 4,
    hashLength: 64,
};

const a = Math.random();

const getRandomBytes = util.promisify(crypto.randomBytes);

const hash = async (str: string, logger: Logger): Promise<string> => {
    console.time("hashing" + a);

    logger.sLog({ str }, "argon::hash:: hashing");
    const password = Buffer.from(str);
    const salt = await getRandomBytes(32);
    const hashedPassword = await argon2i.hash(password, salt, options);
    console.timeLog("hashing" + a);

    return hashedPassword;
}

const compare = async (str: string, hashedStr: string): Promise<boolean> => {
    console.time("verifying" + a);
    const isCorrect = await argon2i.verify(hashedStr, str);
    console.timeLog("verifying" + a);
    return isCorrect;
}

export const argonAbs = {
    hash,
    compare
};

