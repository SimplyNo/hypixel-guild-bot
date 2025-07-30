// Load slash commands
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { Permissions } = require('discord.js');
const fs = require('fs');
const path = require('path')

const { token, client_id } = require('./config.json')

const commands = [];
const commandFiles = getAllFiles('./src/commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./${file}`);
    if (!command.devOnly) {
        if (!command.slash) {
            commands.push({ name: command.name, description: command.description || "no " });
            console.log(`/${command.name.padEnd(20, " .")} (no slash)`)
        }
        else {
            if (command.adminOnly) {
                command.slash.setDefaultMemberPermissions(Permissions.FLAGS.ADMINISTRATOR);

            }
            const json = command.slash.toJSON();
            commands.push(json);
            console.log(`/${command.name.padEnd(20, " .")} Subcommands: ${json.options.map(e => e.name)}`)
        }
    } else {
        console.log(`/${command.name.padEnd(20, " .")} (skip - dev)`)

    }
}

const rest = new REST({ version: '9' }).setToken(token);

(async function () {
    try {

        console.log('Reloading slash commands...');
        await rest.put(
            Routes.applicationCommands(client_id),
            {
                body: commands
            },
        );
        console.log('Reloaded slash commands!');
    } catch (e) {
        console.log(e)
    }
})()



function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath)
    arrayOfFiles = arrayOfFiles || []
    files.forEach(function (file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles)
        else arrayOfFiles.push(path.join(dirPath, "/", file))
    })
    return arrayOfFiles
}