import { CustomLoggerInstance as Logger } from "@/logger/logger.service";
import { NodeEnvironment } from "../types"
import { setGlobalVar } from "./globalVar";

export const setEnv = () => {
    const presentEnv = process.env.NODE_ENV as NodeEnvironment;
    const envList = Object.values(NodeEnvironment);

    if (!envList.includes(presentEnv)) {
        const error = presentEnv ? "Env has to be either of the following " + String(envList) : "NODE_ENV was not provided";
        Logger.warn(error, "getEnv")
        throw new Error(error);
    }
    Logger.log(`You are running a ${presentEnv} environment`, "getEnv");
    setGlobalVar('env', presentEnv);
    return presentEnv;
}