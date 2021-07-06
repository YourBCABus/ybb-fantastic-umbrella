import fs from 'fs';
import path from 'path';

import cors from 'cors';
import express from 'express';
import { json } from 'body-parser';
import mongoose from 'mongoose';
import { ApolloServer, gql } from 'apollo-server-express';
import costAnalysis from 'graphql-cost-analysis';
import exphbs from 'express-handlebars';

import {Config} from './interfaces';

import schoolEndpoints from './schools';
import busEndpoints from './buses';
import stopEndpoints from './stops';
import dismissalEndpoints from './dismissal';
import alertEndpoints from './alerts';
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

const typeDefs = gql(fs.readFileSync(path.join(__dirname, "../yourbcabus.graphql"), "utf8"));

mongoose.connect(config.mongo, {useNewUrlParser: true, useUnifiedTopology: true});

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
].forEach(fn => fn({app, config}));

const provider = makeProvider(config);
app.use("/auth", makeAuthRoutes(config, provider));

app.get("/teapot", (_, res) => {
  res.status(418).send("☕");
});

server.applyMiddleware({app});

app.use("/static", express.static(path.join(__dirname, "../static")));

app.use(provider.callback());

app.listen(config.port, config.bindTo);
