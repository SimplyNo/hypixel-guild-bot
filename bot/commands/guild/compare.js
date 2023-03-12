module.exports = {
    name: "compare",
    type: "comingsoon",

    aliases: [],
    async execute(message, args, bot) {

        bot.createEmbed(message)
            .setAuthor(`Guild Compare`)
            .setTitle(`{guild.1} VS {guild.2}`)
            .setDescription(`
\`•\` Level: \\/ {guild_1} | {guild.1.level}
\`•\` Level: ^ {guild_1} | {guild.1.level}

        `)
    }

}