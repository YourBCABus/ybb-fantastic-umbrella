import { Router } from 'express';
import { Models } from '../models';
import { Config } from '../interfaces';
import makeGoogleClient from './google';
import { promisify } from 'util';
import { sign, verify } from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import cookieParser from 'cookie-parser';
import { InteractionResults, Provider } from 'oidc-provider';
import { LoginTicket } from 'google-auth-library';
import crypto from 'crypto';

type Interaction = Awaited<ReturnType<Provider['interactionDetails']>>;

const random = promisify(randomBytes);

const ISSUER = "yourbcabus";
const AUDIENCE = "yourbcabus-auth-state";
const ALGORITHM = "HS256";
const EXPIRY_TIME = 5 * 60; // 5 minutes

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
            iss: ISSUER,
            aud: AUDIENCE,
            redirectURI
        }, secret, {
            algorithm: ALGORITHM,
            expiresIn: EXPIRY_TIME,
        }, (err, token) => {
            if (err) {
                rej(err);
            } else {
                res(token!);
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
                algorithms: [ALGORITHM],
                issuer: ISSUER,
                audience: AUDIENCE,
            }, (err, data) => {
                if (err) {
                    rej(err);
                } else {
                    res(data!);
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
            // Use the Yenowa OAuth provider to get the details of the OpenIDC
            // request
            let details: Interaction;
            try {
                details = await provider.interactionDetails(req, res);
            } catch (e) {
                return res.status(400).send("Invalid interaction ID");
            }

            // This route is only for consent prompts
            if (details.prompt.name !== "consent") {
                return res.redirect(303, "/auth/ui/login");
            }

            // All of the clients are first-party
            // TODO: Actual consent screen
            let grant: InstanceType<typeof provider.Grant>;
            let grantId = details.grantId;

            if (grantId) {
                grant = (await provider.Grant.find(grantId))!;
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
                for (const [indicator, scopes] of Object.entries(details.prompt.details.missingResourceScopes as Record<string, string[]>)) {
                    grant.addResourceScope(indicator, scopes.join(" "));
                }
            }

            grantId = await grant.save();

            let consent: InteractionResults["consent"] = {};
            if (!details.grantId) {
                consent.grantId = grantId;
            }
            
            await provider.interactionFinished(req, res, {consent});
        } catch (e) {
            next(e);
        }
    });

    // This is the displayed login page when you "Sign in with YourBCABus/TableJet"
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

            if (req.query.provider !== "google") {
                return res.status(400).send("Unsupported auth provider");
            }

            // Verify state
            {
                const state = req.query.state;
                if (typeof state !== "string") return res.status(400).send("state must be a string");
                if (!crypto.timingSafeEqual(
                    Buffer.from(state),
                    Buffer.from(req.cookies.ybbauthstate),
                )) return res.status(400).send("Invalid state");
                const {isValid} = await verifyState(state, config.stateTokenSecret);
                if (!isValid) return res.status(400).send("Invalid state");
            }

            // Exchange auth code for ticket
            let ticket: LoginTicket;
            {
                if (typeof req.query.code !== "string") return res.status(400).send("code must be a string"); // nya
                const {tokens} = await google.getToken(req.query.code);
                if (!tokens.id_token) return res.status(500).send("Did not receive ID token");
                ticket = await google.verifyIdToken({
                    idToken: tokens.id_token
                });
            }

            // Get user + add user to db if doesn't exist
            let user = await Models.User.findOne({google_id: ticket.getUserId()!});
            if (!user) {
                user = new Models.User({
                    google_id: ticket.getUserId(),
                    google_hd: ticket.getPayload()?.hd,
                    email: ticket.getPayload()!.email
                });
                await user.save();
            }

            // Return the response required and redirect to
            await provider.interactionFinished(req, res, {login: {
                accountId: user._id.toString()
            }}, {mergeWithLastSubmission: false});
        } catch (e) {
            next(e);
        }
    });

    return router;
}