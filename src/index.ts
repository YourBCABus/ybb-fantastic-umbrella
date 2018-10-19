import fs from 'fs';
import path from 'path';

import express from 'express';
import { json } from 'body-parser';
import { MongoClient } from 'mongodb';

const config = JSON.parse(fs.readFileSync(path.join(__dirname, "../config.json"), "utf8"));

const app = express();
app.use(json());

// const client = new MongoClient(config.mongo);
console.log(config);
