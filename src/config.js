const fs = require('fs');
const path = require('path');

const configPath = path.resolve(__dirname, '..', 'config.json');
const fileConfig = fs.existsSync(configPath)
    ? require(configPath)
    : {};

const config = {
    token: process.env.DISCORD_TOKEN || fileConfig.token,
    clientId: process.env.DISCORD_CLIENT_ID || fileConfig.clientId,
    botChannelId: process.env.DISCORD_BOT_CHANNEL_ID || fileConfig.botChannelId,
};

for (const [key, value] of Object.entries(config)) {
    if (!value) {
        throw new Error(`Missing required config value: ${key}`);
    }
}

module.exports = config;
