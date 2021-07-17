import { IResolverObject, UserInputError } from "apollo-server-express";
import { authenticateSchoolScope, authenticateUserScope, getSchoolScopes } from '../../auth/context';
import { isValidId, processSchool, processRedactedSchool, processBus, processStop, processHistoryEntry, processAlert, processDismissalData } from '../../utils';
import Context from "../context";
import { Models } from '../../models';

const DismissalTimeData: IResolverObject<any, Context> = {
    async school({ schoolID }: { schoolID: string }) {
        return processSchool(await Models.School.findById(schoolID));
    }
};

export default DismissalTimeData;