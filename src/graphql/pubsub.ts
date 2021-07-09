import { PubSub } from "apollo-server-express";

/**
 * Pub/Sub trigger name for changes in buses.
 */
export const BUS_CHANGE = "BUS_CHANGE";

/**
 * Register a PubSub instance to listen for changes.
 * @param pubsub - PubSub instance
 */
export function setupPubsub(pubsub: PubSub) {
    // TODO: Implement
}