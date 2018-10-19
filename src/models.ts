import { model, Schema, Document } from 'mongoose';

import { School, Bus, Stop } from './interfaces';

export interface SchoolModel extends Document, School {}
export interface BusModel extends Document, Bus {}
export interface StopModel extends Document, Stop {}

export namespace Models {
  export const School = model<SchoolModel>("School", new Schema({
    name: String,
    location: {
      latitude: Number,
      longitude: Number
    },
    available: {type: Boolean, required: true, default: true}
  }));

  export const Bus = model<BusModel>("Bus", new Schema({
    school_id: {type: String, required: true},
    name: String,
    locations: [String],
    boarding_time: Date,
    departure_time: Date,
    invalidate_time: Date,
    available: {type: Boolean, required: true, default: true}
  }));

  export const Stop = model<StopModel>("Stop", new Schema({
    bus_id: {type: String, required: true},
    name: String,
    description: String,
    location: {
      latitude: {type: Number, required: true},
      longitude: {type: Number, required: true}
    },
    order: Number,
    arrival_time: Date,
    invalidate_time: Date,
    available: {type: Boolean, required: true, default: true}
  }));
}
