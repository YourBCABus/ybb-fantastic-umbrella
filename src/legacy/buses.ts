import {Bus, ServerProviderArguments} from "../interfaces";
import {Models} from "../models";
import {authenticate, isValidId} from "../utils";
import * as admin from "firebase-admin";
import {BusLocationUpdateRequest} from "../index";

export const processNotificationText = (text: string, bus: Bus) => {
  let location = (bus.locations && bus.locations.length > 0) ? bus.locations[0] : "?";
  let result = text.replace(/\${name}/gi, bus.name || "").replace(/\${location}/gi, location);
  if (typeof bus.departure !== "undefined") {
      let hour = Math.floor(bus.departure / 60) % 12;
      let minute = bus.departure % 60;
      result += ` It will depart at ${hour === 0 ? 12 : hour}:${minute < 10 ? ("0" + minute.toString()) : minute} ${bus.departure >= 12 * 60 ? "PM" : "AM"}.`;
  }
  return result;
};

export default ({app, config, serviceAccount}: ServerProviderArguments) => {
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

  app.post("/schools/:school/buses", authenticate("bus.create"), async (req, res, next) => {
    try {
      let busData: Partial<Bus> = req.body;
      busData.school_id = res.locals.school._id;

      let bus = new Models.Bus(busData);
      try {
        await bus.validate();
      } catch (e) {
        return res.status(400).json({error: "bad_bus"});
      }

      await bus.save();
      res.json({ok: true, id: bus._id});
    } catch (e) {
      next(e);
    }
  });

  app.put("/schools/:school/buses/:bus", authenticate("bus.update"), async (req, res, next) => {
    try {
      let busData: Partial<Bus> = req.body;
      busData.school_id = res.locals.school._id;

      try {
        await new Models.Bus(busData).validate();
      } catch (e) {
        return res.status(400).json({error: "bad_bus"});
      }

      await res.locals.bus.update(busData, {runValidators: true, overwrite: true});
      res.json({ok: true});
    } catch (e) {
      next(e);
    }
  });

  app.patch("/schools/:school/buses/:bus", authenticate("bus.update"), async (req, res, next) => {
    try {
      let busData: Partial<Bus> = req.body;

      if (busData.school_id && busData.school_id !== res.locals.school._id) {
        return res.status(400).json({error: "bad_school_id", comment: "Nice try. - anli5005"});
      }

      res.locals.bus.set(busData);
      try {
        await res.locals.bus.validate();
      } catch (e) {
        return res.status(400).json({error: "bad_bus"});
      }

      await res.locals.bus.save();
      res.json({ok: true});
    } catch (e) {
      next(e);
    }
  });

  app.delete("/schools/:school/buses/:bus", authenticate("bus.delete"), async (_, res, next) => {
    try {
      await Models.BusLocationHistory.deleteMany({bus_id: res.locals.bus._id});
      await res.locals.bus.delete();
      res.json({ok: true});
    } catch (e) {
      next(e);
    }
  });

  app.put("/schools/:school/buses/:bus/location", authenticate("bus.location"), async (req, res, next) => {
    try {
      let now = new Date();
      let body: BusLocationUpdateRequest = req.body;
      if (!body.locations) {
        return res.status(400).json({error: "no_locations"});
      }
      if (body.locations.find(el => typeof el !== "string")) {
        return res.status(400).json({error: "invalid_locations"});
      }
      if (typeof body.source !== "string") {
        return res.status(400).json({error: "invalid_source"});
      }
      if (!body.invalidate_time) {
        return res.status(400).json({error: "no_invalidate_time"});
      }
      let invalidate_time = new Date(body.invalidate_time);
      if (isNaN(invalidate_time.getTime()) || invalidate_time < now) {
        return res.status(400).json({error: "invalid_invalidate_time"});
      }

      let historyEntry = new Models.BusLocationHistory({bus_id: res.locals.bus._id, locations: body.locations, source: body.source});
      if (body.associate_time) {
        historyEntry.time = now;
      }

      await historyEntry.save();

      res.locals.bus.set({locations: body.locations, invalidate_time});
      await res.locals.bus.save();

      res.json({ok: true});

      if (serviceAccount && body.locations.length > 0) {
        console.log(`Sending message over FCM for ${res.locals.bus.name}.`);

        let message = {
          topic: `school.${res.locals.school._id}.bus.${res.locals.bus._id}`,
          notification: {
            title: processNotificationText(config.notification.title, res.locals.bus),
            body: processNotificationText(config.notification.text, res.locals.bus)
          },
          data: {
            bus: res.locals.bus._id.toString(),
            location: body.locations[0],
            invalidate_time: invalidate_time.toJSON(),
            source: body.source,
            time: new Date().toJSON()
          },
          apns: {
            payload: {
              aps: {
                sound: "default"
              }
            }
          }
        };

        admin.messaging().send(message as any).then(_ => console.log(`Successfully sent for ${res.locals.bus.name}.`));
      }
    } catch (e) {
      next(e);
    }
  });

  app.put("/schools/:school/buses/:bus/departure", authenticate("bus.location"), async (req, res, next) => {
    try {
      let body: {departure: number} = req.body;
      if (typeof body.departure === "number") {
        if (body.departure < 0 || body.departure > 24 * 60 * 60) {
          return res.status(400).json({error: "invalid_departure"});
        }
      } else if (typeof body.departure !== "undefined") {
        return res.status(400).json({error: "invalid_departure"});
      }

      res.locals.bus.set({departure: body.departure});
      await res.locals.bus.save();

      res.json({ok: true});
    } catch (e) {
      next(e);
    }
  });

  app.get("/schools/:school/buses/:bus/last10", async (_, res, next) => {
    try {
      res.json((await Models.BusLocationHistory.find({bus_id: res.locals.bus._id, "locations.0": {$exists: true}}).sort([["_id", -1]]).limit(10)).map(history => {
        return {
          locations: history.locations,
          time: history.time || new Date(parseInt(history._id.substring(0, 8), 16) * 1000)
        }
      }));
    } catch (e) {
      next(e);
    }
  });
};