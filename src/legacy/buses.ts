import {Bus, ServerProviderArguments} from "../interfaces";
import {Models} from "../models";
import {authenticate, isValidId} from "../utils";
export interface BusLocationUpdateRequest {
  locations: string[];
  associate_time?: boolean;
  invalidate_time: any;
  source: string;
}

function boardingAreaToLocations(bus: Bus): Bus & {locations: string[]} {
  return {
    _id: bus._id,
    school_id: bus.school_id,
    name: bus.name,
    numbers: bus.numbers,
    phone: bus.phone,
    available: bus.available,
    other_names: bus.other_names,
    boarding_area: bus.boarding_area,
    locations: bus.boarding_area ? [bus.boarding_area] : [],
    boarding: bus.boarding,
    departure: bus.departure,
    invalidate_time: bus.invalidate_time
  }
}

export default ({app, config}: ServerProviderArguments) => {
  app.get("/schools/:school/buses", async (_, res, next) => {
    try {
      res.json((await Models.Bus.find({school_id: res.locals.school._id})).map(boardingAreaToLocations));
    } catch (e) {
      next(e);
    }
  });

  app.use("/schools/:school/buses/:bus", async (req, res, next) => {
    try {
      if (!isValidId(req.params.bus)) {
        return res.status(400).json({error: "bad_bus_id"});
      }

      res.locals.bus = await Models.Bus.findOne({school_id: res.locals.school._id, _id: req.params.bus});
      return res.locals.bus ? next() : res.status(404).json({error: "bus_not_found"});
    } catch (e) {
      next(e);
    }
  });

  app.get("/schools/:school/buses/:bus", async (_, res, next) => {
    try {
      res.json(boardingAreaToLocations(res.locals.bus));
    } catch (e) {
      next(e);
    }
  });
};