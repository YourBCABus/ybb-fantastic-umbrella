import {Alert, ServerProviderArguments} from "../interfaces";
import {Models} from "../models";
import {authenticate, isValidId} from "../utils";

export default ({app}: ServerProviderArguments) => {
  app.get("/schools/:school/alerts", async (req, res, next) => {
    try {
      res.json(await Models.Alert.find({school_id: res.locals.school._id}));
    } catch (e) {
      next(e);
    }
  });

  app.use("/schools/:school/alerts/:alert", async (req, res, next) => {
    try {
      if (!isValidId(req.params.alert)) {
        return res.status(400).json({error: "bad_alert_id"});
      }

      res.locals.alert = await Models.Alert.findOne({school_id: res.locals.school._id, _id: req.params.alert});
      return res.locals.alert ? next() : res.status(404).json({error: "alert_not_found"});
    } catch (e) {
      next(e);
    }
  });

  app.get("/schools/:school/alerts/:alert", async (_, res, next) => {
    try {
      res.json(res.locals.alert);
    } catch (e) {
      next(e);
    }
  });
};