import {ServerProviderArguments, Stop} from "../interfaces";
import {Models} from "../models";
import {authenticate, isValidId} from "../utils";

export default ({app}: ServerProviderArguments) => {
  app.get("/schools/:school/buses/:bus/stops", async (_, res, next) => {
    try {
      res.json((await Models.Stop.find({bus_id: res.locals.bus._id})).map(stop => {
        stop.location = {longitude: stop.coords.coordinates[0], latitude: stop.coords.coordinates[1]};
        return stop;
      }));
    } catch (e) {
      next(e);
    }
  });

  app.get("/schools/:school/stops/nearby", async (req, res, next) => {
    try {
      if (typeof req.query.longitude !== "string" || typeof req.query.latitude !== "string") {
        return res.status(400).json({ error: "invalid_coordinates" });
      }

      const longitude = parseFloat(req.query.longitude);
      const latitude  = parseFloat(req.query.latitude);

      if (Number.isNaN(longitude) || Number.isNaN(latitude)) {
        return res.status(400).json({error: "invalid_coordinates"});
      }

      let nearQuery: {$geometry: {type: string, coordinates: number[]}, $maxDistance?: number} = {
        $geometry: {
          type: "Point",
          coordinates: [longitude, latitude]
        }
      };

      if (req.query.distance && typeof req.query.distance === "string") {
        const maxDistance = parseInt(req.query.distance);
        if (!Number.isNaN(maxDistance)) {
          nearQuery.$maxDistance = maxDistance;
        }
      }

      res.json((await Models.Stop.find({
        bus_id: {
          $in: (await Models.Bus.find({school_id: res.locals.school._id}).select("_id")).map(bus => bus._id)
        },
        coords: {
          $nearSphere: nearQuery
        }
      }).limit(3)).map(stop => {
        stop.location = {longitude: stop.coords.coordinates[0], latitude: stop.coords.coordinates[1]};
        return stop;
      }));
    } catch (e) {
      next(e);
    }
  });

  app.use("/schools/:school/buses/:bus/stops/:stop", async (req, res, next) => {
    try {
      if (!isValidId(req.params.stop)) {
        return res.status(400).json({error: "bad_stop_id"});
      }

      res.locals.stop = await Models.Stop.findOne({bus_id: res.locals.bus._id, _id: req.params.stop});
      return res.locals.stop ? next() : res.status(404).json({error: "stop_not_found"});
    } catch (e) {
      next(e);
    }
  });

  app.get("/schools/:school/buses/:bus/stops/:stop", async (_, res, next) => {
    try {
      res.locals.stop.location = {longitude: res.locals.stop.coords.coordinates[0], latitude: res.locals.stop.coords.coordinates[1]};
      res.json(res.locals.stop);
    } catch (e) {
      next(e);
    }
  });

  app.post("/schools/:school/buses/:bus/stops", authenticate("stop.create"), async (req, res, next) => {
    try {
      let stopData: Partial<Stop> = req.body;
      stopData.bus_id = res.locals.bus._id;

      let stop = new Models.Stop(stopData);
      try {
        await stop.validate();
      } catch (e) {
        return res.status(400).json({error: "bad_stop", comment: e.message});
      }

      await stop.save();
      res.json({ok: true, id: stop._id});
    } catch (e) {
      next(e);
    }
  });

  app.put("/schools/:school/buses/:bus/stops/:stop", authenticate("stop.update"), async (req, res, next) => {
    try {
      let stopData: Partial<Stop> = req.body;
      stopData.bus_id = res.locals.bus._id;

      try {
        await new Models.Stop(stopData).validate();
      } catch (e) {
        return res.status(400).json({error: "bad_stop", comment: e.message});
      }

      await res.locals.stop.update(stopData, {runValidators: true, overwrite: true});
      res.json({ok: true});
    } catch (e) {
      next(e);
    }
  });

  app.patch("/schools/:school/buses/:bus/stops/:stop", authenticate("stop.update"), async (req, res, next) => {
    try {
      let stopData: Partial<Stop> = req.body;

      if (stopData.bus_id && stopData.bus_id !== res.locals.bus._id) {
        return res.status(400).json({error: "mismatched_bus_id", comment: "Nice try. - anli5005"});
      }

      res.locals.stop.set(stopData);
      try {
        await res.locals.stop.validate();
      } catch (e) {
        return res.status(400).json({error: "bad_stop"});
      }

      await res.locals.stop.save();
      res.json({ok: true});
    } catch (e) {
      next(e);
    }
  });

  app.delete("/schools/:school/buses/:bus/stops/:stop", authenticate("stop.delete"), async (_, res, next) => {
    try {
      await res.locals.stop.delete();
      res.json({ok: true});
    } catch (e) {
      next(e);
    }
  });

  app.post("/schools/:school/buses/:bus/stopsuggest", authenticate("stop.suggest"), async (req, res, next) => {
    try {
      if (!(req.body.location && (typeof req.body.location.latitude === "number" && typeof req.body.location.longitude === "number"))) {
        return res.status(400).json({error: "bad_location"});
      }

      let time: Date | undefined;
      if (req.body.time) {
        time = new Date(req.body.time);

        if (isNaN(time.getTime())) {
          return res.status(400).json({error: "bad_time"});
        }
      }

      let stopSuggestion = new Models.StopSuggestion({
        bus_id: res.locals.bus._id,
        time,
        source: res.locals.auth._id,
        location: req.body.location
      });

      await stopSuggestion.save();

      res.json({ok: true});
    } catch (e) {
      next(e);
    }
  });
}