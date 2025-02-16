import { IResolverObject } from "apollo-server-express";
import { processSchool } from '../../utils';
import Context from "../context";
import { Models } from '../../models';

const DismissalTimeData: IResolverObject<any, Context> = {
    async school({ schoolID }: { schoolID: string }) {
        return processSchool(await Models.School.findById(schoolID));
    }
};

export default DismissalTimeData;