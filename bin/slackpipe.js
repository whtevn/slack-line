#!/usr/bin/env node
const fs = require('fs');

const mkdirp = require('mkdirp');
const yargs = require('yargs')
const dateFormat = require('dateformat');
const colors = require('colors');

import project_info from '../package.json';
import * as Slack   from '../index';
import * as display from '../lib/display';
// Slack.start(slack_info)
// Slack.read(slack_info, channel_name, constraints={}, log_function){
// Slack.write(slack_info, channel_name, text){
// Slack.follow(slack_info, log_function){

const HOME = process.env.HOME || process.env.USERPROFILE;
const DEFAULT_HOME = `${HOME}/.slack_info.json`;
const DEFAULT_HISTORY = `${HOME}/.slack`;

function retrieve_config(loc){
  let slack_info;
  try{
    slack_info = require(loc);
  }catch(e){
    console.log(`slack info file not found in ${loc}`)
    slack_info = {user: {}};
  }
  const token = (slack_info.user&&slack_info.user.slack_token)  || slack_info.token || process.env.SLACK_TOKEN
  slack_info.user = Object.assign((slack_info.user||{as_user:1}), {token}); 
  if(slack_info.user.channel) throw new Error(`${loc} no longer uses user.channel. use "default-channel" on the main object instead.`.yellow+"\nSee https://www.npmjs.com/package/slack-line for more information".cyan);
  return slack_info
}

const base_options = {
  "slack-token": {
    alias: 's',
    describe: 'optionally define your slack token. The SLACK_TOKEN environment variable is recommended.'
  },
}

const follow_options = Object.assign({}, {
  quiet: {
    alias: 'q',
    describe: 'silence output to stdout'
  },
  log: {
    alias: 'l',
    describe: 'define output directory for channel logs'
  },
  channels: {
    alias: 'c',
    describe: 'comma separated list of channels to follow. overrides STDIN'
  }
}, base_options)

const read_options = Object.assign({
      time: {
        alias: "t",
        description: "get all messages within a time period, given in minutes"
      },
      number: {
        alias: "n",
        description: "get this many messages"
      },
      'channel': {
        alias: 'c',
        describe: 'name of the channel you wish to read or write to'
      }
    }, base_options);

const write_options = {
      'channel': {
        alias: 'c',
        describe: 'name of the channel you wish to read or write to'
      },
      message: {
        alias: "m",
        describe: 'message you would like to send'
      },
      username: {
        alias: "u",
        describe: 'username you would like to send as'
      },
      emoji: {
        alias: "e",
        describe: 'text representation of the emoji you would like to represent you'
      },
      icon: {
        alias: "i",
        describe: 'location of an image you would like to represent you'
      }
    }

    function output(log_message, stream=process.stdout){
      return function(message){
        stream.write(`${log_message(message)}\n`);
      }
    }

    function save_and_output(log_message, argv, follow){
      if(argv.log){
        const buffers = follow.reduce((buffers, channel) => {
          const filename = `${argv.prefix}/${channel}.log`;
          let buffer = {};
          buffer[channel] = fs.createWriteStream(filename);
          return Object.assign({}, buffers, buffer);
        }, {})
      }
      return function(message, channel){
        if(!argv.quiet) output(message => `${channel.name} ${log_message(message)}`)(message)
        if(argv.log)    output(log_message, buffers[channel.name])(message)
      }
    }

yargs
  .usage('$0 <cmd> [args]')
  .command('read', 'Read recent messages from a channel', 
    read_options, 
    function(argv){
      let slack_info = {
        token: argv.slackToken || process.env.SLACK_TOKEN,
      }
      const constraints = {
        count: argv.number,
        oldest: argv.time
      }


      if(!argv.channel){
        process.stdin.resume();
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', (chunk) => {
            if (chunk !== null) {
              Slack.read(slack_info, chunk.trim(), constraints, output(display.log_message))
                 .catch(e => process.stderr.write(`${e}\n`))
            }
        });

        process.stdin.on('end', () => {
          //process.stdout.write('end');
        });
      }else{
        Slack.read(slack_info, argv.channel, constraints, output(display.log_message))
                 .catch(e => process.stderr.write(`${JSON.stringify(e)}\n`))
      }

    }
  )
  .command('write', 'write a message to a slack channel', 
    write_options,
    function(argv){
      let slack_info = {
        token: argv.slackToken || process.env.SLACK_TOKEN,
        as_user: 1
      }
      if(argv.username) Object.assign(slack_info, {username: argv.username, as_user: 0});
      if(argv.icon)     Object.assign(slack_info, {icon_url: argv.icon, as_user: 0});
      if(argv.emoji)    Object.assign(slack_info, {icon_emoji: argv.emoji, as_user: 0});

      process.stdin.setEncoding('utf8');

      process.stdin.on('data', (chunk) => {
          let pauser = Promise.resolve(process.stdout.pause());
          if (chunk !== null) {
            pauser = Slack
               .write(slack_info, argv.channel, chunk.toString().trim())
               .then(channel => process.stdout.write(channel))
               .catch(e => process.stderr.write(`${JSON.stringify(e)}\n`))
          }
          pauser.then(process.stdout.resume)
      });
      process.stdin.on('error', (chunk) => {
        console.warn("error", chunk);
      })

      if(argv.message){
        Slack.write(slack_info, argv.channel, argv.message)
           .then(channel => process.stdout.write(channel))
           .catch(e => process.stderr.write(`${JSON.stringify(e)}\n`))
      }
    }
  )
  .command('follow', 'pipe channels defined in --slack-info to files', 
    Object.assign({}, read_options, follow_options),
    function(argv){
      let slack_info = { token: argv.slackToken || process.env.SLACK_TOKEN };

      if(!argv.channels){
        process.stdin.resume();
        process.stdin.setEncoding('utf8');
        process.stdin.on('readable', () => {
        })

        process.stdin.on('error', (chunk) => {
          console.log(chunk);
        })
        process.stdin.on('data', (chunk) => {
          if (chunk !== null) {
            try {
              slack_info.follow = JSON.parse(chunk.trim())
            }catch(e) {
              slack_info.follow = [chunk.trim()]
            }
            Slack.follow(slack_info, save_and_output(display.log_message, argv, slack_info.follow))
                 .catch(e => console.warn(e))
          }
        });
      }
      if(argv.channels){
        slack_info.follow = argv.channels.split(",").map(channel => channel.trim())
        Slack.follow(slack_info, save_and_output(display.log_message, argv, slack_info.follow))
                 .catch(e => console.warn(e))
      }
    }
  )
  .help('help')
  .alias('h', 'help')
  .version(_ => `slack-line version ${project_info.version}`)
  .alias('v', 'version')
  .argv
