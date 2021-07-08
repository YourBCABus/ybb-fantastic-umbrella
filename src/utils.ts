import { Request, Response, NextFunction } from "express";
import { School, Bus, Stop, Coordinate, BusLocationHistory, Alert, DismissalRange, Point, Color } from './interfaces';
import crypto from "crypto";
import { Models } from "./models";
import { AlertColorInput } from "./graphql/inputinterfaces";

/**
 * A utility function that checks whether a given string is a valid MongoDB object ID.
 * @param id - string to be checked
 * @returns true if id is a valid MongoDB object ID
 */
export const isValidId = (id: string) => id && id.match(/^[0-9a-fA-F]{24}$/);

/**
 * Middleware that authenticates a client using the old auth system.
 * @deprecated
 * @param permission - permission required to access the API endpoint
 * @returns an Express middleware function
 */
export const authenticate = (permission: string) => {
    let components = permission.split(".");
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            let authorization = req.get("Authorization");
            if (!authorization) {
                return res.status(401).json({error: "unauthorized"});
            }
            if (!authorization.startsWith("Basic ")) {
                return res.status(400).json({error: "invalid_authorization"});
            }

            let token = authorization.slice(6);
            if (token.length !== 44) {
                return res.status(400).json({error: "invalid_authorization"});
            }

            let hash = crypto.createHash("sha256");
            hash.update(Buffer.from(token, "base64"));
            let tokenHash = hash.digest("base64");

            let match = await Models.AuthToken.findOne({tokenHash});
            res.locals.auth = match;
            if (match) {
                if (match.admin || (match.school_id === res.locals.school._id.toString() && components.reduce((acc: any, component: string) => {
                    return acc ? acc[component] : null;
                }, match))) {
                    return next();
                }
            }

            res.status(403).json({error: "forbidden"});
        } catch (e) {
            next(e);
        }
    };
}

/**
 * Process a {@link Coordinate} for output.
 * @param coordinate - coordinate
 * @returns processed location
 */
function processCoordinate(coordinate?: Coordinate | {}) {
    if (!coordinate) return;
    if (typeof (coordinate as Partial<Coordinate>).latitude === "undefined") return;
    if (typeof (coordinate as Partial<Coordinate>).longitude === "undefined") return;
    return { lat: (coordinate as Coordinate).latitude, long: (coordinate as Coordinate).longitude };
}

/**
 * Process a {@link Point} for output.
 * @param point - GeoJSON point
 * @returns processed location
 */
function processPoint(point?: Point) {
    if (!point) return;
    if (typeof (point as Partial<Point>).coordinates === "undefined") return;
    return { lat: point.coordinates[0], long: point.coordinates[1] };
}

/**
 * Process a {@link School} for output.
 * @param school - school
 * @returns processed school
 */
export function processSchool(school?: School | null) {
    return school && {
        id: school._id,
        name: school.name,
        location: processCoordinate(school.location),
        available: school.available,
        timeZone: school.timezone
    }
}

/**
 * Process a {@link Bus} for output.
 * @param bus - bus
 * @returns processed bus
 */
export function processBus(bus?: Bus | null) {
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

/**
 * Process a {@link BusLocationHistory | BusLocationHistory entry} for output.
 * @param entry - bus location history entry
 * @returns processed bus location history entry
 */
export function processHistoryEntry(entry?: BusLocationHistory | null) {
    return entry && {
        busID: entry.bus_id,
        time: entry.time,
        locations: entry.locations,
        source: entry.source
    };
}

/**
 * Process a {@link Stop} for output.
 * @param stop - stop
 * @returns processed stop
 */
export function processStop(stop?: Stop | null) {
    return stop && {
        id: stop._id,
        busID: stop.bus_id,
        name: stop.name,
        description: stop.description,
        location: processPoint(stop.coords),
        order: stop.order,
        available: stop.available,
        arrivalTime: stop.arrival_time,
        invalidateTime: stop.invalidate_time
    };
}

/**
 * Process an {@link Alert} for output.
 * @param alert - alert
 * @returns processed alert
 */
export function processAlert(alert?: Alert | null) {
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

/**
 * Process a {@link DismissalRange | DismissalRange entry} for output.
 * @param data - dismissal time data
 * @returns processed dismissal time data
 */
export function processDismissalData(data?: DismissalRange | null) {
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

/**
 * Checks if an RGBA color is valid.
 * @param param0 - RGBA color
 * @returns true if the color is valid
 */
function isValidRGBA({r, g, b, alpha}: {r: number, g: number, b: number, alpha: number}): boolean {
    if (r < 0 || r > 255 || r !== Math.floor(r)) return false;
    if (g < 0 || g > 255 || g !== Math.floor(r)) return false;
    if (b < 0 || b > 255 || b !== Math.floor(r)) return false;
    if (alpha < 0 || alpha > 255 || alpha !== Math.floor(r)) return false;
    return true;
}

/**
 * Converts a {@link AlertColorInput} to a {@link Color}, throwing if the color is invalid.
 * @param input - AlertColorInput object
 * @returns a Color object
 * @throws if input is invalid
 */
export function convertColorInput(input: AlertColorInput): Color {
    if (!isValidRGBA(input)) throw new Error("Bad color");
    let color: Color = {name: input.name, r: input.r, g: input.g, b: input.b, alpha: input.alpha, appearances: {}}
    input.appearances.forEach(appearance => {
        if (color.appearances![appearance.appearance]) throw new Error("Bad color");
        if (appearance.appearance === "__proto__" || appearance.appearance === "prototype") throw new Error("Bad color");
        if (!isValidRGBA(appearance)) throw new Error("Bad color");
        color.appearances![appearance.appearance] = {name: appearance.name, r: appearance.r, g: appearance.g, b: appearance.b, alpha: appearance.alpha};
    });
    return color;
}

/**
 * Checks to see if a list of days of the week is valid.
 * @see {@link DismissalRange.days_of_week}
 * @param days - list of days of week (numbers from 0 to 6)
 * @returns true if the list is valid
 */
export function isValidDaysOfWeek(days: number[]): boolean {
    const set = new Set(days);
    if (days.length !== set.size) return false;
    if (days.find(day => day !== 0 && day !== 1 && day !== 2 && day !== 3 && day !== 4 && day !== 5 && day !== 6)) return false;
    return true;
}