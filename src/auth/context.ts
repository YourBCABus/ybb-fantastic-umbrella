import { Provider } from 'oidc-provider';
import { Request } from 'express';
import { User, Client } from '../interfaces';
import { Models } from '../models';
import { AuthenticationError } from 'apollo-server-express';
import { restrictedScopes, schoolScopes, userScopes } from './scopes';

/**
 * Auth context passed to GraphQL resolvers.
 */
export interface AuthContext {
    /**
     * Current user.
     */
    user?: User;

    /**
     * Current client.
     */
    client?: Client;

    /**
     * List of user scopes that the client has access to.
     */
    scopes: Set<string>;

    /**
     * Permission cache used in {@link getSchoolScopes}. Should not be accessed or modified directly.
     */
    permissionCache: Map<string, {public: Set<string>, user: Set<string>}>;
}

/**
 * Fetches the auth context for a given request.
 * @param provider - oidc-connect provider
 * @param req - Express request
 * @returns a promise that fulfills with an {@link AuthContext}
 */
export async function authContext(provider: Provider, req: Request): Promise<AuthContext> {
    const authorization = req.get("Authorization");
    if (typeof authorization !== "string") {
        return {scopes: new Set(), permissionCache: new Map()};
    }

    if (!authorization.startsWith("Bearer ")) {
        return {scopes: new Set(), permissionCache: new Map()};
    }

    const token = authorization.slice("Bearer ".length).trimEnd();
    const accessToken = await provider.AccessToken.find(token);
    if (!accessToken) {
        const clientCredentials = await provider.ClientCredentials.find(token);
        if (!clientCredentials) {
            return {scopes: new Set(), permissionCache: new Map()};
        }
        const client = clientCredentials.clientId && await Models.Client.findById(clientCredentials.clientId);
        return {scopes: clientCredentials.scopes, permissionCache: new Map(), client: client || undefined}
    }

    const user = await Models.User.findById(accessToken.accountId);
    if (!user) {
        return {scopes: accessToken.scopes, permissionCache: new Map()};
    }

    return {user, scopes: accessToken.scopes, permissionCache: new Map()};
}

/**
 * Fetches the scopes the current auth context has for a given school.
 * @param context - current auth context
 * @param schoolID - school ID
 * @returns a list of public scopes and a list of scopes for this user/client in the school
 */
export async function getSchoolScopes(context: AuthContext, schoolID: string): Promise<{public: Set<string>, user: Set<string>}> {
    if (!context.permissionCache.has(schoolID)) {
        const school = await Models.School.findById(schoolID);
        if (school) {
            const publicScopes = new Set(school.public_scopes || []);
            let userScopes: Set<string> | undefined;
            if (context.user) {
                const permission = await Models.Permission.findOne({school_id: schoolID, user_id: context.user._id.toString()});
                if (permission) {
                    userScopes = new Set(permission.scopes);
                }
            } else if (context.client) {
                const permission = await Models.ClientPermission.findOne({school_id: schoolID, client_id: context.client._id.toString()});
                if (permission) {
                    userScopes = new Set(permission.scopes);
                }
            }
            context.permissionCache.set(schoolID, {public: publicScopes, user: userScopes || new Set()});
        } else {
            context.permissionCache.set(schoolID, {public: new Set(), user: new Set()});
        }
    }
    return context.permissionCache.get(schoolID)!;
}

/**
 * Authenticates an auth context for a set of user scopes.
 * @see {@link userScopes}
 * @param context - current auth context
 * @param scopes - list of {@link userScopes} that the client must have
 * @throws if the client is unauthorized (or if the scope is invalid)
 */
export function authenticateUserScope(context: AuthContext, scopes: string[]): void {
    if (scopes.find(scope => !userScopes.has(scope))) throw new Error("Invalid user scope");
    if (scopes.find(scope => !context.scopes.has(scope))) throw new AuthenticationError("Forbidden");
}

/**
 * Authenticates an auth context for a set of school-specific scopes.
 * @see {@link schoolScopes}
 * @param context - current auth context
 * @param scopes - list of {@link schoolScopes} that the client must have
 * @throws if the client is unauthorized (or if the scope is invalid)
 */
export async function authenticateSchoolScope(context: AuthContext, scopes: string[], schoolID: string) {
    if (scopes.find(scope => !schoolScopes.has(scope))) throw new Error("Invalid school scope");
    const {public: publicScopes, user: userScopes} = await getSchoolScopes(context, schoolID);
    if (scopes.find(scope => !publicScopes.has(scope))) {
        if (scopes.find(scope => !publicScopes.has(scope) && !userScopes.has(scope))) throw new AuthenticationError("Forbidden");
        if (scopes.find(scope => !context.scopes.has(scope))) throw new AuthenticationError("Forbidden");
    }
}

/**
 * Authenticates an auth context for a set of restricted scopes.
 * @see {@link restrictedScopes}
 * @param context - current auth context
 * @param scopes - list of {@link restrictedScopes} that the client must have
 * @throws if the client is unauthorized (or if the scope is invalid)
 */
export function authenticateRestrictedScope(context: AuthContext, scopes: string[]): void {
    if (scopes.find(scope => !restrictedScopes.has(scope))) throw new Error("Invalid restricted scope");
    if (scopes.find(scope => !context.scopes.has(scope))) throw new AuthenticationError("Forbidden");
    if (context.user) {
        if (!context.user.restricted_scopes) throw new AuthenticationError("Forbidden");
        if (scopes.find(scope => !context.user!.restricted_scopes!.includes(scope))) throw new AuthenticationError("Forbidden");
    } else {
        if (!context.client) throw new AuthenticationError("Forbidden");
        if (!context.client!.restricted_scopes) throw new AuthenticationError("Forbidden");
        if (scopes.find(scope => !context.client!.restricted_scopes!.includes(scope))) throw new AuthenticationError("Forbidden");
    }
}