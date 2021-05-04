import { Router } from 'express';
import { Models } from '../models';
import { Config } from '../interfaces';
import makeGoogleClient from './google';
import { promisify } from 'util';
import { sign, verify } from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import cookieParser from 'cookie-parser';
import { Provider } from 'oidc-provider';

const random = promisify(randomBytes);

async function generateState(secret: string, redirectURI?: string): Promise<string> {
    const jti = (await random(30)).toString("base64");
    return await new Promise((res, rej) => {
        sign({
            jti,
            iss: "yourbcabus",
            aud: "yourbcabus-auth-state",
            redirectURI
        }, secret, {
            algorithm: "HS256",
            expiresIn: "5 minutes"
        }, (err, token) => {
            if (err) {
                rej(err);
            } else {
                res(token);
            }
        });
    });
}

async function verifyState(state: string, secret: string): Promise<{isValid: boolean, redirectURI?: string}> {
    let data: {redirectURI?: string};
    try {
        data = await new Promise((res, rej) => {
            verify(state, secret, {
                algorithms: ["HS256"],
                issuer: "yourbcabus",
                audience: "yourbcabus-auth-state"
            }, (err, data) => {
                if (err) {
                    rej(err);
                } else {
                    res(data);
                }
            });
        });
    } catch (e) {
        return {isValid: false};
    }
    return {isValid: true, redirectURI: data.redirectURI}
}

export default function makeAuthRoutes(config: Config, provider: Provider) {
    const router = Router();

    const google = makeGoogleClient(config.google);

    router.use(cookieParser());

    router.get("/ui", async (req, res, next) => {
        try {
            let details: Parameters<Parameters<ReturnType<typeof provider.interactionDetails>["then"]>[0]>[0];
            try {
                details = await provider.interactionDetails(req, res);
            } catch (e) {
                return res.status(400).send("Invalid interaction ID");
            }
            if (details.prompt.name === "consent") {
                res.send("Logged in");
            } else {
                res.redirect(303, "/auth/ui/login");
            }
        } catch (e) {
            next(e);
        }
    });

    router.get("/ui/login", async (req, res, next) => {
        try {
            const state = await generateState(config.stateTokenSecret, undefined);
            res.cookie("ybbauthstate", state, {
                domain: config.stateTokenDomain,
                sameSite: "lax",
                httpOnly: true
            });
            res.render("login", {
                title: "Log in",
                googleURL: google.generateAuthUrl({
                    scope: ["profile", "email"],
                    state
                })
            });
        } catch (e) {
            next(e);
        }
    });

    router.get("/ui/callback", async (req, res, next) => {
        try {
            try {
                await provider.interactionDetails(req, res);
            } catch (e) {
                return res.status(400).send("Invalid interaction ID");
            }

            if (req.query.provider === "google") {
                if (typeof req.query.state !== "string") return res.status(400).send("state must be a string");
                if (req.query.state !== req.cookies.ybbauthstate) return res.status(400).send("Invalid state");
                const {isValid} = await verifyState(req.query.state, config.stateTokenSecret);
                if (!isValid) return res.status(400).send("Invalid state");

                if (typeof req.query.code !== "string") return res.status(400).send("code must be a string"); // nya
                const {tokens} = await google.getToken(req.query.code);
                if (!tokens.id_token) return res.status(500).send("Did not receive ID token");
                const ticket = await google.verifyIdToken({
                    idToken: tokens.id_token
                });

                let user = await Models.User.findOne({google_id: ticket.getUserId()});
                if (!user) {
                    user = new Models.User({
                        google_id: ticket.getUserId(),
                        email: ticket.getPayload().email
                    });
                    await user.save();
                }

                await provider.interactionFinished(req, res, {login: {
                    accountId: user._id.toString()
                }}, {mergeWithLastSubmission: false});
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