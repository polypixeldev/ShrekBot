module.exports = {
  name: 'reset',
  description: 'Resets your current conversation data',
  aliases: ['r'],
  execute(Discord, client, message, args, userData){
    let data = {...userData}
    delete data.inputs[message.author.id]
    delete data.responses[message.author.id]

    const embed = new Discord.MessageEmbed()
    .setColor(0x00FF00)
    .setDescription('Conversation data reset')

    message.channel.send(embed)
    return data
  }
}