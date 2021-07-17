import { AuthenticationError, IResolvers, UserInputError } from 'apollo-server-express';
import { AlertType, Color } from '../../interfaces';
import { Models } from '../../models';
import { convertColorInput, isValidDaysOfWeek, isValidId } from '../../utils';
import Scalars from '../datehandling';
import { authenticateRestrictedScope, authenticateSchoolScope, authenticateUserScope, getSchoolScopes } from '../../auth/context';
import { processSchool, processRedactedSchool, processBus, processStop, processHistoryEntry, processAlert, processDismissalData } from '../../utils';
import Context from '../context';
import { schoolScopes } from '../../auth/scopes';
import { AlertInput, DismissalTimeDataInput, StopInput, SchoolInput, BusInput, BusStatusInput, MappingDataInput } from '../inputinterfaces';
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