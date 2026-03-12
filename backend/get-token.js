/**
 * One-time OAuth token generator for the YouTube API.
 * Run: node get-token.js
 */

const { google } = require('googleapis');
const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const dotenv = require('dotenv');

dotenv.config();

const SECRET_PATH = path.join(__dirname, 'client_secret.json');
const ENV_PATH = path.join(__dirname, '.env');
const REDIRECT_PORT = 3001;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}`;

if (!fs.existsSync(SECRET_PATH)) {
  console.error('\n❌  client_secret.json not found in the backend folder!\n');
  process.exit(1);
}

const secrets = JSON.parse(fs.readFileSync(SECRET_PATH));
const creds = secrets.installed || secrets.web;

const oauth2Client = new google.auth.OAuth2(
  creds.client_id,
  creds.client_secret,
  REDIRECT_URI
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: ['https://www.googleapis.com/auth/youtube.upload'],
});

console.log('\n✅  Opening browser for authorization...');
console.log('\nIf the browser does not open, visit this URL manually:\n');
console.log(authUrl);
console.log('\n⏳  Waiting for Google to redirect back...\n');

// Open browser automatically on Windows
exec(`start "" "${authUrl}"`);

// Temporary local server to capture the redirect code
const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const code = parsed.query.code;

  if (!code) {
    res.end('No code received. Please try again.');
    return;
  }

  res.end('<h2>✅ Authorization successful! You can close this tab.</h2>');
  server.close();

  try {
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      console.error('\n❌  No refresh_token returned.');
      console.error('   Revoke access at https://myaccount.google.com/permissions and run this script again.\n');
      process.exit(1);
    }

    console.log('✅  Refresh token obtained!');

    // Update .env with all three values
    let envContent = fs.readFileSync(ENV_PATH, 'utf8');
    const updates = {
      GOOGLE_CLIENT_ID: creds.client_id,
      GOOGLE_CLIENT_SECRET: creds.client_secret,
      GOOGLE_REFRESH_TOKEN: tokens.refresh_token,
    };

    for (const [key, value] of Object.entries(updates)) {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      const line = `${key}=${value}`;
      envContent = regex.test(envContent)
        ? envContent.replace(regex, line)
        : envContent + `\n${line}`;
    }

    fs.writeFileSync(ENV_PATH, envContent);
    console.log('✅  .env updated! Restart your server: node index.js\n');
  } catch (err) {
    console.error('\n❌  Error fetching token:', err.message, '\n');
    process.exit(1);
  }
});

server.listen(REDIRECT_PORT, () => {
  console.log(`Listening on ${REDIRECT_URI} for the OAuth callback...`);
});
