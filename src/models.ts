import { model, Schema, Document } from 'mongoose';

import { AuthToken, School, Bus, BusLocationHistory, Stop, StopSuggestion, DismissalRange } from './interfaces';

export interface AuthTokenModel extends Document, AuthToken {}
export interface SchoolModel extends Document, School {}
export interface BusModel extends Document, Bus {}
export interface BusLocationHistoryModel extends Document, BusLocationHistory {}
export interface StopModel extends Document, Stop {}
export interface StopSuggestionModel extends Document, StopSuggestion {}
export interface DismissalRangeModel extends Document, DismissalRange {}

export namespace Models {
  export const AuthToken = model<AuthTokenModel>("AuthToken", new Schema({
    tokenHash: {type: String, required: true, unique: true},
    description: String,
    school_id: String,
    admin: Boolean,
    bus: {
      create: Boolean,
      update: Boolean,
      delete: Boolean,
      location: Boolean
    },
    stop: {
      create: Boolean,
      update: Boolean,
      delete: Boolean,
      suggest: Boolean,
      arrivalTimes: Boolean
    },
    auth: Boolean,
    dismissal: Boolean
  }));

  export const School = model<SchoolModel>("School", new Schema({
    name: String,
    location: {
      latitude: Number,
      longitude: Number
    },
    available: {type: Boolean, required: true, default: true},
    timezone: String
  }));

  export const Bus = model<BusModel>("Bus", new Schema({
    school_id: {type: String, required: true, index: true},
    name: String,
    locations: [String],
    other_names: [String],
    boarding_time: Date,
    departure_time: Date,
    invalidate_time: Date,
    available: {type: Boolean, required: true, default: true},
    arrival_at_school: Number
  }));

  export const BusLocationHistory = model<BusLocationHistoryModel>("BusLocationHistory", new Schema({
    bus_id: {type: String, required: true},
    locations: {type: [String], required: true},
    time: Date,
    source: {type: String, required: true}
  }));

  const stopSchema = new Schema({
    bus_id: {type: String, required: true, index: true},
    name: String,
    description: String,
    location: {
      latitude: Number,
      longitude: Number
    },
    coords: {
      type: {type: String, required: true},
      coordinates: {type: [Number], required: true},
    },
    order: Number,
    arrival_time: Date,
    invalidate_time: Date,
    available: {type: Boolean, required: true, default: true}
  });
  stopSchema.index({coords: "2dsphere"});
  export const Stop = model<StopModel>("Stop", stopSchema);

  export const StopSuggestion = model<StopSuggestionModel>("StopSuggestion", new Schema({
    bus_id: {type: String, required: true},
    location: {
      latitude: {type: Number, required: true},
      longitude: {type: Number, required: true}
    },
    time: Date,
    source: String
  }));

  export const DismissalRange = model<DismissalRangeModel>("DismissalRange", new Schema({
    school_id: {type: String, required: true, index: true},
    start_date: {type: Number, required: true},
    end_date: {type: Number, required: true},
    dismissal_time: Number,
    start_time: Number,
    end_time: Number,
    days_of_week: {type: [Number], required: true}
  }));
}
