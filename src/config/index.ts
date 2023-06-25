import * as dbConfig from './dbConfig';
import * as serverConfig from './serverConfig';

export { dbConfig, serverConfig, };

export default () => ({ dbConfig, serverConfig, });