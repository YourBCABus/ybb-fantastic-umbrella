import { IResolverObject, UserInputError } from "apollo-server-express";
import { authenticateSchoolScope, authenticateUserScope, getSchoolScopes } from '../../auth/context';
import { isValidId, processSchool, processRedactedSchool, processBus, processStop, processHistoryEntry, processAlert, processDismissalData } from '../../utils';
import Context from "../context";
import { Models } from '../../models';

const Bus: IResolverObject<any, Context> = {
    async school({ schoolID }: { schoolID: string }) {
        return processSchool(await Models.School.findById(schoolID));
    },

    async recentHistory({ id }: { id: string }) {
        const history = await Models.BusLocationHistory.find({
            bus_id: id,
            "locations.0": { $exists: true }
        }).sort([["_id", -1]]).limit(10);
        return history.map(entry => processHistoryEntry(entry));
    },

    async stops({ id }: { id: string }) {
        return (await Models.Stop.find({ bus_id: id })).map(stop => processStop(stop));
    }
};

export default Bus;