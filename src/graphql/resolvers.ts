import { IResolvers, UserInputError } from 'apollo-server-express';
import { School, Bus, Stop, Coordinate, BusLocationHistory, Alert, Color, DismissalRange, Point } from '../interfaces';
import { Models } from '../models';
import { isValidId } from '../utils';
import Scalars from './datehandling';
import { authenticateSchoolScope, authenticateUserScope } from '../auth/context';

function processLocation(location?: Coordinate | {}) {
    if (!location) return;
    if (typeof (location as Partial<Coordinate>).latitude === "undefined") return;
    if (typeof (location as Partial<Coordinate>).longitude === "undefined") return;
    return {lat: (location as Coordinate).latitude, long: (location as Coordinate).longitude};
}

function processCoords(coords?: Point) {
    if (!coords) return;
    if (typeof (coords as Partial<Point>).coordinates === "undefined") return;
    return {lat: coords.coordinates[0], long: coords.coordinates[1]};
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
        location: processCoords(stop.coords),
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
    return data && {
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
        async school(_, {id}: {id: string}, context) {
            if (!isValidId(id)) throw new UserInputError("bad_school_id");
            await authenticateSchoolScope(context, ["read"], id);
            return processSchool(await Models.School.findById(id));
        },

        async bus(_, {id}: {id: string}, context) {
            if (!isValidId(id)) throw new UserInputError("bad_bus_id");
            const bus = await Models.Bus.findById(id);
            if (bus) {
                await authenticateSchoolScope(context, ["read"], bus.school_id);
            }
            return processBus(bus);
        },

        async stop(_, {id}: {id: string}, context) {
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

        async alert(_, {id}: {id: string}, context) {
            if (!isValidId(id)) throw new UserInputError("bad_alert_id");
            const alert = await Models.Alert.findById(id);
            if (alert) {
                await authenticateSchoolScope(context, ["read"], alert.school_id);
            }
            return processAlert(alert);
        },

        async dismissalTimeData(_, {id}: {id: string}, context) {
            if (!isValidId(id)) throw new UserInputError("bad_dismissal_time_data_id");
            const dismissalData = await Models.DismissalRange.findById(id)
            if (dismissalData) {
                await authenticateSchoolScope(context, ["read"], dismissalData.school_id)
            }
            return processDismissalData(dismissalData);
        },

        async bca(_a, _b, context) {
            const id = "5bca51e785aa2627e14db459";
            await authenticateSchoolScope(context, ["read"], id);
            return processSchool(await Models.School.findById(id));
        },

        async test(_a, _b, context) {
            authenticateUserScope(context, ["test"]);
            return "test";
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
                days_of_week: date.getUTCDay() // HACK: Better timezone support
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