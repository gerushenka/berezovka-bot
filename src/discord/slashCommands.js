const { SlashCommandBuilder } = require('discord.js');

const commands = [
    new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play music from SoundCloud')
        .addStringOption(option => option
            .setName('url')
            .setDescription('SoundCloud track, playlist link, or search query')
            .setRequired(true)
            .setAutocomplete(true)),
    new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Show current queue'),
    new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skip current track'),
    new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop playback and clear queue'),
];

module.exports = { commands };
