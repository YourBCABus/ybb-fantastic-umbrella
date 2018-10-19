import fs from 'fs';
import path from 'path';

import express from 'express';
import { json } from 'body-parser';
import mongoose from 'mongoose';

import { Models } from './models';

let isValidId = (id: string) => id && id.match(/^[0-9a-fA-F]{24}$/);

const config = JSON.parse(fs.readFileSync(path.join(__dirname, "../config.json"), "utf8"));

mongoose.connect(config.mongo);

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
