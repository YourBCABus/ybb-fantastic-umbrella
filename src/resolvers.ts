import { IResolvers, UserInputError } from 'apollo-server-express';
import { School, Bus } from './interfaces';
import { Models } from './models';
import { isValidId } from './utils';

function processSchool(school?: School) {
    return school && {
        id: school._id,
        name: school.name,
        location: school.location && {
            lat: school.location.latitude,
            long: school.location.longitude
        },
        available: school.available,
        timeZone: school.timezone
    }
}

function processBus(bus?: Bus) {
    return bus && {
        id: bus._id,
        schoolID: bus.school_id,
        locations: bus.locations,
        otherNames: bus.other_names,
        available: bus.available,
        name: bus.name,
        company: bus.company,
        phone: bus.phone,
        numbers: bus.numbers
    };
}

const resolvers: IResolvers<any, any> = {
    Query: {
        async school(_, {id}: {id: string}) {
            if (!isValidId(id)) throw new UserInputError("bad_school_id");
            return processSchool(await Models.School.findById(id));
        },
        async bus(_, {id}: {id: string}) {
            if (!isValidId(id)) throw new UserInputError("bad_bus_id");
            return processBus(await Models.Bus.findById(id));
        }
    },
    School: {
        async buses({id}: {id: string}) {
            return (await Models.Bus.find({school_id: id})).map(bus => processBus(bus));
        }
    },
    Bus: {
        async school({schoolID}: {schoolID: string}) {
            return processSchool(await Models.School.findById(schoolID));
        }
    }
};

export default resolvers;