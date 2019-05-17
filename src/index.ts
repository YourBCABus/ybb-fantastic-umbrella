import fs from 'fs';
import path from 'path';

import cors from 'cors';
import express from 'express';
import { json } from 'body-parser';
import mongoose from 'mongoose';
import * as admin from 'firebase-admin';

import {Config} from './interfaces';

import schoolEndpoints from './schools';
import busEndpoints from './buses';
import stopEndpoints from './stops';
import dismissalEndpoints from './dismissal';
import authManagementEndpoints from './authmanagement';

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

mongoose.connect(config.mongo);

if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const app = express();
app.set("json spaces", "\t");
app.use(cors());
app.use(json());

[
  schoolEndpoints,
  busEndpoints,
  stopEndpoints,
  dismissalEndpoints,
  authManagementEndpoints
].forEach(fn => fn({app, config, serviceAccount}));

app.get("/teapot", (_, res) => {
  res.status(418).send("☕");
});

app.listen(config.port, config.bindTo);
