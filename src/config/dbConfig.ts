import { MONGO_PASSWORD, MONGO_USERNAME, MONGO_HOST, MONGO_PROTOCOL, MONGO_DB_NAME, MONGO_REPLICA_INIT_PORT, MONGO_REPLICA_SET } from "./mainConfig";
import { NonEmptyArray } from '../types';

const authSection = MONGO_USERNAME && MONGO_PASSWORD ? `${MONGO_USERNAME}:${MONGO_PASSWORD}@` : '';

export const isAuth = !!authSection;

export const connString = `${MONGO_PROTOCOL}://${authSection}${MONGO_HOST}${MONGO_REPLICA_INIT_PORT ? ':' + Number(Number(MONGO_REPLICA_INIT_PORT) + 2) : ''}/${MONGO_DB_NAME}?${MONGO_REPLICA_SET ? "directConnection=true&readPreference=primaryPreferred&replicaSet=" + MONGO_REPLICA_SET : "retryWrites=true&w=majority"}`;

export const connOptions: Record<string, boolean> = {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    // useFindAndModify: false,
    // useCreateIndex: true,
};

export const full: NonEmptyArray<string | Record<string, boolean>> = [connString, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    useFindAndModify: false,
    useCreateIndex: true,
}];

export default { connOptions, full }