import { Router } from 'express';
import { Config } from '../interfaces';
import makeGoogleClient from './google';

export default function makeAuthRoutes(config: Config) {
    const router = Router();

    const google = makeGoogleClient(config.google);

    router.get("/login", async (req, res, next) => {
        try {
            res.render("login", {
                title: "Log in",
                googleURL: google.generateAuthUrl({
                    scope: ["profile", "email"]
                })
            });
        } catch (e) {
            next(e);
        }
    });

    router.get("/callback", async (req, res, next) => {
        try {
            if (req.query.provider === "google") {
                if (typeof req.query.code !== "string") return res.status(400).send("code must be a string"); // nya
                const {tokens} = await google.getToken(req.query.code);
                if (!tokens.id_token) return res.status(500).send("Did not receive ID token");
                const ticket = await google.verifyIdToken({
                    idToken: tokens.id_token
                });
                const payload = ticket.getPayload();
            } else {
                res.status(400);
                res.send("Unsupported auth provider");
            }
        } catch (e) {
            next(e);
        }
    });

    return router;
}