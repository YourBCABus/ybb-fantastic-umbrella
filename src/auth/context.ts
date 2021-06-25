import { Provider } from 'oidc-provider';
import { Request } from 'express';
import { User } from '../interfaces';
import { Models } from '../models';
import { AuthenticationError } from 'apollo-server-express';
import { userScopes } from './scopes';

export interface AuthContext {
    user?: User;
    scopes: Set<string>;
}

export async function authContext(provider: Provider, req: Request): Promise<AuthContext> {
    const authorization = req.get("Authorization");
    if (typeof authorization !== "string") {
        return {scopes: new Set()};
    }

    if (!authorization.startsWith("Bearer ")) {
        return {scopes: new Set()};
    }

    const token = authorization.slice("Bearer ".length).trimEnd();
    const accessToken = await provider.AccessToken.find(token);
    if (!accessToken) {
        return {scopes: new Set()};
    }

    const user = await Models.User.findById(accessToken.accountId);
    if (!user) {
        return {scopes: new Set()};
    }

    return {user, scopes: accessToken.scopes};
}

export function authenticateUserScope(context: AuthContext, scopes: string[]): void {
    if (scopes.find(scope => !userScopes.has(scope))) throw new Error("Invalid user scope");
    if (scopes.find(scope => !context.scopes.has(scope))) throw new AuthenticationError("Forbidden");
}