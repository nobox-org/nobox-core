import { MONGO_PASSWORD, MONGO_USERNAME, MONGO_HOST, MONGO_PROTOCOL, MONGO_DB_NAME, MONGO_PORT } from "./mainConfig";
import { NonEmptyArray } from 'src/types';

export const connString = `${MONGO_PROTOCOL}://${MONGO_USERNAME}:${MONGO_PASSWORD}@${MONGO_HOST}${MONGO_PORT ? ':' + MONGO_PORT : ''}/${MONGO_DB_NAME}?retryWrites=true&w=majority`;

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