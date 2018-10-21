import { model, Schema, Document } from 'mongoose';

import { AuthToken, School, Bus, BusLocationHistory, Stop } from './interfaces';

export interface AuthTokenModel extends Document, AuthToken {}
export interface SchoolModel extends Document, School {}
export interface BusModel extends Document, Bus {}
export interface BusLocationHistoryModel extends Document, BusLocationHistory {}
export interface StopModel extends Document, Stop {}

export namespace Models {
  export const AuthToken = model<AuthTokenModel>("AuthToken", new Schema({
    tokenHash: {type: String, required: true, unique: true},
    permissions: Schema.Types.Mixed
  }));

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
    other_names: [String],
    boarding_time: Date,
    departure_time: Date,
    invalidate_time: Date,
    available: {type: Boolean, required: true, default: true}
  }));

  export const BusLocationHistory = model<BusLocationHistoryModel>("BusLocationHistory", new Schema({
    bus_id: {type: String, required: true},
    locations: {type: [String], required: true},
    time: Date,
    source: {type: String, required: true}
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
