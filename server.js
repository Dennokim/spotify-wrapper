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

app.use(express.static(path.join(__dirname, "views")));

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
    let randomIndex = Math.floor(Math.random() * possibleChars.length); // Fix the index range
    text += possibleChars[randomIndex];
  }
  return text;
}

app.get("/web", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "web.html"))
})

app.get("/login", (req, res) => {
  const state = generateRandomString(16);
  req.session.state = state;

  const scopes = ["user-read-private", "user-read-email"];
  const authorizeURL = spotifyApi.createAuthorizeURL(scopes, state); // Use correct method and pass 'scopes'
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

    res.redirect("/logged");
  } catch (err) {
    console.error("Error exchanging code for access token:", err);
    res.status(500).send("Error");
  }
});

// Serve the 'logged.html' file when the user is logged in
app.get("/logged", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "logged.html"));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
