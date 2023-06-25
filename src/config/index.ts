import * as dbConfig from './resources/db-conn';
import * as serverConfig from './resources/server';

export { dbConfig, serverConfig };

export default () => ({ dbConfig, serverConfig });
