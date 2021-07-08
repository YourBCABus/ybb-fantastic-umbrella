import { OAuth2Client } from 'google-auth-library';

/**
 * Google OAuth configuration.
 */
export interface GoogleConfig {
    clientID: string;
    clientSecret: string;
    redirectURI: string
}

/**
 * Creates a Google OAuth2 client based on a Google OAuth config.
 * @param param0 - a {@link GoogleConfig} object to use 
 * @returns a Google OAuth2 client
 */
export default function makeGoogleClient({clientID, clientSecret, redirectURI}: GoogleConfig) {
    return new OAuth2Client(clientID, clientSecret, redirectURI);
}