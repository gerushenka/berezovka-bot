function trimForDiscord(value, maxLength) {
    if (value.length <= maxLength) {
        return value;
    }

    return value.slice(0, maxLength - 1) + '…';
}

module.exports = { trimForDiscord };
