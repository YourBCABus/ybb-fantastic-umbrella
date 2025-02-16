import fs from 'fs';
import path from 'path';

import cors from 'cors';
import express from 'express';
import { json } from 'body-parser';
import mongoose from 'mongoose';
import { ApolloServer, gql } from 'apollo-server-express';
import costAnalysis from 'graphql-cost-analysis';
import exphbs from 'express-handlebars';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import Redis from 'ioredis';

import {Config} from './interfaces';

import schoolEndpoints from './legacy/schools';
import busEndpoints from './legacy/buses';
import stopEndpoints from './legacy/stops';
import dismissalEndpoints from './legacy/dismissal';
import alertEndpoints from './legacy/alerts';
import makeAuthRoutes from './auth/routes';
import resolvers from './graphql/resolvers/resolvers';
import makeProvider from './auth/provider';
import { authContext } from './auth/context';
import Context from './graphql/context';
import { setupPubsub } from './graphql/pubsub';
import errorPage from './errorpage';
import UptimeStatusService from './services';

// Read the config.
const config: Config = JSON.parse(fs.readFileSync(path.join(__dirname, "../config.json"), "utf8"));

// Read the typedefs in yourbcabus.graphql.
const typeDefs = gql(fs.readFileSync(path.join(__dirname, "../yourbcabus.graphql"), "utf8"));

// Connect to the database.
mongoose.connect(config.mongo, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true });

// Set up the Redis Pub/Sub event bus.
let pubsub: RedisPubSub | undefined;
if (config.redis) {
  const redis = config.redis === true ? new Redis() : new Redis(config.redis);
  const redisPubSubInstance = new RedisPubSub({
    publisher: redis,
    subscriber: redis
  });
  setupPubsub(redisPubSubInstance);
  pubsub = redisPubSubInstance
} else {
  console.log("Redis is not set up. Subscriptions and notifications will not work.")
}

// Set up the GraphQL server.
// HACK: https://github.com/pa-bru/graphql-cost-analysis/issues/12#issuecomment-420991259
class CostAnalysisApolloServer extends ApolloServer {
  async createGraphQLServerOptions(req: express.Request, res: express.Response) {
    const options = await super.createGraphQLServerOptions(req, res);
    return {...options, validationRules: [...options.validationRules!, costAnalysis({
      maximumCost: 20,
      variables: req.body.variables
    })]}
  }
}
const graphqlServer = new CostAnalysisApolloServer({
  typeDefs,
  resolvers,
  introspection: true,
  validationRules: [],
  playground: true,
  async context(context): Promise<Context> {
    return {
      ...context,
      ...(await authContext(provider, context.req)),
      pubsub
    };
  }
});

// Set up the Express application with Handlebars support.
const expressApp = express();
expressApp.engine("hbs", exphbs({ extname: ".hbs" }));
expressApp.set("view engine", "hbs");
expressApp.set("json spaces", "\t"); // Pretty-print JSON
expressApp.use("/schools", cors()); // CORS support for the legacy REST API
expressApp.use(json()); // Body parsing stuff

// Set up the legacy REST API.
[
  schoolEndpoints,
  busEndpoints,
  stopEndpoints,
  dismissalEndpoints,
  alertEndpoints
].forEach(fn => fn({app: expressApp, config}));

// Uptime checker for all services
// TODO: Add Discord/something alerts when time is overrun
const services: UptimeStatusService[] = [];
for (const serviceCfg of config.uptimeServices) {
  const service = new UptimeStatusService(serviceCfg.name)
    .setToken(serviceCfg.token)
    .setMaxHeartbeatTime(serviceCfg.maxSecs);
  services.push(service);

  service.start(expressApp);
}

// Set up authentication.
const provider = makeProvider(config, errorPage(expressApp));
expressApp.use("/auth", makeAuthRoutes(config, provider));

// Random easter egg, because why not
expressApp.get("/teapot", (_, res) => {
  res.status(418).send("☕");
});

// Add the GraphQL API to the Express application.
graphqlServer.applyMiddleware({app: expressApp});

// Static files used during login.
expressApp.use("/static", express.static(path.join(__dirname, "../static")));

// More authentication setup.
expressApp.use(provider.callback());

// Start the server.
expressApp.listen(config.port, config.bindTo);
