import * as dbConfig from './dbConfig';
import * as serverConfig from './serverConfig';
import * as minioConfig from './minioConfig';

export { dbConfig, serverConfig, minioConfig };

export default () => ({ dbConfig, serverConfig, minioConfig });