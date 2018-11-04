export interface Permissions {
  bus?: {create?: boolean, update?: boolean, delete?: boolean, location?: boolean};
  stop?: {create?: boolean, update?: boolean, delete?: boolean, suggest?: boolean};
  auth?: boolean;
}

export interface AuthToken extends Permissions {
  _id: any;
  tokenHash: string;
  description?: string;
  school_id: string;
  admin?: boolean;
}

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface Point {
  type: string;
  coordinates: number[];
}

export interface School {
  _id: any;
  name?: string;
  location?: Coordinate;
  available: boolean;
}

export interface Bus {
  _id: any;
  school_id: string;
  name?: string;
  locations?: string[];
  boarding_time?: Date;
  departure_time?: Date;
  invalidate_time?: Date;
  available: boolean;
  other_names?: string[];
}

export interface BusLocationHistory {
  _id: any;
  bus_id: string;
  locations: string[];
  time?: Date;
  source: string;
}

export interface Stop {
  _id: any;
  bus_id: string;
  name?: string;
  description?: string;
  location?: Coordinate;
  coords: Point;
  order?: number;
  arrival_time?: Date;
  invalidate_time?: Date;
  available: boolean;
}

export interface StopSuggestion {
  _id: any;
  bus_id: string;
  location: Coordinate;
  time?: Date;
  source?: string;
}
