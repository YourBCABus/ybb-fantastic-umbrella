import { RedisPubSub } from "graphql-redis-subscriptions";

/**
 * Pub/Sub trigger name for changes in buses.
 */
export const BUS_BOARDING_AREA_CHANGE = "BUS_BOARDING_AREA_CHANGE";

/**
 * Register a PubSub instance to listen for changes.
 * @param pubsub - PubSub instance
 */
export function setupPubsub(pubsub: RedisPubSub) {
    // TODO: Implement
}