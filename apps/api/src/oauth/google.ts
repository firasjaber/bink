import { OAuth2Client } from "google-auth-library";
import { config } from "../config";

export const oauth2Client = new OAuth2Client(
  config.GOOGLE_OAUTH_CLIENT_ID,
  config.GOOGLE_OAUTH_CLIENT_SECRET,
  config.GOOGLE_REDIRECT_URI
);

export function generateGoogleAuthUrl() {
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
    include_granted_scopes: true,
  });
}
