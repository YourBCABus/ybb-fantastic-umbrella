import { ExpressContext, PubSub } from "apollo-server-express";
import { AuthContext } from "../auth/context";

/**
 * Context passed to GraphQL resolvers.
 */
type Context = AuthContext & {
    /**
     * Event bus for tracking bus changes.
     */
    pubsub: PubSub;
} & ExpressContext;

export default Context;