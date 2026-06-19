const { REST, Routes } = require('discord.js');
const { commands } = require('./slashCommands');

async function registerCommands({ token, clientId }) {
    const rest = new REST({ version: '10' }).setToken(token);

    console.log('Регистрация команд...');
    await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands.map(command => command.toJSON()) },
    );
    console.log('Команды зарегистрированы!');
}

module.exports = { registerCommands };
