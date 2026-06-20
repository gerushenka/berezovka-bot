# berezovka-bot

Discord music bot for the Berezovka server. It registers slash commands and plays SoundCloud tracks or playlists in a voice channel.

## Features

- Slash commands: `/play`, `/pause`, `/resume`, `/skip`, `/queue`, `/stop`
- SoundCloud track, playlist, and search support
- Per-guild music queues
- Playback controls through Discord interactions

## Requirements

- Node.js 18 or newer
- npm
- Discord application with a bot token
- SoundCloud client ID

## Setup

Install dependencies:

```bash
npm install
```

Create local environment config:

```bash
cp .env.example .env
```

Fill `.env`:

```dotenv
DISCORD_TOKEN=your-discord-bot-token
DISCORD_CLIENT_ID=your-discord-application-client-id
DISCORD_BOT_CHANNEL_ID=your-discord-bot-channel-id
SOUNDCLOUD_CLIENT_ID=your-soundcloud-client-id
```

The `.env` file is ignored by git. Do not commit real tokens or IDs.

## Run

```bash
npm start
```

On startup the bot registers slash commands for the configured Discord application and then logs in.
