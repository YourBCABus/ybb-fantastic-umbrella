import { IResolverObject, UserInputError } from "apollo-server-express";
import { authenticateSchoolScope, authenticateUserScope, getSchoolScopes } from '../../auth/context';
import { isValidId, processSchool, processRedactedSchool, processBus, processStop, processHistoryEntry, processAlert, processDismissalData } from '../../utils';
import Context from "../context";
import { Models } from '../../models';

const LocationHistoryEntry: IResolverObject<any, Context> = {
    async bus(_, { busID }: { busID: string }) {
        return processBus(await Models.Bus.findById(busID));
    }
};

export default LocationHistoryEntry;