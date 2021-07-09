import {Application} from "express";
import {ServiceAccount} from "firebase-admin";
import { ObjectId } from "mongoose";
import { ClientMetadata, JWK } from "oidc-provider";
import {GoogleConfig} from "./auth/google";

/**
 * Contents of config.json, the configuration file for the server.
 */
export interface Config {
  /**
   * MongoDB connection url.
   */
  mongo: string;

  /**
   * Configuration for bus arrival notifications.
   * @deprecated
   */
  notification: {text: string, title: string};

  /**
   * Port to listen to.
   */
  port: number;

  /**
   * IP address to bind to.
   */
  bindTo: string;

  /**
   * Configuration for Google OAuth.
   */
  google: GoogleConfig;

  /**
   * Secret used when generating OAuth state tokens.
   */
  stateTokenSecret: string;

  /**
   * Domain used for the OAuth state cookie.
   */
  stateTokenDomain?: string;

  /**
   * Issuer for YourBCABus auth tokens.
   */
  authIssuer: string;

  /**
   * List of keys used when generating auth sessions.
   */
  authCookieKeys: string[];

  /**
   * List of JWKs used for YourBCABus auth tokens.
   */
  authJWKKeys: JWK[];
}

/**
 * Arguments given to each legacy API route provider.
 */
export interface ServerProviderArguments {
  /**
   * Express application used by the server.
   */
  app: Application;

  /**
   * Configuration for the server.
   */
  config: Config;

  /**
   * Firebase service account, used for sending notifications with Firebase Cloud Messaging.
   * @deprecated
   */
  serviceAccount?: ServiceAccount;
}

/** @deprecated */
export interface Permissions {
  bus?: {create?: boolean, update?: boolean, delete?: boolean, location?: boolean};
  stop?: {create?: boolean, update?: boolean, delete?: boolean, suggest?: boolean};
  auth?: boolean;
  dismissal?: boolean;
  alerts?: boolean;
}

/** @deprecated */
export interface AuthToken extends Permissions {
  _id: any;
  tokenHash: string;
  description?: string;
  school_id: string;
  admin?: boolean;
}

/**
 * A YourBCABus user.
 * 
 * @remarks
 * Currently, only Google-based users are supported.
 */
export interface User {
  _id: ObjectId;
  google_id?: string;
  email: string;
  restricted_scopes?: string[];
}

/**
 * OAuth client.
 */
export interface Client {
  _id: ObjectId;
  secret: string;
  restricted_scopes?: string[];
  redirect_uris: string[];
}

/**
 * Permissions for a given user in a given school.
 */
export interface Permission {
  _id: ObjectId;
  user_id: string;
  school_id: string;

  /**
   * List of scopes the user is allowed to access in addition to the school's public_scopes.
   */
  scopes: string[];
}

/**
 * Permissions for a given client in a given school (when using the client_credentials grant type).
 */
export interface ClientPermission {
  _id: ObjectId;
  client_id: string;
  school_id: string;

  /**
   * List of scopes the client is allowed to access in addition to the school's public_scopes.
   */
  scopes: string[];
}

/**
 * A coordinate.
 */
export interface Coordinate {
  latitude: number;
  longitude: number;
}

/**
 * A GeoJSON point.
 */
export interface Point {
  type: string; // should be "point"
  coordinates: number[];
}

/**
 * A school which can hold a series of buses.
 */
export interface School {
  _id: any;
  name?: string;
  location?: Coordinate;
  available: boolean;
  timezone?: string;
  legacy_api_enabled?: boolean;

  /**
   * List of scopes that can be used in this school without authentication.
   */
  public_scopes?: string[];
}

/**
 * A bus.
 */
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
  company?: string;
  phone?: string[];
  numbers?: number[];
}

/**
 * An entry in a bus's history of locations.
 */
export interface BusLocationHistory {
  _id: any;
  bus_id: string;
  locations: string[];
  time?: Date;
  source: string;
}

/**
 * A stop on a bus's route.
 */
export interface Stop {
  _id: any;
  bus_id: string;
  name?: string;
  description?: string;
  location?: Coordinate;
  coords?: Point;
  order?: number;
  arrival_time?: Date;
  invalidate_time?: Date;
  available: boolean;
}

/**
 * A suggestion to add a new stop to the database.
 * @deprecated
 */
export interface StopSuggestion {
  _id: any;
  bus_id: string;
  location: Coordinate;
  time?: Date;
  source?: string;
}

/**
 * Metadata describing a school's time of dismissal for a given range of days.
 */
export interface DismissalRange {
  _id: any;
  school_id: string;
  start_date: number;
  end_date: number;
  dismissal_time?: number;
  departure_time?: number;
  start_time?: number;
  end_time?: number;
  days_of_week: number[];
}

/**
 * A color used in the YourBCABus UI.
 */
export interface Color {
  name?: string;
  r: number;
  g: number;
  b: number;
  alpha: number;
  appearances?: Record<string, {name?: string, r: number, g: number, b: number, alpha: number}>;
}

/**
 * A message displayed to YourBCABus users.
 */
export interface Alert {
  _id: any;
  school_id: string;
  start_date: number;
  end_date: number;
  type?: AlertType;
  title: string;
  content: string;
  data: any;
  can_dismiss: boolean;
}

/**
 * An alert's `type`.
 * 
 * @see {@link Alert.type}
 */
export interface AlertType {
  name: string;
  color: Color;
}