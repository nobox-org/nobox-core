import { NodeEnvironment } from "../types";

declare namespace NodeJS {
  interface Global {
    _nobox_: { env: NodeEnvironment };
  }
}
