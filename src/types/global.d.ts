import { NodeEnvironment } from "../types";

declare namespace NodeJS {
  interface Global {
    _third_: { env: NodeEnvironment };
  }
}
