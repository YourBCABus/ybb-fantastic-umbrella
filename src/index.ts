import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

import express from 'express';
import { json } from 'body-parser';
import mongoose from 'mongoose';
import * as admin from 'firebase-admin';

import { Bus } from './interfaces';
import { Models } from './models';

export interface BusLocationUpdateRequest {
  locations: string[];
  associate_time?: boolean;
  invalidate_time: any;
  source: string;
}

let isValidId = (id: string) => id && id.match(/^[0-9a-fA-F]{24}$/);
let authenticate = (permissions: string[]) => {
  let components = permissions.map(permission => permission.split("."));
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
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
      if (match) {
        if (components.reduce<boolean>((acc: boolean, comp: string[]) => {
          return acc && !!comp.reduce((acc: any, component: string) => {
            return acc ? acc[res.locals.school ? component.replace("{school}", res.locals.school._id) : component] : null;
          }, match.permissions);
        }, true)) {
          return next();
        }
      }

      res.status(403).json({error: "forbidden"});
    } catch (e) {
      next(e);
    }
  };
}
let processNotificationText = (text: string, bus: Bus) => {
  let location = (bus.locations && bus.locations.length > 0) ? bus.locations[0] : "?";
  return text.replace(/\${name}/gi, bus.name || "").replace(/\${location}/gi, location);
};

const config = JSON.parse(fs.readFileSync(path.join(__dirname, "../config.json"), "utf8"));
let serviceAccount: admin.ServiceAccount;

try {
  serviceAccount = JSON.parse(fs.readFileSync(path.join(__dirname, "../service-account.json"), "utf8"));
} catch (e) {
  console.log("Failed to read service-account.json:");
  console.log(e.stack);
  console.log("Push notifications will not be sent.")
}

mongoose.connect(config.mongo);

if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const app = express();
app.use(json());

app.use("/schools/:school", async (req, res, next) => {
  try {
    if (!isValidId(req.params.school)) {
      return res.status(400).json({error: "bad_school_id"});
    }

    res.locals.school = await Models.School.findById(req.params.school);
    return res.locals.school ? next() : res.status(404).json({error: "school_not_found"});
  } catch (e) {
    next(e);
  }
});

app.get("/schools/:school", async (_, res, next) => {
  try {
    res.json(res.locals.school);
  } catch (e) {
    next(e);
  }
});

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

app.post("/schools/:school/buses", authenticate(["{school}.bus.create"]), async (req, res, next) => {
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

app.put("/schools/:school/buses/:bus", authenticate(["{school}.bus.update"]), async (req, res, next) => {
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

app.patch("/schools/:school/buses/:bus", authenticate(["{school}.bus.update"]), async (req, res, next) => {
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

app.delete("/schools/:school/buses/:bus", authenticate(["{school}.bus.delete"]), async (_, res, next) => {
  try {
    await Models.BusLocationHistory.deleteMany({bus_id: res.locals.bus._id});
    await res.locals.bus.delete();
    res.json({ok: true});
  } catch (e) {
    next(e);
  }
});

app.put("/schools/:school/buses/:bus/location", authenticate(["{school}.bus.location"]), async (req, res, next) => {
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
      console.log("Sending message over FCM...");

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
        }
      };

      admin.messaging().send(message as any).then(_ => console.log("Successfully sent."));
    }
  } catch (e) {
    next(e);
  }
});

app.get("/schools/:school/buses/:bus/stops", async (_, res, next) => {
  try {
    res.json(await Models.Stop.find({bus_id: res.locals.bus._id}));
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
    res.json(res.locals.stop);
  } catch (e) {
    next(e);
  }
});

app.listen(config.port, config.bindTo);
