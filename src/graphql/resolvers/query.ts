import { IResolverObject, UserInputError } from "apollo-server-express";
import { authenticateSchoolScope, authenticateUserScope, getSchoolScopes } from '../../auth/context';
import { isValidId, processSchool, processRedactedSchool, processBus, processStop, processHistoryEntry, processAlert, processDismissalData } from '../../utils';
import Context from "../context";
import { Models } from '../../models';

const Query: IResolverObject<any, Context> = {
    async school(_, { id }: { id: string }, context) {
        if (!isValidId(id)) throw new UserInputError("bad_school_id");
        await authenticateSchoolScope(context, ["read"], id);
        return processSchool(await Models.School.findById(id));
    },

    async schools() {
        let schools = await Models.School.find({});
        let redactedSchools = schools.map(processRedactedSchool);
        return redactedSchools;
    },

    async bus(_, { id }: { id: string }, context) {
        if (!isValidId(id)) throw new UserInputError("bad_bus_id");
        const bus = await Models.Bus.findById(id);
        if (bus) {
            await authenticateSchoolScope(context, ["read"], bus.school_id);
        }
        return processBus(bus);
    },

    async stop(_, { id }: { id: string }, context) {
        if (!isValidId(id)) throw new UserInputError("bad_stop_id");
        const stop = await Models.Stop.findById(id);
        if (stop) {
            const bus = await Models.Bus.findById(stop.bus_id);
            if (bus) {
                await authenticateSchoolScope(context, ["read"], bus.school_id);
            } else {
                throw new Error("Stop has invalid bus ID");
            }
        }
        return processStop(stop);
    },

    async alert(_, { id }: { id: string }, context) {
        if (!isValidId(id)) throw new UserInputError("bad_alert_id");
        const alert = await Models.Alert.findById(id);
        if (alert) {
            await authenticateSchoolScope(context, ["read"], alert.school_id);
        }
        return processAlert(alert);
    },

    async dismissalTimeData(_, { id }: { id: string }, context) {
        if (!isValidId(id)) throw new UserInputError("bad_dismissal_time_data_id");
        const dismissalData = await Models.DismissalRange.findById(id)
        if (dismissalData) {
            await authenticateSchoolScope(context, ["read"], dismissalData.school_id)
        }
        return processDismissalData(dismissalData);
    },

    async currentSchoolScopes(_, { schoolID }: { schoolID: string }, context) {
        const scopes = await getSchoolScopes(context, schoolID);
        const userScopes = [...scopes.user].filter(scope => context.scopes.has(scope));
        return [...(new Set([...scopes.public, ...userScopes]).values())];
    },

    async test(_a, _b, context) {
        await authenticateUserScope(context, ["test"]);
        return "test";
    }
};

export default Query;