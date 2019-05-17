import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { Models } from "./models";

export const isValidId = (id: string) => id && id.match(/^[0-9a-fA-F]{24}$/);
export const authenticate = (permission?: string) => {
  let components = permission && permission.split(".");
  return async (req: Request, res: Response, next: NextFunction) => {
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
      res.locals.auth = match;
      if (match) {
        if (match.admin || (match.school_id === res.locals.school._id.toString() && components.reduce((acc: any, component: string) => {
          return acc ? acc[component] : null;
        }, match))) {
          return next();
        }
      }

      res.status(403).json({error: "forbidden"});
    } catch (e) {
      next(e);
    }
  };
}