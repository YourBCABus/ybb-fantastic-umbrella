import { IResolverObject, UserInputError } from "apollo-server-express";
import { authenticateSchoolScope, authenticateUserScope, getSchoolScopes } from '../../auth/context';
import { isValidId, processSchool, processRedactedSchool, processBus, processStop, processHistoryEntry, processAlert, processDismissalData } from '../../utils';
import Context from "../context";
import { Models } from '../../models';
import { AlertInput, DismissalTimeDataInput, StopInput, SchoolInput, BusInput, BusStatusInput, MappingDataInput } from '../inputinterfaces';

const School: IResolverObject<any, Context> = {
    async buses({ id }: { id: string }) {
        return (await Models.Bus.find({ school_id: id })).map(bus => processBus(bus));
    },

    async alerts({ id }: { id: string }) {
        return (await Models.Alert.find({ school_id: id })).map(alert => processAlert(alert));
    },

    async dismissalTimeData({ id }: { id: string }, { date: inputDate }: { date?: Date }) {
        const date = inputDate || new Date();
        return processDismissalData(await Models.DismissalRange.findOne({
            school_id: id,
            end_date: { $gte: Math.floor(date.getTime() / 1000) },
            start_date: { $lte: Math.floor(date.getTime() / 1000) },
            days_of_week: date.getUTCDay() // HACK: Better timezone support
        }));
    },

    async allDismissalTimeData({ id }: { id: string }) {
        return (await Models.DismissalRange.find({ school_id: id })).map(data => processDismissalData(data));
    },

    async userPermissions({ id }: { id: string }, _, context) {
        await authenticateSchoolScope(context, ["school.manage"], id);
        return (await Models.Permission.find({ school_id: id })).map(permission => ({
            userID: permission.user_id,
            scopes: permission.scopes
        }));
    },

    async clientPermissions({ id }: { id: string }, _, context) {
        await authenticateSchoolScope(context, ["school.manage"], id);
        return (await Models.ClientPermission.find({ school_id: id })).map(permission => ({
            clientID: permission.client_id,
            scopes: permission.scopes
        }));
    },
};

export default School;