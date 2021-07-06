import { google } from 'googleapis';

export interface GoogleConfig {
    clientID: string;
    clientSecret: string;
    redirectURI: string
}

export default function makeGoogleClient({clientID, clientSecret, redirectURI}: GoogleConfig) {
    return new google.auth.OAuth2(clientID, clientSecret, redirectURI);
}