module.exports = {
  name: "kill",
  aliases: ["restart"],
  args: false,
  devOnly: true,
  execute(message, args, bot) {
      bot.createEmbed().setDescription("Restarting...").setTitle("Hypixel Guild Bot").send(message.channel).then(() => {
        process.abort();
        
      })
      
  }
}