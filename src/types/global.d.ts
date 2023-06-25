import { NodeEnvironment } from '.';

declare namespace NodeJS {
   interface Global {
      _nobox_: { env: NodeEnvironment };
   }
}
