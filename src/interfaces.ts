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
