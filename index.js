const { Events } = require('discord.js');
const config = require('./src/config');
const { createDiscordClient } = require('./src/discord/client');
const { createInteractionRouter } = require('./src/discord/interactionRouter');
const { registerCommands } = require('./src/discord/registerCommands');
const { createMusicCommands } = require('./src/commands/musicCommands');
const { MusicQueueManager } = require('./src/music/MusicQueueManager');
const soundCloudService = require('./src/services/soundCloudService');

const client = createDiscordClient();
const queueManager = new MusicQueueManager({ soundCloudService });
const musicCommands = createMusicCommands({ queueManager, soundCloudService });

client.once(Events.ClientReady, (readyClient) => {
    console.log(`Бот ${readyClient.user.tag} запущен!`);
});

client.on(Events.InteractionCreate, createInteractionRouter({
    botChannelId: config.botChannelId,
    musicCommands,
}));

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

start().catch((error) => {
    console.error('❌ Не удалось запустить бота:', error);
    process.exit(1);
});

async function start() {
    await registerCommands(config);
    await client.login(config.token);
}

function shutdown() {
    queueManager.destroyAll();
    client.destroy();
    process.exit(0);
}
