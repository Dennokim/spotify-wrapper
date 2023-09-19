const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const SpotifyWebApi = require("spotify-web-api-node");
const session = require("express-session");

dotenv.config();

const app = express();

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_CLIENT_REDIRECT,
});

app.use(express.static(path.join(__dirname, "build"))); // Serve the React app from the "build" folder

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
  })
);

function generateRandomString(length) {
  let text = "";
  const possibleChars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < length; ++i) {
    let randomIndex = Math.floor(Math.random() * possibleChars.length);
    text += possibleChars[randomIndex];
  }
  return text;
}

app.get("/login", (req, res) => {
  const state = generateRandomString(16);
  req.session.state = state;

  const scopes = ["user-read-private", "user-read-email"];
  const authorizeURL = spotifyApi.createAuthorizeURL(scopes, state);
  res.redirect(authorizeURL);
});

app.get("/callback", async (req, res) => {
  const { code, state } = req.query;
  const storedState = req.session.state;

  if (!state || state !== storedState) {
    console.error("State mismatch or missing.");
    res.status(401).send("Unauthorized");
    return;
  }

  req.session.state = null;

  try {
    const data = await spotifyApi.authorizationCodeGrant(code);
    const { access_token, refresh_token } = data.body;
    console.log("Access Token:", access_token);

    spotifyApi.setAccessToken(access_token);

    res.redirect("/profile"); // Updated route to /profile
  } catch (err) {
    console.error("Error exchanging code for access token:", err);
    res.status(500).send("Error");
  }
});

// Define the time ranges
const timeRanges = ['short_term', 'medium_term', 'long_term']; // 4 weeks, 6 months, all time

app.get('/top-tracks/:range', async (req, res) => {
  const { range } = req.params;

  if (!timeRanges.includes(range)) {
    return res.status(400).send('Invalid time range');
  }

  try {
    const data = await spotifyApi.getMyTopTracks({
      limit: 10, // Number of tracks to retrieve
      time_range: range, // Time range: short_term, medium_term, or long_term
    });

    const topTracks = data.body.items;
    res.json(topTracks);
  } catch (error) {
    console.error('Error fetching top tracks:', error);
    res.status(500).send('Error fetching top tracks');
  }
});

// All other routes will serve the React app
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
