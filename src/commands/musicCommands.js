const {
    createPlayerControlsRow,
    createQueueEmbed,
    createTrackAddedEmbed,
} = require('../discord/musicEmbeds');
const { trimForDiscord } = require('../utils/text');

const MAX_AUTOCOMPLETE_RESULTS = 10;

function createMusicCommands({ queueManager, soundCloudService }) {
    return {
        chatInputHandlers: {
            play: handlePlay,
            pause: handlePause,
            queue: handleQueue,
            resume: handleResume,
            skip: handleSkip,
            stop: handleStop,
        },
        buttonHandlers: {
            pause: handlePause,
            resume: handleResume,
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
                components: [createPlayerControlsRow()],
            });
        } catch (error) {
            console.error('Playback error:', error);
            return interaction.editReply('Playback error: ' + error.message);
        }
    }

    function handleQueue(interaction) {
        const queueState = queueManager.getQueueState(interaction.guild.id);

        if (!queueState || (!queueState.current && !queueState.tracks.length)) {
            return reply(interaction, 'Queue is empty.');
        }

        return reply(interaction, {
            embeds: [createQueueEmbed(queueState)],
            components: [createPlayerControlsRow()],
        });
    }

    function handlePause(interaction) {
        const paused = queueManager.pause(interaction.guild.id);

        if (!paused) {
            return reply(interaction, { content: 'Nothing is playing right now.', ephemeral: true });
        }

        if (paused === 'already_paused') {
            return reply(interaction, { content: 'Playback is already paused.', ephemeral: true });
        }

        return reply(interaction, 'Playback paused.');
    }

    function handleResume(interaction) {
        const resumed = queueManager.resume(interaction.guild.id);

        if (!resumed) {
            return reply(interaction, { content: 'Nothing is playing right now.', ephemeral: true });
        }

        if (resumed === 'not_paused') {
            return reply(interaction, { content: 'Playback is not paused.', ephemeral: true });
        }

        return reply(interaction, 'Playback resumed.');
    }

    function handleSkip(interaction) {
        const count = interaction.isChatInputCommand()
            ? (interaction.options.getInteger('count') || 1)
            : 1;
        const skipped = queueManager.skip(interaction.guild.id, count);

        if (!skipped) {
            return reply(interaction, { content: 'Nothing is playing right now.', ephemeral: true });
        }

        if (skipped.skippedCount === 1) {
            return reply(interaction, 'Track skipped.');
        }

        return reply(
            interaction,
            `Skipped ${skipped.skippedCount} tracks total (${skipped.removedQueuedCount} removed from the queue).`,
        );
    }

    function handleStop(interaction) {
        const stopped = queueManager.stop(interaction.guild.id);

        if (!stopped) {
            return reply(interaction, { content: 'Nothing is playing right now.', ephemeral: true });
        }

        return reply(interaction, 'Playback stopped and queue cleared.');
    }

    function reply(interaction, message) {
        const payload = typeof message === 'string' ? { content: message } : message;

        if (interaction.isButton()) {
            return interaction.reply({ ...payload, ephemeral: payload.ephemeral ?? false });
        }

        return interaction.reply(payload);
    }
}

module.exports = { createMusicCommands };
