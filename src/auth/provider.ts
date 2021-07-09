import { Adapter, AdapterPayload, Configuration, Provider } from 'oidc-provider';
import { Config } from '../interfaces';
import { Models } from '../models';
import mongoose from 'mongoose';
import { restrictedScopes, schoolScopes, userScopes } from './scopes';
import { isValidId } from '../utils';

/**
 * MongoDB adapter for oidc-provider.
 * @see {@link https://github.com/panva/node-oidc-provider/blob/main/example/adapters/mongodb.js}
 */
class DBAdapter implements Adapter {
    constructor(private name: string) {}

    coll() {
        return mongoose.connection.collection(this.name);
    }

    async upsert(_id: string, payload: AdapterPayload, expiresIn: number) {
        if (this.name === "Client") throw new Error("Not implemented");

        let expires;
        if (expiresIn) expires = new Date(Date.now() + expiresIn * 1000);

        await this.coll().updateOne({_id}, {$set: {payload, ...(expires ? {expires} : undefined)}}, {upsert: true});
    }

    async find(_id: string): Promise<AdapterPayload | undefined> {
        if (this.name === "Client") {
            if (!isValidId(_id)) return undefined;
            const client = await Models.Client.findById(_id);
            if (!client) return undefined;
            return {
                client_id: client._id.toString(),
                client_secret: client.secret,
                grant_types: ["client_credentials", "authorization_code", "refresh_token"],
                redirect_uris: client.redirect_uris
            } as AdapterPayload;
        } else {
            const result = await this.coll().find(
                { _id },
                // @ts-ignore
                { payload: 1 }
            ).limit(1).next();
            if (!result) return undefined;
            return result.payload as AdapterPayload;
        }
    }

    async findByUserCode(userCode: string): Promise<AdapterPayload | undefined> {
        if (this.name === "Client") throw new Error("Not implemented");

        const result = await this.coll().find(
            {"payload.userCode": userCode},
            // @ts-ignore
            {payload: 1}
        ).limit(1).next();

        if (!result) return undefined;
        return result.payload as AdapterPayload;
    }

    async findByUid(uid: string): Promise<AdapterPayload | undefined> {
        if (this.name === "Client") throw new Error("Not implemented");

        const result = await this.coll().find(
            {"payload.uid": uid},
            // @ts-ignore
            {payload: 1}
        ).limit(1).next();

        if (!result) return undefined;
        return result.payload;
    }

    async consume(_id: string) {
        if (this.name === "Client") throw new Error("Not implemented");
        await this.coll().findOneAndUpdate(
            {_id},
            {$set: {"payload.consumed": Math.floor(Date.now() / 1000)}}
        );
    }

    async destroy(_id: string) {
        if (this.name === "Client") throw new Error("Not implemented");
        await this.coll().deleteOne({_id});
    }

    async revokeByGrantId(grantId: string) {
        if (this.name === "Client") throw new Error("Not implemented");
        await this.coll().deleteMany({"payload.grantId": grantId});
    }
}

/**
 * Creates an OpenID Connect provider to handle OpenID Connect server tasks.
 * @param config - server configuration
 * @param renderError - function called to render an error page
 * @returns an oidc-provider Provider
 */
export default function makeProvider(config: Config, renderError: Configuration["renderError"]) {
    return new Provider(config.authIssuer, {
        cookies: {
            keys: config.authCookieKeys
        },
        features: {
            devInteractions: {enabled: false},
            revocation: {enabled: true},
            clientCredentials: {enabled: true}
        },
        jwks: {
            keys: config.authJWKKeys
        },
        routes: {
            authorization: "/authorize"
        },
        pkce: {
            methods: ["S256"],
            required() { return false; }
        },
        interactions: {
            url: (_a, _b) => `/auth/ui`
        },
        scopes: [
            ...userScopes.values(),
            ...schoolScopes.values(),
            ...restrictedScopes.values()
        ],
        async findAccount(_ctx, id) {
            const user = await Models.User.findById(id);
            if (!user) throw new Error("User does not exist");
            return {
                accountId: user._id.toString(),
                async claims(_use, _scope) {
                    return {
                        sub: user._id,
                        email: user.email
                    };
                }
            };
        },
        adapter: DBAdapter,
        renderError
    });
}