export interface Permissions {
  bus?: {create?: boolean, update?: boolean, delete?: boolean, location?: boolean};
}

export interface AuthToken extends Permissions {
  _id: any;
  tokenHash: string;
  permissions: Record<string, Permissions>;
}

export interface Coordinate {
  latitude: number;
  longitude: number;
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
  location: Coordinate;
  order?: number;
  arrival_time?: Date;
  invalidate_time?: Date;
  available: boolean;
}
