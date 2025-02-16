import { IResolverObject } from "apollo-server-express";
import { processBus } from '../../utils';
import Context from "../context";
import { Models } from '../../models';

const LocationHistoryEntry: IResolverObject<any, Context> = {
    async bus(_, { busID }: { busID: string }) {
        return processBus(await Models.Bus.findById(busID));
    }
};

export default LocationHistoryEntry;