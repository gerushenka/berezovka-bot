const { createQueueEmbed, createTrackAddedEmbed } = require('../discord/musicEmbeds');
const { trimForDiscord } = require('../utils/text');

const MAX_AUTOCOMPLETE_RESULTS = 10;

function createMusicCommands({ queueManager, soundCloudService }) {
    return {
        chatInputHandlers: {
            play: handlePlay,
            queue: handleQueue,
            skip: handleSkip,
            stop: handleStop,
        },
        handleAutocomplete,
    };

    async function handleAutocomplete(interaction) {
        const query = interaction.options.getFocused();

        if (!query || soundCloudService.isSoundCloudUrl(query)) {
            return interaction.respond([]);
        }

        try {
            const tracks = await soundCloudService.searchTracks(query, MAX_AUTOCOMPLETE_RESULTS);
            const choices = tracks.slice(0, MAX_AUTOCOMPLETE_RESULTS).map(track => ({
                name: trimForDiscord(track.title, 100),
                value: trimForDiscord(track.title, 100),
            }));

            return interaction.respond(choices);
        } catch (error) {
            console.error('Autocomplete error:', error);
            return interaction.respond([]);
        }
    }

    async function handlePlay(interaction) {
        const query = interaction.options.getString('url', true);
        const voiceChannel = interaction.member.voice.channel;

        if (!voiceChannel) {
            return interaction.reply({
                content: 'Join a voice channel first.',
                ephemeral: true,
            });
        }

        await interaction.deferReply();

        try {
            const resolved = await soundCloudService.resolveQuery(query, interaction.user.id);

            if (!resolved) {
                return interaction.editReply('Nothing was found on SoundCloud.');
            }

            const queueResult = resolved.type === 'playlist'
                ? await queueManager.addTracks({
                    guildId: interaction.guild.id,
                    voiceChannel,
                    textChannel: interaction.channel,
                    tracks: resolved.tracks,
                })
                : await queueManager.addTrack({
                    guildId: interaction.guild.id,
                    voiceChannel,
                    textChannel: interaction.channel,
                    track: resolved.track,
                });

            return interaction.editReply({
                embeds: [createTrackAddedEmbed(
                    resolved.type === 'playlist' ? resolved : resolved.track,
                    queueResult,
                )],
            });
        } catch (error) {
            console.error('Playback error:', error);
            return interaction.editReply('Playback error: ' + error.message);
        }
    }

    function handleQueue(interaction) {
        const queueState = queueManager.getQueueState(interaction.guild.id);

        if (!queueState || (!queueState.current && !queueState.tracks.length)) {
            return interaction.reply('Queue is empty.');
        }

        return interaction.reply({
            embeds: [createQueueEmbed(queueState)],
        });
    }

    function handleSkip(interaction) {
        const count = interaction.options.getInteger('count') || 1;
        const skipped = queueManager.skip(interaction.guild.id, count);

        if (!skipped) {
            return interaction.reply({
                content: 'Nothing is playing right now.',
                ephemeral: true,
            });
        }

        if (skipped.skippedCount === 1) {
            return interaction.reply('Track skipped.');
        }

        return interaction.reply(
            `Skipped ${skipped.skippedCount} tracks total (${skipped.removedQueuedCount} removed from the queue).`,
        );
    }

    function handleStop(interaction) {
        const stopped = queueManager.stop(interaction.guild.id);

        if (!stopped) {
            return interaction.reply({
                content: 'Nothing is playing right now.',
                ephemeral: true,
            });
        }

        return interaction.reply('Playback stopped and queue cleared.');
    }
}

module.exports = { createMusicCommands };
