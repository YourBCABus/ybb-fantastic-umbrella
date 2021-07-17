import { IResolverObject } from "apollo-server-express";
import Context from "../context";
import { Models } from '../../models';
import { processSchool } from "../../utils"

const Alert: IResolverObject<any, Context> = {
    async school({schoolID}: {schoolID: string}) {
        return processSchool(await Models.School.findById(schoolID));
    }
};

export default Alert;