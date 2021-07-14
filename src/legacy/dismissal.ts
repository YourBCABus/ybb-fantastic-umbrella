import {DismissalRange, ServerProviderArguments} from "../interfaces";
import {Models} from "../models";
import {authenticate, isValidId} from "../utils";

export default ({app}: ServerProviderArguments) => {
  app.get("/schools/:school/dismissal", async (req, res, next) => {
    if (typeof req.query.date !== "string") {
      return res.status(400).json({error: "bad_date"});
    }

    let date = parseInt(req.query.date);

    if (Number.isNaN(date)) {
      return res.status(400).json({error: "bad_date"});
    }

    let range = await Models.DismissalRange.findOne({
      school_id: res.locals.school._id,
      end_date: {$gte: date},
      start_date: {$lte: date},
      days_of_week: new Date(date * 1000).getUTCDay()
    }).sort("start_date");

    res.json(range ? {
      ok: true,
      found: true,
      dismissal_time: range.dismissal_time,
      departure_time: range.departure_time,
      start_time: range.start_time,
      end_time: range.end_time
    } : {
      ok: true,
      found: false
    });
  });

  app.get("/schools/:school/dismissal/ranges", async (req, res, next) => {
    try {
      let query: any = {school_id: res.locals.school._id};

      if (req.query.date) {
        if (typeof req.query.date !== "string") {
          return res.status(400).json({ error: "bad_date" });
        }
        if (Number.isNaN(parseInt(req.query.date))) {
          res.status(400).json({error: "bad_date"});
        }
        query.end_date = {$gte: parseInt(req.query.date)};
      }

      res.json(await Models.DismissalRange.find(query).sort({start_date: 1}));
    } catch (e) {
      next(e);
    }
  });

  app.use("/schools/:school/dismissal/ranges/:range", async (req, res, next) => {
    try {
      if (!isValidId(req.params.range)) {
        return res.status(400).json({error: "bad_range_id"});
      }

      res.locals.range = await Models.DismissalRange.findOne({school_id: res.locals.school._id, _id: req.params.range});
      return res.locals.range ? next() : res.status(404).json({error: "range_not_found"});
    } catch (e) {
      next(e);
    }
  });

  app.get("/schools/:school/dismissal/ranges/:range", async (_, res, next) => {
    try {
      res.json(res.locals.range);
    } catch (e) {
      next(e);
    }
  });
};