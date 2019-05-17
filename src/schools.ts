import {ServerProviderArguments} from "./interfaces";
import {isValidId} from "./utils";
import {Models} from "./models";

export default ({app}: ServerProviderArguments) => {
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
};