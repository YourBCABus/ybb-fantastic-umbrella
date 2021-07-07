import { Router } from 'express';
import { Models } from '../models';
import { Config } from '../interfaces';
import makeGoogleClient from './google';
import { promisify } from 'util';
import { sign, verify } from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import cookieParser from 'cookie-parser';
import { InteractionResults, Provider } from 'oidc-provider';

const random = promisify(randomBytes);

/**
 * Generates a state token.
 * @param secret - secret to use when signing the token 
 * @param redirectURI - redirect URI of the OAuth flow
 * @returns a promise that fulfills with a state token
 */
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

/**
 * Verifies a state token.
 * @param state - state token
 * @param secret - secret to use when verifying the token
 * @returns a promise that fulfills with an object containing `isValid` and `redirectURI`
 */
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

/**
 * Creates a router for the auth UI.
 * @param config - server configuration
 * @param provider - oidc-provider Provider
 * @returns a router with auth UI routes
 */
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
                // All of the clients are first-party
                // TODO: Actual consent screen

                let grant: InstanceType<typeof provider.Grant>;
                let grantId = details.grantId;

                if (grantId) {
                    grant = await provider.Grant.find(details.grantId);
                } else {
                    grant = new provider.Grant();
                    grant.accountId = details.session!.accountId;
                    grant.clientId = details.params.client_id as string;
                }

                if (details.prompt.details.missingOIDCScope) {
                    grant.addOIDCScope((details.prompt.details.missingOIDCScope as any).join(" "));
                }

                if (details.prompt.details.missingOIDCClaims) {
                    grant.addOIDCClaims(details.prompt.details.missingOIDCClaims as string[]);
                }

                if (details.prompt.details.missingResourceScopes) {
                    for (const [indicator, scopes] of Object.entries(details.prompt.details.missingResourceScopes)) {
                        grant.addResourceScope(indicator, scopes.join(" "));
                    }
                }

                grantId = await grant.save();

                let consent: InteractionResults["consent"] = {};
                if (!details.grantId) {
                    consent.grantId = grantId;
                }
                
                await provider.interactionFinished(req, res, {consent});
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

        // test.duty.yourbcabus.com:3000/authorize?client_id=uwu&response_type=code&redirect_uri=http:%2F%2Flocalhost:6502%2F&scope=openid%20test%20offline_access&prompt=consent
    });

    return router;
}