require('dotenv').config({ quiet: true });

const config = {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.DISCORD_CLIENT_ID,
    botChannelId: process.env.DISCORD_BOT_CHANNEL_ID,
    soundCloudClientId: process.env.SOUNDCLOUD_CLIENT_ID,
};

for (const [key, value] of Object.entries(config)) {
    if (!value) {
        throw new Error(`Missing required config value: ${key}`);
    }
}

module.exports = config;
