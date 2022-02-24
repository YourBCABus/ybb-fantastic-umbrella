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
  pubsub = new RedisPubSub({
    publisher: redis,
    subscriber: redis
  });
  setupPubsub(pubsub!);
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
const server = new CostAnalysisApolloServer({
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
const app = express();
app.engine("hbs", exphbs({ extname: ".hbs" }));
app.set("view engine", "hbs");
app.set("json spaces", "\t"); // Pretty-print JSON
// @ts-ignore
app.use("/schools", cors()); // CORS support for the legacy REST API
app.use(json()); // Body parsing stuff

// Set up the legacy REST API.
[
  schoolEndpoints,
  busEndpoints,
  stopEndpoints,
  dismissalEndpoints,
  alertEndpoints
].forEach(fn => fn({app, config}));

// Really hacky urban-invention uptime checker.
// Seriously we need to replace this sometime
// But it's midnight and I'm tired.
if (config.urbanInventionToken) {
  let lastPing = 0;
  
  app.put("/urban-invention-uptime", (req, res) => {
    // If the token query parameter is correct, update lastPing with the timestamp.
    if (req.query.token === config.urbanInventionToken) {
      lastPing = Date.now();
      res.send("OK");
    } else {
      res.send("FAIL");
    }
  });

  app.get("/urban-invention-uptime", (_req, res) => {
    res.json({lastPing});
  });
}

// Set up authentication.
const provider = makeProvider(config, errorPage(app));
app.use("/auth", makeAuthRoutes(config, provider));

// Random easter egg, because why not
app.get("/teapot", (_, res) => {
  res.status(418).send("☕");
});

// Add the GraphQL API to the Express application.
server.applyMiddleware({app});

// Static files used during login.
app.use("/static", express.static(path.join(__dirname, "../static")));

// More authentication setup.
app.use(provider.callback());

// Start the server.
app.listen(config.port, config.bindTo);
