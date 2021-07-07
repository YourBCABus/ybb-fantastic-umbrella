/**
 * List of scopes that can be assigned to a user.
 * 
 * @remarks
 * Any permissions that only affect a single user should go here.
 */
export const userScopes = new Set([
    "openid",
    "offline_access",
    "test"
]);

/**
 * List of scopes that can be assigned to a user on a per-school basis.
 * 
 * @remarks
 * Any permissions that can affect a school should go here.
 */
export const schoolScopes = new Set([
    "read"
]);