import { model, Schema, Document } from 'mongoose';

import {AuthToken, School, Bus, BusLocationHistory, Stop, StopSuggestion, DismissalRange, Alert, User, Permission, Client, ClientPermission} from './interfaces';

/**
 * Mongoose models used by YourBCABus.
 */
export namespace Models {
  export const User = model<User & Document>("User", new Schema({
    google_id: {type: String, unique: true},
    email: String,
    restricted_scopes: [String]
  }));

  export const Client = model<Client & Document>("Client", new Schema({
    secret: {type: String, required: true},
    redirect_uris: {type: [String], required: true, default: []},
    restricted_scopes: [String]
  }));

  export const Permission = model<Permission & Document>("Permission", new Schema({
    user_id: {type: String, required: true},
    school_id: {type: String, required: true},
    scopes: {type: [String], required: true}
  }));

  export const ClientPermission = model<ClientPermission & Document>("ClientPermission", new Schema({
    client_id: { type: String, required: true },
    school_id: { type: String, required: true },
    scopes: { type: [String], required: true }
  }));

  /** @deprecated */
  export const AuthToken = model<AuthToken & Document>("AuthToken", new Schema({
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
    dismissal: Boolean,
    alerts: Boolean
  }));

  export const School = model<School & Document>("School", new Schema({
    name: String,
    location: {
      latitude: Number,
      longitude: Number
    },
    available: {type: Boolean, required: true, default: true},
    timezone: String,
    public_scopes: [String],
    legacy_api_enabled: Boolean,
    mapping_data: new Schema({
      bounding_box_a: {
        type: {type: String, enum: ["Point"], required: true},
        coordinates: {type: [Number], required: true}
      },
      bounding_box_b: {
        type: {type: String, enum: ["Point"], required: true},
        coordinates: {type: [Number], required: true}
      },
      boarding_areas: [{
        name: {type: String, required: true},
        location: {
          type: {type: String, enum: ["Point"], required: true},
          coordinates: {type: [Number], required: true}
        }
      }]
    })
  }));

  export const Bus = model<Bus & Document>("Bus", new Schema({
    school_id: {type: String, required: true, index: true},
    name: String,
    boarding_area: String,
    other_names: [String],
    boarding: Number,
    departure: Number,
    invalidate_time: Date,
    available: {type: Boolean, required: true, default: true},
    arrival_at_school: Number,
    company: String,
    phone: [String],
    numbers: [Number]
  }));

  export const BusLocationHistory = model<BusLocationHistory & Document>("BusLocationHistory", new Schema({
    bus_id: {type: String, required: true},
    locations: {type: [String], required: true},
    time: Date,
    source: String
  }));

  const stopSchema = new Schema({
    bus_id: {type: String, required: true, index: true},
    name: String,
    description: String,
    location: {
      latitude: Number,
      longitude: Number
    },
    coords: new Schema({
      type: {type: String, required: true},
      coordinates: {type: [Number], required: true},
    }),
    order: Number,
    arrival_time: Date,
    invalidate_time: Date,
    available: {type: Boolean, required: true, default: true}
  });
  stopSchema.index({coords: "2dsphere"});
  export const Stop = model<Stop & Document>("Stop", stopSchema);

  /** @deprecated */
  export const StopSuggestion = model<StopSuggestion & Document>("StopSuggestion", new Schema({
    bus_id: {type: String, required: true},
    location: {
      latitude: {type: Number, required: true},
      longitude: {type: Number, required: true}
    },
    time: Date,
    source: String
  }));

  export const DismissalRange = model<DismissalRange & Document>("DismissalRange", new Schema({
    school_id: {type: String, required: true, index: true},
    start_date: {type: Number, required: true},
    end_date: {type: Number, required: true},
    dismissal_time: Number,
    departure_time: Number,
    start_time: Number,
    end_time: Number,
    days_of_week: {type: [Number], required: true}
  }));

  const alertSchema = new Schema({
    school_id: {type: String, required: true, index: true},
    start_date: {type: Number, required: true, default: 0},
    end_date: {type: Number, required: true},
    type: new Schema({
      name: {type: String, required: true},
      color: {
        name: String,
        r: {type: Number, required: true, default: 0},
        g: {type: Number, required: true, default: 0},
        b: {type: Number, required: true, default: 0},
        alpha: {type: Number, required: true},
        appearances: {
          type: Map,
          of: {
            name: String,
            r: {type: Number, required: true},
            g: {type: Number, required: true},
            b: {type: Number, required: true},
            alpha: {type: Number, required: true}
          }
        }
      }
    }),
    title: {type: String, required: true},
    content: {type: String, required: true},
    data: Schema.Types.Mixed,
    can_dismiss: {type: Boolean, required: true, default: true}
  });
  export const Alert = model<Alert & Document>("Alert", alertSchema);
}
