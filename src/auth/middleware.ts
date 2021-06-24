import { NextFunction, Request, Response } from 'express';
import { Provider } from 'oidc-provider';

export function authenticateWithoutCheckingPermissions(provider: Provider, scopes: string[]) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const authorization = req.get("Authorization");
            if (typeof authorization !== "string") {
                res.sendStatus(401);
                return;
            }

            if (!authorization.startsWith("Bearer ")) {
                res.sendStatus(401);
                return;
            }

            const token = authorization.slice("Bearer ".length).trimEnd();
            const accessToken = await provider.AccessToken.find(token);
            if (!accessToken) {
                res.sendStatus(401);
                return;
            }
            if (scopes.find(scope => !accessToken.scopes.has(scope))) {
                res.sendStatus(403);
                return;
            }

            next();
        } catch (e) {
            next(e);
        }
    };
}