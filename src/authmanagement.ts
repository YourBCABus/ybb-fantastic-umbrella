import {AuthToken, ServerProviderArguments} from "./interfaces";
import {authenticate, isValidId} from "./utils";
import {Models} from "./models";
import {promisify} from "util";
import crypto from "crypto";

export default ({app}: ServerProviderArguments) => {
  app.get("/schools/:school/auth", authenticate("auth"), async (req, res, next) => {
    try {
      return res.json(await Models.AuthToken.find({school_id: res.locals.school._id}));
    } catch (e) {
      next(e);
    }
  });

  app.post("/schools/:school/auth", authenticate("auth"), async (req, res, next) => {
    try {
      let authData: AuthToken = req.body;
      if (authData.admin) {
        return res.status(400).json({error: "cannot_set_admin"});
      }
      authData.school_id = res.locals.school._id;

      let bytes = await promisify(crypto.randomBytes)(32);
      let hash = crypto.createHash("sha256");
      hash.update(bytes);
      authData.tokenHash = hash.digest("base64");

      let token = new Models.AuthToken(authData);
      try {
        await token.validate();
      } catch (e) {
        return res.status(400).json({error: "bad_bus"});
      }

      await token.save();
      return res.json({ok: true, id: token._id, token: bytes.toString("base64")});
    } catch (e) {
      next(e);
    }
  });

  app.use("/schools/:school/auth/:token", authenticate("auth"), async (req, res, next) => {
    try {
      if (!isValidId(req.params.token)) {
        return res.status(400).json({error: "bad_token_id"});
      }

      res.locals.token = await Models.AuthToken.findOne({school_id: res.locals.school._id, _id: req.params.token});
      return res.locals.token ? next() : res.status(404).json({error: "token_not_found"});
    } catch (e) {
      next(e);
    }
  });

  app.delete("/schools/:school/auth/:token", authenticate("auth"), async (_, res, next) => {
    try {
      await res.locals.token.delete();
      res.json({ok: true});
    } catch (e) {
      next(e);
    }
  });

  app.get("/admin", authenticate("admin"), async (req, res, next) => {
    try {
      return res.json(await Models.AuthToken.find({admin: true}));
    } catch (e) {
      next(e);
    }
  });

  app.post("/admin", authenticate("admin"), async (req, res, next) => {
    try {
      if ((req.body && req.body.description) && typeof req.body.description !== "string") {
        return res.status(400).json({error: "bad_description"})
      }

      let bytes = await promisify(crypto.randomBytes)(32);
      let hash = crypto.createHash("sha256");
      hash.update(bytes);

      let token = new Models.AuthToken({
        description: req.body ? req.body.description : undefined,
        admin: true,
        tokenHash: hash.digest("base64")
      });

      await token.save();

      return res.json({ok: true, id: token._id, token: bytes.toString("base64")});
    } catch (e) {
      next(e);
    }
  });

  app.use("/admin/:token", authenticate("admin"), async (req, res, next) => {
    try {
      if (!isValidId(req.params.token)) {
        return res.status(400).json({error: "bad_token_id"});
      }

      res.locals.token = await Models.AuthToken.findOne({_id: req.params.token});
      return res.locals.token;
    } catch (e) {
      next(e);
    }
  });

  app.delete("/admin/:token", authenticate("admin"), async (req, res, next) => {
    try {
      await res.locals.token.delete();
      res.json({ok: true});
    } catch (e) {
      next(e);
    }
  });
};