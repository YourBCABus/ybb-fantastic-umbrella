import {Alert, ServerProviderArguments} from "./interfaces";
import {Models} from "./models";
import {authenticate, isValidId} from "./utils";

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

  app.post("/schools/:school/alerts", authenticate("alerts"), async (req, res, next) => {
    try {
      let alertData: Partial<Alert> = req.body;
      alertData.school_id = res.locals.school._id;

      let alert = new Models.Alert(alertData);
      try {
        await alert.validate();
      } catch (e) {
        return res.status(400).json({error: "bad_alert"});
      }

      await alert.save();
      res.json({ok: true, id: alert._id});
    } catch (e) {
      next(e);
    }
  });

  app.put("/schools/:school/alerts/:alert", authenticate("alerts"), async (req, res, next) => {
    try {
      let alertData: Partial<Alert> = req.body;
      alertData.school_id = res.locals.school._id;

      try {
        await new Models.Alert(alertData).validate();
      } catch (e) {
        return res.status(400).json({error: "bad_alert"});
      }

      await res.locals.alert.update(alertData, {runValidators: true, overwrite: true});
      res.json({ok: true});
    } catch (e) {
      next(e);
    }
  });

  app.patch("/schools/:school/alerts/:alert", authenticate("alerts"), async (req, res, next) => {
    try {
      let alertData: Partial<Alert> = req.body;

      if (alertData.school_id && alertData.school_id !== res.locals.school._id) {
        return res.status(400).json({error: "bad_school_id", comment: "Nice try. - anli5005"});
      }

      res.locals.alert.set(alertData);
      try {
        await res.locals.alert.validate();
      } catch (e) {
        return res.status(400).json({error: "bad_alert"});
      }

      await res.locals.alert.save();
      res.json({ok: true});
    } catch (e) {
      next(e);
    }
  });

  app.delete("/schools/:school/alerts/:alert", authenticate("alerts"), async (_, res, next) => {
    try {
      await res.locals.alert.delete();
      res.json({ok: true});
    } catch (e) {
      next(e);
    }
  });
};