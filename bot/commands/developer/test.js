const Discord = require('discord.js')
// const { APIMessage, Structures } = Discord;

// class ExtAPIMessage extends APIMessage {
//   resolveData() {
//     if (this.data) return this;
//     super.resolveData();
//     const allowedMentions = this.options.allowedMentions || this.target.client.options.allowedMentions || {};
//     if (allowedMentions.repliedUser !== undefined) {
//       if (this.data.allowed_mentions === undefined) this.data.allowed_mentions = {};
//       Object.assign(this.data.allowed_mentions, { replied_user: allowedMentions.repliedUser });
//     }
//     if (this.options.replyTo !== undefined) {
//       Object.assign(this.data, { message_reference: { message_id: this.options.replyTo.id } });
//     }
//     return this;
//   }
// }

// class Message extends Structures.get("Message") {
//   inlineReply(content, options) {
//     return this.channel.send(ExtAPIMessage.create(this, content, options, { replyTo: this }).resolveData());
//   }

//   edit(content, options) {
//     return super.edit(ExtAPIMessage.create(this, content, options).resolveData());
//   }
// }

// Structures.extend("Message", () => Message);

// const Message = Discord.Structures.get("Message");


// // example using impersonation - NOTE: your service account must have "domain-wide delegation" enabled
// // see https://developers.google.com/identity/protocols/oauth2/service-account#delegatingauthority
// await doc.useServiceAccountAuth(creds, 'user.to.impersonate@mycompany.com');


module.exports = {
    name: 'test',
    devOnly: true,
    /**
     * 
     * @param {Message} message 
     * @param {*} args 
     * @param {Discord.Client} bot 
     */
    async execute(message, args, bot) {
        message.reply("okay")
    }
}