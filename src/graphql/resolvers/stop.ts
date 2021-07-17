import { IResolverObject, UserInputError } from "apollo-server-express";
import { authenticateSchoolScope, authenticateUserScope, getSchoolScopes } from '../../auth/context';
import { isValidId, processSchool, processRedactedSchool, processBus, processStop, processHistoryEntry, processAlert, processDismissalData } from '../../utils';
import Context from "../context";
import { Models } from '../../models';
import { AlertInput, DismissalTimeDataInput, StopInput, SchoolInput, BusInput, BusStatusInput, MappingDataInput } from '../inputinterfaces';

const Stop: IResolverObject<any, Context> = {
    async bus({ busID }: { busID: string }) {
        return processBus(await Models.Bus.findById(busID))
    }
};

export default Stop;