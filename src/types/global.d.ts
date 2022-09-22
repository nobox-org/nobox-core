import { NodeEnvironment } from "../types";

declare module NodeJS {
  interface Global {
    _nobox_: { env: NodeEnvironment };
  }
}
