import fs from 'fs';
import path from 'path';

import cors from 'cors';
import express from 'express';
import { json } from 'body-parser';
import mongoose from 'mongoose';
import * as admin from 'firebase-admin';
import { ApolloServer, gql } from 'apollo-server-express';
import costAnalysis from 'graphql-cost-analysis';

import {Config} from './interfaces';

import schoolEndpoints from './schools';
import busEndpoints from './buses';
import stopEndpoints from './stops';
import dismissalEndpoints from './dismissal';
import authManagementEndpoints from './authmanagement';
import alertEndpoints from './alerts';
import resolvers from './resolvers';

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
  console.log(e.stack);
  console.log("Push notifications will not be sent.")
}

const typeDefs = gql(fs.readFileSync(path.join(__dirname, "../yourbcabus.graphql"), "utf8"));

mongoose.connect(config.mongo, {useNewUrlParser: true, useUnifiedTopology: true});

if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const server = new ApolloServer({typeDefs, resolvers, introspection: true, validationRules: [
  costAnalysis({
    maximumCost: 50
  })
]});

const app = express();
app.set("json spaces", "\t");
app.use(cors());
app.use(json());

[
  schoolEndpoints,
  busEndpoints,
  stopEndpoints,
  dismissalEndpoints,
  authManagementEndpoints,
  alertEndpoints
].forEach(fn => fn({app, config, serviceAccount}));

app.get("/teapot", (_, res) => {
  res.status(418).send("☕");
});

server.applyMiddleware({app});

app.listen(config.port, config.bindTo);
