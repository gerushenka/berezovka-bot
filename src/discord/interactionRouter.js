function createInteractionRouter({ botChannelId, musicCommands }) {
    return async function routeInteraction(interaction) {
        try {
            if (interaction.channelId !== botChannelId) {
                if (interaction.isAutocomplete()) {
                    return interaction.respond([]);
                }

                return;
            }

            if (interaction.isAutocomplete()) {
                return musicCommands.handleAutocomplete(interaction);
            }

            if (!interaction.isChatInputCommand()) {
                return;
            }

            const handler = musicCommands.chatInputHandlers[interaction.commandName];

            if (!handler) {
                return;
            }

            return handler(interaction);
        } catch (error) {
            console.error('❌ Ошибка обработки взаимодействия:', error);
            return replyWithError(interaction);
        }
    };
}

function replyWithError(interaction) {
    if (!interaction.isRepliable()) {
        return undefined;
    }

    const message = '❌ Внутренняя ошибка бота.';

    if (interaction.deferred) {
        return interaction.editReply(message).catch(() => undefined);
    }

    if (interaction.replied) {
        return interaction.followUp({ content: message, ephemeral: true }).catch(() => undefined);
    }

    return interaction.reply({ content: message, ephemeral: true }).catch(() => undefined);
}

module.exports = { createInteractionRouter };
