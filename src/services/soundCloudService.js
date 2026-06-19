const soundcloud = require('soundcloud-downloader').default;

const SOUNDCLOUD_CLIENT_ID = '438032684';

async function resolveQuery(query, requestedBy) {
    if (isSoundCloudUrl(query)) {
        if (isSoundCloudPlaylistUrl(query)) {
            const info = await soundcloud.getSetInfo(query);

            const tracks = normalizeTracks(info.tracks, requestedBy);

            return tracks.length ? {
                type: 'playlist',
                title: info.title || 'SoundCloud playlist',
                tracks,
                url: info.permalink_url || query,
            } : null;
        }

        const info = await soundcloud.getInfo(query);

        return {
            type: 'track',
            track: normalizeTrack(info, requestedBy, query),
        };
    }

    const [track] = await searchTracks(query, 1);

    if (!track) {
        return null;
    }

    return {
        type: 'track',
        track: {
            ...track,
            requestedBy,
        },
    };
}

async function resolveTrack(query, requestedBy) {
    const result = await resolveQuery(query, requestedBy);

    if (!result || result.type !== 'track') {
        return null;
    }

    return result.track;
}

async function searchTracks(query, limit = 10) {
    const search = await soundcloud.search({
        query,
        limit,
        resourceType: 'tracks',
    });

    return getTracksFromSearch(search).slice(0, limit);
}

function downloadStream(trackUrl) {
    return soundcloud.download(trackUrl, {
        clientID: SOUNDCLOUD_CLIENT_ID,
    });
}

function getTracksFromSearch(search) {
    return (search.collection || [])
        .filter(track => track && track.kind === 'track' && track.permalink_url)
        .map(track => normalizeTrack(track));
}

function normalizeTracks(tracks, requestedBy) {
    return (tracks || [])
        .filter(track => track && track.kind === 'track' && track.permalink_url)
        .map(track => normalizeTrack(track, requestedBy));
}

function normalizeTrack(track, requestedBy = null, fallbackUrl = null) {
    const artist = track.user?.username || 'Unknown artist';

    return {
        title: `${track.title} - ${artist}`,
        url: track.permalink_url || fallbackUrl,
        requestedBy,
    };
}

function isSoundCloudUrl(value) {
    return typeof value === 'string' && value.includes('soundcloud.com');
}

function isSoundCloudPlaylistUrl(value) {
    return typeof value === 'string'
        && typeof soundcloud.isPlaylistURL === 'function'
        && soundcloud.isPlaylistURL(value);
}

module.exports = {
    downloadStream,
    isSoundCloudUrl,
    resolveQuery,
    resolveTrack,
    searchTracks,
};
