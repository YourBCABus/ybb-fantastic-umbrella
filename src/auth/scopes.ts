/**
 * List of scopes that can be assigned to a user.
 * 
 * @remarks
 * Any permissions that only affect a single user should go here.
 */
export const userScopes = new Set([
    "openid",
    "offline_access",
    "email",
    "test"
]);

/**
 * List of scopes that can be assigned to a user on a per-school basis.
 * 
 * @remarks
 * Any permissions that can affect a school should go here.
 */
export const schoolScopes = new Set([
    "read",
    "bus.create",
    "bus.update",
    "bus.updateStatus",
    "bus.delete",
    "stop.create",
    "stop.update",
    "stop.delete",
    "alert.create",
    "alert.update",
    "alert.delete",
    "dismissalTimeData.create",
    "dismissalTimeData.update",
    "dismissalTimeData.delete",
    "school.manage",
    "school.updateMappingData",
]);

/**
 * List of scopes that can be assigned to a user only if they are allowed for the user.
 * 
 * @remarks
 * Any permissions that could constitute admin access should go here.
 */
export const restrictedScopes = new Set([
    "admin.school.create"
]);