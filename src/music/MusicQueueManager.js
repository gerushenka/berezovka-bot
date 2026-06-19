const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    entersState,
    VoiceConnectionStatus,
} = require('@discordjs/voice');
const { createNowPlayingEmbed } = require('../discord/musicEmbeds');

const DISCONNECT_DELAY_MS = 5000;

class MusicQueueManager {
    constructor({ soundCloudService }) {
        this.soundCloudService = soundCloudService;
        this.queues = new Map();
    }

    async addTrack({ guildId, voiceChannel, textChannel, track }) {
        return this.addTracks({
            guildId,
            voiceChannel,
            textChannel,
            tracks: [track],
        });
    }

    async addTracks({ guildId, voiceChannel, textChannel, tracks }) {
        if (!tracks.length) {
            throw new Error('No tracks were found to add to the queue.');
        }

        const queue = this.getOrCreateQueue(guildId, textChannel);
        queue.textChannel = textChannel;

        await this.ensureVoiceConnection(queue, voiceChannel);

        const queueLengthBefore = queue.tracks.length;
        const startsNow = !queue.current && queueLengthBefore === 0;
        const position = startsNow ? 0 : queueLengthBefore + 1;

        queue.tracks.push(...tracks);
        queue.suppressNextNowPlaying = startsNow;

        let startedTrack = null;

        if (startsNow && queue.player.state.status === AudioPlayerStatus.Idle) {
            startedTrack = await this.playNext(queue);
        }

        if (startsNow && startedTrack !== tracks[0]) {
            throw new Error('Failed to start playback for this request.');
        }

        return {
            startsNow,
            position,
            addedCount: tracks.length,
        };
    }

    getQueueState(guildId) {
        const queue = this.queues.get(guildId);

        if (!queue) {
            return null;
        }

        return {
            current: queue.current,
            tracks: [...queue.tracks],
        };
    }

    skip(guildId, count = 1) {
        const queue = this.queues.get(guildId);

        if (!queue || !queue.current) {
            return false;
        }

        const normalizedCount = Number.isInteger(count) && count > 0 ? count : 1;
        const removedFromQueue = normalizedCount > 1
            ? queue.tracks.splice(0, normalizedCount - 1)
            : [];

        queue.player.stop(true);
        return {
            skippedCount: 1 + removedFromQueue.length,
            removedQueuedCount: removedFromQueue.length,
        };
    }

    stop(guildId) {
        if (!this.queues.has(guildId)) {
            return false;
        }

        this.cleanupQueue(guildId);
        return true;
    }

    destroyAll() {
        for (const guildId of this.queues.keys()) {
            this.cleanupQueue(guildId);
        }
    }

    getOrCreateQueue(guildId, textChannel) {
        let queue = this.queues.get(guildId);

        if (queue) {
            return queue;
        }

        const player = createAudioPlayer();

        queue = {
            guildId,
            textChannel,
            connection: null,
            player,
            tracks: [],
            current: null,
            leaveTimer: null,
            suppressNextNowPlaying: false,
            destroyed: false,
        };

        player.on(AudioPlayerStatus.Idle, () => {
            if (!queue.current || queue.destroyed) {
                return;
            }

            console.log('Track finished:', queue.current.title);
            queue.current = null;
            this.playNext(queue).catch(error => {
                console.error('Failed to start next track:', error);
                this.notifyChannel(queue, 'Failed to start the next track: ' + error.message);
            });
        });

        player.on('error', (error) => {
            console.error('Player error:', error);
            this.notifyChannel(queue, 'Player error: ' + error.message);
            queue.current = null;
            queue.suppressNextNowPlaying = false;
            this.playNext(queue).catch(nextError => {
                console.error('Failed to recover after player error:', nextError);
            });
        });

        this.queues.set(guildId, queue);
        return queue;
    }

    async ensureVoiceConnection(queue, voiceChannel) {
        if (queue.leaveTimer) {
            clearTimeout(queue.leaveTimer);
            queue.leaveTimer = null;
        }

        if (queue.connection && queue.connection.joinConfig.channelId === voiceChannel.id) {
            return queue.connection;
        }

        if (queue.connection) {
            queue.connection.destroy();
        }

        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        });

        try {
            await entersState(connection, VoiceConnectionStatus.Ready, 10000);
            console.log('Connected to voice channel');
        } catch (error) {
            console.error('Voice connection error:', error);
            connection.destroy();
            throw new Error('Failed to connect to the voice channel.');
        }

        connection.subscribe(queue.player);
        queue.connection = connection;
        return connection;
    }

    async playNext(queue) {
        if (queue.destroyed) {
            return null;
        }

        if (!queue.tracks.length) {
            queue.suppressNextNowPlaying = false;
            this.scheduleDisconnect(queue);
            return null;
        }

        if (!queue.connection) {
            this.cleanupQueue(queue.guildId);
            return null;
        }

        const track = queue.tracks.shift();
        queue.current = track;

        console.log('Track:', track.title);
        console.log('URL:', track.url);
        console.log('Loading stream...');

        let stream;

        try {
            stream = await this.soundCloudService.downloadStream(track.url);
        } catch (error) {
            console.error('Failed to load stream:', error);
            this.notifyChannel(queue, `Failed to load track: ${track.title}`);
            queue.current = null;
            queue.suppressNextNowPlaying = false;
            return this.playNext(queue);
        }

        if (queue.destroyed) {
            return null;
        }

        const resource = createAudioResource(stream);
        queue.player.play(resource);

        try {
            await entersState(queue.player, AudioPlayerStatus.Playing, 10000);

            if (queue.destroyed) {
                return null;
            }

            console.log('Playback started');

            if (queue.suppressNextNowPlaying) {
                queue.suppressNextNowPlaying = false;
            } else {
                this.notifyNowPlaying(queue, track);
            }
        } catch (error) {
            console.error('Failed to start playback:', error);
            queue.current = null;
            queue.suppressNextNowPlaying = false;
            return this.playNext(queue);
        }

        return track;
    }

    scheduleDisconnect(queue) {
        if (queue.leaveTimer) {
            clearTimeout(queue.leaveTimer);
        }

        queue.leaveTimer = setTimeout(() => {
            console.log('Queue ended, disconnecting from voice channel');
            this.cleanupQueue(queue.guildId);
        }, DISCONNECT_DELAY_MS);
    }

    notifyNowPlaying(queue, track) {
        this.notifyChannel(queue, {
            embeds: [createNowPlayingEmbed(track, queue.tracks.length)],
        });
    }

    notifyChannel(queue, message) {
        if (!queue.textChannel) {
            return;
        }

        queue.textChannel.send(message).catch(error => {
            console.error('Failed to send message:', error);
        });
    }

    cleanupQueue(guildId) {
        const queue = this.queues.get(guildId);

        if (!queue) {
            return;
        }

        if (queue.leaveTimer) {
            clearTimeout(queue.leaveTimer);
        }

        queue.tracks = [];
        queue.current = null;
        queue.destroyed = true;
        queue.player.stop(true);

        if (queue.connection) {
            queue.connection.destroy();
        }

        this.queues.delete(guildId);
    }
}

module.exports = { MusicQueueManager };
