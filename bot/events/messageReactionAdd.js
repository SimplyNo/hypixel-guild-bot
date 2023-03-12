
module.exports = {
    name: "messageReactionAdd",
    async execute(bot, reaction, user) {
        // console.log("??")
        // console.log(reaction.message.id == bot.supportServer.reactionMessage)
        if (reaction.message.id == bot.supportServer.reactionMessage) {
            let member = await reaction.message.guild.members.fetch(user.id);
            if (reaction.emoji.name == "📣") {
                // bot updates role
                member.roles.add("867054263041654824");
            } else if (reaction.emoji.name == "❗") {
                // bot status role
                member.roles.add("867054534910935050");
            }
        }
    }
}