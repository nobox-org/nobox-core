import { CustomLogger as Logger } from "@/logger/logger.service";

export const measureTimeTaken = (func: Function, logger?: Logger) => {
    const _logger = logger || new Logger();
    const t0 = performance.now();
    const a = func().then((res) => res);
    const t2 = performance.now();
    _logger.sLog({ time: t2 - t0 }, `argon::compare:: time taken::: ${t2 - t0}`, "redBright");
    return a;
}