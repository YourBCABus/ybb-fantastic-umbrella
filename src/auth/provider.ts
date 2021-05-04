import { Adapter, AdapterPayload, Provider } from 'oidc-provider';
import { Config } from '../interfaces';
import { Models } from '../models';
import mongoose from 'mongoose';

class DBAdapter implements Adapter {
    constructor(private name: string) {}

    coll() {
        return mongoose.connection.collection(this.name);
    }

    async upsert(_id: string, payload: AdapterPayload, expiresIn: number) {
        let expires;
        if (expiresIn) expires = new Date(Date.now() + expiresIn * 1000);

        await this.coll().updateOne({_id}, {$set: {payload, ...(expires ? {expires} : undefined)}}, {upsert: true});
    }

    async find(_id: string): Promise<AdapterPayload | undefined> {
        const result = await this.coll().find(
            {_id},
            // @ts-ignore
            {payload: 1}
        ).limit(1).next();
        if (!result) return undefined;
        return result.payload as AdapterPayload;
    }

    async findByUserCode(userCode: string): Promise<AdapterPayload | undefined> {
        const result = await this.coll().find(
            {"payload.userCode": userCode},
            // @ts-ignore
            {payload: 1}
        ).limit(1).next();

        if (!result) return undefined;
        return result.payload as AdapterPayload;
    }

    async findByUid(uid: string): Promise<AdapterPayload | undefined> {
        const result = await this.coll().find(
            {"payload.uid": uid},
            // @ts-ignore
            {payload: 1}
        ).limit(1).next();

        if (!result) return undefined;
        return result.payload;
    }

    async consume(_id: string) {
        await this.coll().findOneAndUpdate(
            {_id},
            {$set: {"payload.consumed": Math.floor(Date.now() / 1000)}}
        );
    }

    async destroy(_id: string) {
        await this.coll().deleteOne({_id});
    }

    async revokeByGrantId(grantId: string) {
        await this.coll().deleteMany({"payload.grantId": grantId});
    }
}

export default function makeProvider(config: Config) {
    return new Provider(config.authIssuer, {
        clients: config.authClients,
        cookies: {
            keys: config.authCookieKeys
        },
        features: {
            devInteractions: {enabled: false},
            revocation: {enabled: true}
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
        async findAccount(_ctx, id) {
            const user = await Models.User.findById(id);
            if (!user) throw new Error("User does not exist");
            return {
                accountId: user._id,
                async claims(_use, _scope) {
                    return {
                        sub: user._id,
                        email: user.email
                    };
                }
            };
        },
        adapter: DBAdapter
    });
}