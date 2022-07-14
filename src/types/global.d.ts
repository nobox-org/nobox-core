import { NodeEnvironment } from "../types";

declare module NodeJS {
  interface Global {
    _third_: { env: NodeEnvironment };
  }
}
