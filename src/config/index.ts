import * as dbConfig from './dbConfig';
import * as serverConfig from './serverConfig';
import * as minioConfig from './minioConfig';
import * as mailConfig from './mailConfig';
import * as officialConfig from './officialConfig';
import * as browserConfig from './browserConfig';


export { dbConfig, serverConfig, minioConfig, mailConfig, officialConfig, browserConfig };

export default () => ({ dbConfig, serverConfig, minioConfig, mailConfig, officialConfig, browserConfig });