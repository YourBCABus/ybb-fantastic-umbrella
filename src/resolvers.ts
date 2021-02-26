import { IResolvers, UserInputError } from 'apollo-server-express';
import { School, Bus, Stop, Coordinate, BusLocationHistory, Alert, Color, DismissalRange } from './interfaces';
import { Models } from './models';
import { isValidId } from './utils';
import Scalars from './datehandling';

function processLocation(location?: Coordinate) {
    return location && {lat: location.latitude, long: location.longitude};
}

function processSchool(school?: School) {
    return school && {
        id: school._id,
        name: school.name,
        location: processLocation(school.location),
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
        numbers: bus.numbers,
        invalidateTime: bus.invalidate_time
    };
}

function processHistoryEntry(entry?: BusLocationHistory) {
    return entry && {
        busID: entry.bus_id,
        time: entry.time,
        locations: entry.locations,
        source: entry.source
    };
}

function processStop(stop?: Stop) {
    return stop && {
        id: stop._id,
        busID: stop.bus_id,
        name: stop.name,
        description: stop.description,
        location: processLocation(stop.location),
        order: stop.order,
        available: stop.available,
        arrivalTime: stop.arrival_time,
        invalidateTime: stop.invalidate_time
    };
}

function processAlert(alert?: Alert) {
    return alert && {
        id: alert._id,
        schoolID: alert.school_id,
        type: alert.type,
        title: alert.title,
        content: alert.content,
        dismissable: alert.can_dismiss,
        start: new Date(alert.start_date * 1000),
        end: new Date(alert.end_date * 1000)
    };
}

function processDismissalData(data?: DismissalRange) {
    return {
        id: data._id,
        schoolID: data.school_id,
        daysOfWeek: data.days_of_week,
        startDate: new Date(data.start_date * 1000),
        endDate: new Date(data.end_date * 1000),
        dismissalTime: data.dismissal_time,
        alertStartTime: data.start_time,
        alertEndTime: data.end_time
    };
}

const resolvers: IResolvers<any, any> = {
    DateTime: Scalars.DateTime,
    Time: Scalars.Time,
    Query: {
        async school(_, {id}: {id: string}) {
            if (!isValidId(id)) throw new UserInputError("bad_school_id");
            return processSchool(await Models.School.findById(id));
        },
        async bus(_, {id}: {id: string}) {
            if (!isValidId(id)) throw new UserInputError("bad_bus_id");
            return processBus(await Models.Bus.findById(id));
        },
        async stop(_, {id}: {id: string}) {
            if (!isValidId(id)) throw new UserInputError("bad_stop_id");
            return processStop(await Models.Stop.findById(id));
        },
        async alert(_, {id}: {id: string}) {
            if (!isValidId(id)) throw new UserInputError("bad_alert_id");
            return processAlert(await Models.Alert.findById(id));
        },
        async dismissalTimeData(_, {id}: {id: string}) {
            if (!isValidId(id)) throw new UserInputError("bad_dismissal_time_data_id");
            return processDismissalData(await Models.DismissalRange.findById(id));
        },
        async bca() {
            return processSchool(await Models.School.findById("5bca51e785aa2627e14db459"));
        }
    },
    School: {
        async buses({id}: {id: string}) {
            return (await Models.Bus.find({school_id: id})).map(bus => processBus(bus));
        },
        async alerts({id}: {id: string}) {
            return (await Models.Alert.find({school_id: id})).map(alert => processAlert(alert));
        },
        async dismissalTimeData({id}: {id: string}, {date: inputDate}: {date?: Date}) {
            const date = inputDate || new Date();
            return processDismissalData(await Models.DismissalRange.findOne({
                school_id: id,
                end_date: {$gte: Math.floor(date.getTime() / 1000)},
                start_date: {$lte: Math.floor(date.getTime() / 1000)},
                days_fo_week: date.getUTCDay() // HACK: Better timezone support
            }));
        },
        async allDismissalTimeData({id}: {id: string}) {
            return (await Models.DismissalRange.find({school_id: id})).map(data => processDismissalData(data));
        }
    },
    Bus: {
        async school({schoolID}: {schoolID: string}) {
            return processSchool(await Models.School.findById(schoolID));
        },
        async recentHistory({id}: {id: string}) {
            const history = await Models.BusLocationHistory.find({
                bus_id: id,
                "locations.0": { $exists: true } 
            }).sort([["_id", -1]]).limit(10);
            return history.map(entry => processHistoryEntry(entry));
        },
        async stops({id}: {id: string}) {
            return (await Models.Stop.find({bus_id: id})).map(stop => processStop(stop));
        }
    },
    LocationHistoryEntry: {
        async bus(_, {busID}: {busID: string}) {
            return processBus(await Models.Bus.findById(busID));
        }
    },
    Stop: {
        async bus({busID}: {busID: string}) {
            return processBus(await Models.Bus.findById(busID))
        }
    },
    Alert: {
        async school({schoolID}: {schoolID: string}) {
            return processSchool(await Models.School.findById(schoolID));
        }
    },
    AlertColor: {
        appearances(color: Color) {
            return color.appearances ? Object.keys(color.appearances).map(appearanceName => ({
                appearance: appearanceName,
                ...color.appearances[appearanceName]
            })) : [];
        },
        color(color: Color, {appearance}: {appearance: string}) {
            const resolved = color.appearances[appearance];
            if (resolved) {
                return {appearance, ...resolved};
            } else {
                return color;
            }
        }
    },
    DismissalTimeData: {
        async school({schoolID}: {schoolID: string}) {
            return processSchool(await Models.School.findById(schoolID));
        }
    }
};

export default resolvers;