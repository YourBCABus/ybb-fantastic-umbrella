import { AuthenticationError, IResolvers, UserInputError } from 'apollo-server-express';
import { AlertType, Color } from '../interfaces';
import { Models } from '../models';
import { convertColorInput, isValidDaysOfWeek, isValidId } from '../utils';
import Scalars from './datehandling';
import { authenticateRestrictedScope, authenticateSchoolScope, authenticateUserScope } from '../auth/context';
import { processSchool, processBus, processStop, processHistoryEntry, processAlert, processDismissalData } from '../utils';
import Context from './context';
import { schoolScopes } from '../auth/scopes';
import { AlertInput, DismissalTimeDataInput, StopInput, SchoolInput, BusInput, BusStatusInput } from './inputinterfaces';

/**
 * Resolvers for the GraphQL API.
 */
const resolvers: IResolvers<any, Context> = {
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

        async test(_a, _b, context) {
            await authenticateUserScope(context, ["test"]);
            return "test";
        }
    },

    Mutation: {
        async createSchool(_, { school: { name, location, available, timeZone, publicScopes }}: {
            school: SchoolInput
        }, context) {
            await authenticateRestrictedScope(context, ["admin.school.create"]);

            const school = new Models.School({
                name,
                location: location && {latitude: location.lat, longitude: location.long},
                available,
                timezone: timeZone,
                public_scopes: []
            });

            if (publicScopes.find(scope => !schoolScopes.has(scope)) !== undefined) throw new UserInputError("Invalid scopes");
            const scopes = new Set(publicScopes);
            school.public_scopes = [...scopes.values()];

            await school.save();
            return processSchool(school);
        },

        async updateSchool(_, { schoolID, school: { name, location, available, timeZone, publicScopes }}: {
            schoolID: string,
            school: SchoolInput
        }, context) {
            if (!isValidId(schoolID)) throw new UserInputError("bad_school_id");
            await authenticateSchoolScope(context, ["school.manage"], schoolID);

            if (publicScopes.find(scope => !schoolScopes.has(scope)) !== undefined) throw new UserInputError("Invalid scopes");
            const scopes = new Set(publicScopes);

            let school = await Models.School.findOne({
                _id: schoolID,
            });

            school!.name = name;
            school!.location = location && {latitude: location.lat, longitude: location.long};
            school!.available = available;
            school!.timezone = timeZone;
            school!.public_scopes = [...scopes.values()];

            await school!.save();

            return processSchool(school);
        },

        async createBus(_, { schoolID, bus: { otherNames, available, name, company, phone } }: {
            schoolID: string,
            bus: BusInput
        }, context) {
            if (!isValidId(schoolID)) throw new UserInputError("bad_school_id");
            await authenticateSchoolScope(context, ["bus.create"], schoolID);

            const bus = new Models.Bus({
                school_id: schoolID,
                other_names: otherNames,
                available,
                name,
                company,
                phone
            });

            await bus.save();
            return processBus(bus);
        },
      
        async updateBus(_, { busID, bus: { otherNames, available, name, company, phone } }: {
            busID: string,
            bus: BusInput
        }, context) {
            if (!isValidId(busID)) throw new UserInputError("bad_bus_id");
            
            let bus = await Models.Bus.findOne({
                _id: busID,
            });
            
            if (!bus) throw new AuthenticationError("Forbidden");

            await authenticateSchoolScope(context, ["bus.update"], bus.school_id);

            bus.name = name;
            bus.other_names = [...new Set(otherNames)];
            bus.available = available;
            bus.company = company;
            bus.phone = phone;

            await bus.save();

            return processBus(bus);
        },

        async updateBusStatus(_, {busID, status: {invalidateTime, locations}}: {
            busID: string,
            status: BusStatusInput,
        }, context) {
            if (!isValidId(busID)) throw new UserInputError("bad_bus_id");
            
            let bus = await Models.Bus.findById(busID);
            if (!bus) throw new AuthenticationError("Forbidden");
            
            await authenticateSchoolScope(context, ["bus.updateStatus"], bus.school_id);

            bus.invalidate_time = invalidateTime;
            bus.locations = locations;

            await bus.save();

            return processBus(bus);
        },

        async createStop(_, { busID, stop: { name, description, location, order, arrivalTime, invalidateTime, available } }: {
            busID: string,
            stop: StopInput
        }, context) {
            if (!isValidId(busID)) throw new UserInputError("bad_bus_id");
            const bus = await Models.Bus.findById(busID);
            if (!bus) throw new AuthenticationError("Forbidden");
            await authenticateSchoolScope(context, ["stop.create"], bus.school_id);

            const stop = new Models.Stop({
                bus_id: busID,
                name,
                description,
                coords: location && {type: "Point", coordinates: [location.lat, location.long]},
                order,
                arrival_time: arrivalTime,
                invalidate_time: invalidateTime,
                available
            });
            
            await stop.save();
            return processStop(stop);
        },

        async updateStop(_, { stopID, stop: { name, description, location, order, arrivalTime, invalidateTime, available } }: {
            stopID: string,
            stop: StopInput,
        }, context) {
            if (!isValidId(stopID)) throw new UserInputError("bad_stop_id");
            let stop = await Models.Stop.findById(stopID);
            if (!stop) throw new AuthenticationError("Forbidden");
            const bus = await Models.Bus.findById(stop.bus_id);
            if (!bus) throw new Error("internal_server_error");
            await authenticateSchoolScope(context, ["stop.update"], bus.school_id);

            stop.name = name;
            stop.description = description;
            stop.coords = location && {type: "Point", coordinates: [location.lat, location.long]};
            stop.order = order;
            stop.arrival_time = arrivalTime;
            stop.invalidate_time = invalidateTime;
            stop.available = available;

            await stop.save();
            return processStop(stop);
        },

        async deleteStop(_, {stopID}: {stopID: string}, context) {
            if (!isValidId(stopID)) throw new UserInputError("bad_stop_id");
            let stop = await Models.Stop.findById(stopID);
            if (!stop) throw new AuthenticationError("Forbidden");
            const bus = await Models.Bus.findById(stop.bus_id);
            if (!bus) throw new Error("internal_server_error");
            await authenticateSchoolScope(context, ["stop.delete"], bus.school_id);

            await Models.Stop.remove({_id: stopID});

            return stopID;
        },

        async createAlert(_, { schoolID, alert: { start, end, type, title, content, dismissable } }: {
            schoolID: string,
            alert: AlertInput
        }, context) {
            if (!isValidId(schoolID)) throw new UserInputError("bad_school_id");

            let alertType: AlertType | undefined;
            if (type) {
                try {
                    alertType = {name: type.name, color: convertColorInput(type.color)}
                } catch (_) {
                    throw new UserInputError("bad_color");
                }
            }

            if (start > end) {
                throw new UserInputError("bad_dates");
            }

            await authenticateSchoolScope(context, ["alert.create"], schoolID);

            const alert = new Models.Alert({
                school_id: schoolID,
                start_date: Math.floor(start.getTime() / 1000),
                end_date: Math.floor(end.getTime() / 1000),
                type: alertType,
                title,
                content,
                can_dismiss: dismissable
            });

            await alert.save();
            return processAlert(alert);
        },

        async updateAlert(_, { alertID, alert: { start, end, type, title, content, dismissable } }: {
            alertID: string,
            alert: AlertInput
        }, context) {
            if (!isValidId(alertID)) throw new UserInputError("bad_alert_id");

            let alertType: AlertType | undefined;
            if (type) {
                try {
                    alertType = { name: type.name, color: convertColorInput(type.color) }
                } catch (_) {
                    throw new UserInputError("bad_color");
                }
            }

            if (start > end) {
                throw new UserInputError("bad_dates");
            }

            const alert = await Models.Alert.findById(alertID);
            if (!alert) throw new AuthenticationError("Forbidden");
            await authenticateSchoolScope(context, ["alert.update"], alert.school_id);

            alert.start_date = Math.floor(start.getTime() / 1000);
            alert.end_date = Math.floor(end.getTime() / 1000);
            alert.type = alertType;
            alert.title = title;
            alert.content = content;
            alert.can_dismiss = dismissable;

            await alert.save();
            return processAlert(alert);
        },

        async addDismissalTimeData(_, { schoolID, data: { startDate, endDate, dismissalTime, alertStartTime, alertEndTime, daysOfWeek } }: {
            schoolID: string,
            data: DismissalTimeDataInput
        }, context) {
            if (!isValidId(schoolID)) throw new UserInputError("bad_school_id");
            if (startDate > endDate) throw new UserInputError("bad_dates");
            if (!isValidDaysOfWeek(daysOfWeek)) throw new UserInputError("bad_days_of_week");
            await authenticateSchoolScope(context, ["dismissalTimeData.create"], schoolID);
            const data = new Models.DismissalRange({
                school_id: schoolID,
                start_date: Math.floor(startDate.getTime() / 1000),
                end_date: Math.floor(endDate.getTime() / 1000),
                start_time: alertStartTime,
                end_time: alertEndTime,
                dismissal_time: dismissalTime,
                days_of_week: daysOfWeek
            });
            await data.save();
            return processDismissalData(data);
        },

        async updateDismissalTimeData(_, { dataID, data: { startDate, endDate, dismissalTime, alertStartTime, alertEndTime, daysOfWeek } }: {
            dataID: string,
            data: DismissalTimeDataInput
        }, context) {
            if (!isValidId(dataID)) throw new UserInputError("bad_data_id");
            if (startDate > endDate) throw new UserInputError("bad_dates");
            if (!isValidDaysOfWeek(daysOfWeek)) throw new UserInputError("bad_days_of_week");
            const data = await Models.DismissalRange.findById(dataID);
            if (!data) throw new AuthenticationError("Forbidden");
            await authenticateSchoolScope(context, ["dismissalTimeData.update"], data.school_id);
            
            data.start_date = Math.floor(startDate.getTime() / 1000);
            data.end_date = Math.floor(endDate.getTime() / 1000);
            data.start_time = alertStartTime;
            data.end_time = alertEndTime;
            data.dismissal_time = dismissalTime;
            data.days_of_week = daysOfWeek;

            await data.save();
            return processDismissalData(data);
        },
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
                ...color.appearances![appearanceName]
            })) : [];
        },
        
        color(color: Color, {appearance}: {appearance: string}) {
            const resolved = color.appearances && color.appearances[appearance];
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