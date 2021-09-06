const fetch = require('node-fetch');

const MODEL = 'shrek-medium-full'
const API_URL = `https://api-inference.huggingface.co/models/Poly-Pixel/${MODEL}`;
const PREFIX = '$'

let loading = false;
let userResponses = {}
let userInputs = {}

let pendingInputs = []

function splitCommandLine(commandLine) {
  var doubleDoubleQuote = "<DDQ>";
  while (commandLine.indexOf(doubleDoubleQuote) > -1) doubleDoubleQuote += "@";
  var noDoubleDoubleQuotes = commandLine.replace(/""/g, doubleDoubleQuote);
  var spaceMarker = "<SP>";
  while (commandLine.indexOf(spaceMarker) > -1) spaceMarker += "@";
  var noSpacesInQuotes = noDoubleDoubleQuotes.replace(
    /"([^"]*)"?/g,
    (fullMatch, capture) => {
      return capture
        .replace(/ /g, spaceMarker)
        .replace(RegExp(doubleDoubleQuote, "g"), '"');
    }
  );
  var mangledParamArray = noSpacesInQuotes.split(/ +/);
  var paramArray = mangledParamArray.map((mangledParam) => {
    return mangledParam
      .replace(RegExp(spaceMarker, "g"), " ")
      .replace(RegExp(doubleDoubleQuote, "g"), "");
  });
  return paramArray;
}

module.exports = async (Discord, client, message) => {
  if (message.author.bot || message.author.system || message.cleanContent === '') {
    return;
  }

  if(message.cleanContent.startsWith(PREFIX)){
    const args = splitCommandLine(message.content.slice(PREFIX.length));
    const cmd = args.shift().toLowerCase();

    const command = client.commands.get(cmd) || client.commands.find(a => a.aliases && a.aliases.includes(cmd));
    if(!command) return;
    
    let data = command.execute(Discord, client, message, args, { inputs: userInputs, responses: userResponses });

    if(data){
      userInputs = data.inputs
      userResponses = data.responses
    }
  }

  const payload = {
    inputs: {
      text: message.cleanContent,
      generated_responses: userResponses[message.author.id] ? userResponses[message.author.id] : [],
      past_user_inputs: userInputs[message.author.id] ? userInputs[message.author.id] : []
    },
    options: {
      use_cache: false
    }
  };

  const headers = {
    'Authorization': 'Bearer ' + process.env.HUGGINGFACE_TOKEN
  };


  message.channel.startTyping();

  const response = await fetch(API_URL, {
    method: 'post',
    body: JSON.stringify(payload),
    headers: headers
  });

  const data = await response.json();
  let handleData = (data, message) => {
    let botResponse = '';
    if (data.hasOwnProperty('generated_text')) {
      botResponse = data.generated_text;
    } else if (data.hasOwnProperty('error')) { // error condition
      console.log(data)
      let embed;
      if (data.error === `Model Poly-Pixel/${MODEL} is currently loading`) {
        if (loading === false) {
          embed = new Discord.MessageEmbed()
            .setColor(0x00FF00)
            .setDescription(`Shrek will be at the swamp soon... \n \n Est. Time left: \`${data.estimated_time}\` seconds`)

          let time = Math.ceil(data.estimated_time) * 1000
          console.log(time)
          let waitAndRetry = async () => {
            console.log('ok')
            let newRes = await fetch(API_URL, {
              method: 'post',
              body: JSON.stringify(payload),
              headers: headers
            })

            const newData = await newRes.json();

            if(newData.error === `Model Poly-Pixel/${MODEL} is currently loading`){
              const embed = new Discord.MessageEmbed()
              .setColor(0x00FF00)
              .setDescription('Shrek\'s running a little late at the moment... Please wait...')

              message.channel.send(embed)

              setTimeout(waitAndRetry, 10000)
            } else {
              loading = false
              for(let payload of pendingInputs){
                console.log(payload)
                let pendRes = fetch(API_URL, {
                  method: 'post',
                  body: JSON.stringify(payload.payload),
                  headers: headers
                }).then(async pendRaw => {
                  let pendData = await pendRaw.json()
                  console.log(pendData)
                  handleData(pendData, payload.message)
                })
              }
            }
          }
          setTimeout(waitAndRetry, time)
          message.react('⏰')
          loading = true;
        } else {
          message.react('⏰')
          pendingInputs.push({
            payload: payload,
            message: message
          })
          message.channel.stopTyping()
          return;
        }
      } else {
        embed = new Discord.MessageEmbed()
          .setColor(0xFF0000)
          .setDescription(data.error)
      }
      botResponse = embed;
    }

    if (botResponse.length > 2000) {
      botResponse = botResponse.slice(0, 1986)
      botResponse = botResponse + "`(truncated)`"
    }

    // send message to channel as a reply
    message.channel.stopTyping()
    if (botResponse.trim) {
      if (botResponse.trim().length > 0){
        message.channel.send(botResponse);
        if(!userInputs[message.author.id] || !userResponses[message.author.id]) {
          userInputs[message.author.id] = [];
          userResponses[message.author.id] = [];
        }
        userInputs[message.author.id].push(message.cleanContent)
        userResponses[message.author.id].push(botResponse)
      }
    } else {
      message.channel.send(botResponse);
    }
  }
  handleData(data, message)
}