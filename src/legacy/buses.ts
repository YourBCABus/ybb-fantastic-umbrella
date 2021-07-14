import {Bus, ServerProviderArguments} from "../interfaces";
import {Models} from "../models";
import {authenticate, isValidId} from "../utils";
export interface BusLocationUpdateRequest {
  locations: string[];
  associate_time?: boolean;
  invalidate_time: any;
  source: string;
}

export default ({app, config}: ServerProviderArguments) => {
  app.get("/schools/:school/buses", async (_, res, next) => {
    try {
      res.json(await Models.Bus.find({school_id: res.locals.school._id}));
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
      res.json(res.locals.bus);
    } catch (e) {
      next(e);
    }
  });
};