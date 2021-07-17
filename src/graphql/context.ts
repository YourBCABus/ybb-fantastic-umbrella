import { ExpressContext } from "apollo-server-express";
import { RedisPubSub } from "graphql-redis-subscriptions";
import { AuthContext } from "../auth/context";

/**
 * Context passed to GraphQL resolvers.
 */
type Context = AuthContext & {
    /**
     * Event bus for tracking bus changes.
     */
    pubsub?: RedisPubSub;
} & ExpressContext;

export default Context;