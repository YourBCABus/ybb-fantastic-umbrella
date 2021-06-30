import { Provider } from 'oidc-provider';
import { Request } from 'express';
import { User } from '../interfaces';
import { Models } from '../models';
import { AuthenticationError } from 'apollo-server-express';
import { schoolScopes, userScopes } from './scopes';

export interface AuthContext {
    user?: User;
    scopes: Set<string>;
    permissionCache: Map<string, {public: Set<string>, user: Set<string>}>;
}

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
        return {scopes: new Set(), permissionCache: new Map()};
    }

    const user = await Models.User.findById(accessToken.accountId);
    if (!user) {
        return {scopes: new Set(), permissionCache: new Map()};
    }

    return {user, scopes: accessToken.scopes, permissionCache: new Map()};
}

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
            }
            context.permissionCache.set(schoolID, {public: publicScopes, user: userScopes || new Set()});
        } else {
            context.permissionCache.set(schoolID, {public: new Set(), user: new Set()});
        }
    }
    return context.permissionCache.get(schoolID);
}

export function authenticateUserScope(context: AuthContext, scopes: string[]): void {
    if (scopes.find(scope => !userScopes.has(scope))) throw new Error("Invalid user scope");
    if (scopes.find(scope => !context.scopes.has(scope))) throw new AuthenticationError("Forbidden");
}

export async function authenticateSchoolScope(context: AuthContext, scopes: string[], schoolID: string) {
    if (scopes.find(scope => !schoolScopes.has(scope))) throw new Error("Invalid school scope");
    const {public: publicScopes, user: userScopes} = await getSchoolScopes(context, schoolID);
    if (scopes.find(scope => !publicScopes.has(scope))) {
        if (scopes.find(scope => !publicScopes.has(scope) && !userScopes.has(scope))) throw new AuthenticationError("Forbidden");
        if (scopes.find(scope => !context.scopes.has(scope))) throw new AuthenticationError("Forbidden");
    }
}