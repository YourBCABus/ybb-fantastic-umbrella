import { IResolvers } from 'apollo-server-express';
import Scalars from '../datehandling';
import Context from '../context';
import Query from './query';
import Mutation from './mutation';
import School from './school';
import Bus from './bus';
import LocationHistoryEntry from './locationhistoryentry';
import Stop from './stop';
import Alert from './alert';
import AlertColor from './alertcolor';
import DismissalTimeData from './dismissaltimedata';

/**
 * Resolvers for the GraphQL API.
 */
const resolvers: IResolvers<any, Context> = {
    DateTime: Scalars.DateTime,
    Time: Scalars.Time,
    Query,
    Mutation,
    School,
    Bus,
    LocationHistoryEntry,
    Stop,
    Alert,
    AlertColor,
    DismissalTimeData
};

export default resolvers;