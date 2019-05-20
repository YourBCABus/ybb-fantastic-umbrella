import {Application} from "express";
import {ServiceAccount} from "firebase-admin";

export interface Config {
  mongo: string;
  notification: {text: string, title: string};
  port: number;
  bindTo: string;
}

export interface ServerProviderArguments {
  app: Application;
  config: Config;
  serviceAccount?: ServiceAccount;
}

export interface Permissions {
  bus?: {create?: boolean, update?: boolean, delete?: boolean, location?: boolean};
  stop?: {create?: boolean, update?: boolean, delete?: boolean, suggest?: boolean};
  auth?: boolean;
  dismissal?: boolean;
  alerts?: boolean;
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
  timezone?: string;
}

export interface Bus {
  _id: any;
  school_id: string;
  name?: string;
  locations?: string[];
  boarding?: number;
  departure?: number;
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

export interface DismissalRange {
  _id: any;
  school_id: string;
  start_date: number;
  end_date: number;
  dismissal_time?: number;
  start_time?: number;
  end_time?: number;
  days_of_week: number[];
}

export interface Color {
  name?: string;
  r: number;
  g: number;
  b: number;
  alpha: number;
  appearances?: Record<string, {r: number, g: number, b: number, alpha: number}>;
}

export interface Alert {
  _id: any;
  school_id: string;
  start_date: number;
  end_date: number;
  type: AlertType;
  title: string;
  content: string;
  data: any;
  can_dismiss: boolean;
}

export interface AlertType {
  name: string;
  color: Color;
}