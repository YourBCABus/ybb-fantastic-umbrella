import { IResolverObject } from "apollo-server-express";
import { processBus } from '../../utils';
import Context from "../context";
import { Models } from '../../models';

const Stop: IResolverObject<any, Context> = {
    async bus({ busID }: { busID: string }) {
        return processBus(await Models.Bus.findById(busID))
    }
};

export default Stop;