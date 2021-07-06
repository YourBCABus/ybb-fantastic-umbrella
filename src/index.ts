import fs from 'fs';
import path from 'path';

import cors from 'cors';
import express from 'express';
import { json } from 'body-parser';
import mongoose from 'mongoose';
import * as admin from 'firebase-admin';
import { ApolloServer, gql } from 'apollo-server-express';
import costAnalysis from 'graphql-cost-analysis';
import exphbs from 'express-handlebars';

import {Config} from './interfaces';

import schoolEndpoints from './legacy/schools';
import busEndpoints from './legacy/buses';
import stopEndpoints from './legacy/stops';
import dismissalEndpoints from './legacy/dismissal';
import alertEndpoints from './legacy/alerts';
import makeAuthRoutes from './auth/routes';
import resolvers from './resolvers';
import makeProvider from './auth/provider';
import { authContext } from './auth/context';

export interface BusLocationUpdateRequest {
  locations: string[];
  associate_time?: boolean;
  invalidate_time: any;
  source: string;
}

const config: Config = JSON.parse(fs.readFileSync(path.join(__dirname, "../config.json"), "utf8"));
let serviceAccount: admin.ServiceAccount;

try {
  serviceAccount = JSON.parse(fs.readFileSync(path.join(__dirname, "../service-account.json"), "utf8"));
} catch (e) {
  console.log("Failed to read service-account.json:");
  console.log(e.message);
  console.log("Push notifications will not be sent.")
}

const typeDefs = gql(fs.readFileSync(path.join(__dirname, "../yourbcabus.graphql"), "utf8"));

mongoose.connect(config.mongo, {useNewUrlParser: true, useUnifiedTopology: true});

if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true,
  validationRules: [
    costAnalysis({
      maximumCost: 50
    })
  ],
  playground: true,
  async context({req}) {
    return {...(await authContext(provider, req))};
  }
});

const app = express();
app.engine("hbs", exphbs({extname: ".hbs"}));
app.set("view engine", "hbs");
app.set("json spaces", "\t");
app.use("/schools", cors());
app.use(json());

[
  schoolEndpoints,
  busEndpoints,
  stopEndpoints,
  dismissalEndpoints,
  alertEndpoints
].forEach(fn => fn({app, config, serviceAccount}));

const provider = makeProvider(config);
app.use("/auth", makeAuthRoutes(config, provider));

app.get("/teapot", (_, res) => {
  res.status(418).send("☕");
});

server.applyMiddleware({app});

app.use("/static", express.static(path.join(__dirname, "../static")));

app.use(provider.callback());

app.listen(config.port, config.bindTo);
