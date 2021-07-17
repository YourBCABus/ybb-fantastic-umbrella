import { RedisPubSub } from "graphql-redis-subscriptions";

/**
 * Pub/Sub trigger name for changes in buses.
 */
export const BUS_CHANGE = "BUS_CHANGE";

/**
 * Register a PubSub instance to listen for changes.
 * @param pubsub - PubSub instance
 */
export function setupPubsub(pubsub: RedisPubSub) {
    // TODO: Implement
}