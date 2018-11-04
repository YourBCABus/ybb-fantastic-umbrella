import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { Models } from './models';

const config = JSON.parse(fs.readFileSync(path.join(__dirname, "../config.json"), "utf8"));
mongoose.connect(config.mongo);

Models.Stop.find().then(async stops => {
  while (stops.length > 0) {
    const batch = stops.splice(0, 10);
    await Promise.all(batch.map(async stop => {
      if (!stop.coords) {
        stop.coords = {type: "Point", coordinates: [stop.location.longitude, stop.location.latitude]};
        delete stop.location;
        await stop.save();
      }
    }));
  }

  process.exit(0);
});
