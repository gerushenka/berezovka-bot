const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
} = require('discord.js');

const SOUNDCLOUD_COLOR = 0xFF6600;

function createTrackAddedEmbed(item, { startsNow, position, addedCount = 1 }) {
    const isPlaylist = item && Array.isArray(item.tracks);
    const description = isPlaylist
        ? formatPlaylistLink(item, addedCount)
        : formatTrackLink(item);
    const title = isPlaylist
        ? (startsNow ? 'Now playing playlist' : 'Playlist added to queue')
        : (startsNow ? 'Now playing' : 'Added to queue');
    const footerText = startsNow
        ? 'SoundCloud'
        : `Queue position: ${position}`;

    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(SOUNDCLOUD_COLOR)
        .setFooter({ text: footerText });
}

function createQueueEmbed({ current, tracks }) {
    const lines = [];

    if (current) {
        lines.push(`**Now playing:** ${formatTrackLink(current)}`);
    }

    if (tracks.length) {
        const nextTracks = tracks
            .slice(0, 10)
            .map((track, index) => `${index + 1}. ${formatTrackLink(track)}`);

        lines.push(`**Next:**\n${nextTracks.join('\n')}`);

        if (tracks.length > 10) {
            lines.push(`And ${tracks.length - 10} more track(s).`);
        }
    }

    return new EmbedBuilder()
        .setTitle('Queue')
        .setDescription(lines.join('\n\n'))
        .setColor(SOUNDCLOUD_COLOR);
}

function createNowPlayingEmbed(track, remainingCount) {
    return new EmbedBuilder()
        .setTitle('Now playing')
        .setDescription(formatTrackLink(track))
        .setColor(SOUNDCLOUD_COLOR)
        .setFooter({ text: `Remaining in queue: ${remainingCount}` });
}

function createPlayerControlsRow() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('music:pause')
            .setLabel('Pause')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('music:resume')
            .setLabel('Resume')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('music:skip')
            .setLabel('Skip')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('music:stop')
            .setLabel('Stop')
            .setStyle(ButtonStyle.Danger),
    );
}

function formatPlaylistLink(playlist, addedCount) {
    const summary = `[${escapeLinkLabel(playlist.title)}](${playlist.url})`;
    return `${summary}\nAdded tracks: ${addedCount}`;
}

function formatTrackLink(track) {
    return `[${escapeLinkLabel(track.title)}](${track.url})`;
}

function escapeLinkLabel(value) {
    return String(value).replace(/\n/g, ' ').replace(/([\\\]])/g, '\\$1');
}

module.exports = {
    createNowPlayingEmbed,
    createPlayerControlsRow,
    createQueueEmbed,
    createTrackAddedEmbed,
};
