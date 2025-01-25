const { SlashCommandBuilder } = require('@discordjs/builders');
const { Role, Constants, Permissions, CommandInteraction, Util, MessageActionRow, MessageButton, Message } = require('discord.js');
const validReqs = require('../../../valid-requirements.json');
function getGameTypeFromID(id) {
    console.log(id);
    console.log(validReqs.find(el => el.reqs.find(e => e.id.toLowerCase() == id)))
    return validReqs.find(el => el.reqs.find(e => e.id.toLowerCase() == id));
}
function getReqFromID(id) {
    return validReqs.flatMap(e => e.reqs).find(e => e.id.toLowerCase() == id);
}

module.exports = {
    name: "verifymessage",
    type: "config",
    adminOnly: true,
    description: "Send a message that has a button which members can verify with.",
    slash: new SlashCommandBuilder()
        .setName('verifymessage')
        .setDescription("Send a message that has a button which members can verify with.")
        .setDefaultMemberPermissions(Permissions.FLAGS.ADMINISTRATOR)
        .addSubcommand(subcommand =>
            subcommand
                .setName('send')
                .setDescription('Set the verify message.')

                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .addChannelTypes(0, 5)
                        .setDescription('The channel to send the message in.')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('message')
                        .setDescription('Custom message that the bot will display in the verify message. TIP: Use "\\n" to make new lines!')
                        .setRequired(false))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove the verify message.')
        ),
    /**
     * 
     * @param {CommandInteraction} interaction 
     * @param {*} param1 
     * @param {*} bot 
     * @returns 
     */
    async run(interaction, { serverConf }, bot) {
        if (interaction.options.getSubcommand() == "send") {
            const channel = interaction.options.getChannel('channel');
            const message = interaction.options.getString('message') || "Click the button below to verify!";
            const msg = await channel.send({
                embeds: [
                    bot.createEmbed()
                        .setAuthor({ name: interaction.guild.name + ' | Hypixel Verification', icon: interaction.guild.iconURL({ dynamic: true }) })
                        .setDescription(message.replaceAll("\\n", "\n"))
                        .setFooter(null)
                ],
                components: [
                    new MessageActionRow()
                        .addComponents(
                            new MessageButton()
                                .setCustomId(`verify-${interaction.guild.id}`)
                                .setLabel('Verify')
                                .setStyle('SUCCESS'),
                        ),
                ]
            })
            bot.config.verifyMessage.set(interaction.guild.id, msg.id);
            bot.createEmbed(interaction).setDescription(`Successfully sent the verification message in <#${channel.id}>!`).send()
        } else if (interaction.options.getSubcommand() == "remove") {


        }
    }
}