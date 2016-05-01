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

const follow_options = {
  prefix: {
    alias: 'p',
    default: DEFAULT_HISTORY,
    describe: 'define the directory followed channels will write to'
  },
  quiet: {
    alias: 'q',
    describe: 'silence output to stdout'
  },
  zen: {
    alias: 'z',
    describe: 'do not write history to files (live in the moment)'
  }
}
const read_options = {
      'slack-info': {
        alias: 's',
        default: DEFAULT_HOME,
        describe: 'location of slack info file'
      },
      time: {
        alias: "t",
        description: "get all messages since this time"
      },
      number: {
        alias: "n",
        description: "get this many messages"
      },
      'channel': {
        alias: 'c',
        describe: 'name of the channel you wish to read or write to'
      }
    };

const write_options = {
      'slack-info': {
        alias: 's',
        default: DEFAULT_HOME,
        describe: 'location of slack info file'
      },
      'channel': {
        alias: 'c',
        describe: 'name of the channel you wish to read or write to'
      },
      message: {
        alias: "m",
        demand: true
      }
    }

    function output(log_message, stream=process.stdout){
      return function(message){
        stream.write(`${log_message(message)}\n`);
      }
    }

    function save_and_output(log_message, argv, follow){
      const buffers = follow.reduce((buffers, channel) => {
        const filename = `${argv.prefix}/${channel}.log`;
        let buffer = {};
        buffer[channel] = fs.createWriteStream(filename);
        return Object.assign({}, buffers, buffer);
      }, {})
      return function(message, channel){
        if(!argv.quiet) output(message => `${channel.name} ${log_message(message)}`)(message)
        if(!argv.zen)   output(log_message, buffers[channel.name])(message)
      }
    }

yargs
  .usage('$0 <cmd> [args]')
  .command('read', 'Read recent messages from a channel', 
    read_options, 
    function(argv){
      const slack_info = retrieve_config(argv.slackInfo)
      const constraints = {
        count: argv.number,
        oldest: argv.time
      }
      Slack.read(slack_info, argv.channel, constraints, output(display.log_message))
          .catch(e => console.log(e.stack))
    }
  )
  .command('write', 'write a message to a slack channel', 
    write_options,
    function(argv){
      const slack_info = retrieve_config(argv.slackInfo)
      Slack.write(slack_info, argv.channel, argv.message)
           .then(channel => console.log(`message written to #${channel}`))
           .catch(e => console.log(e.stack))
    }
  )
  .command('follow', 'pipe channels defined in --slack-info to files', 
    Object.assign({}, read_options, follow_options),
    function(argv){
      const slack_info = retrieve_config(argv.slackInfo)
      Slack.follow(slack_info, save_and_output(display.log_message, argv, slack_info.follow))
           .catch(e => console.log(e.stack))
    }
  )
  .help('help')
  .alias('h', 'help')
  .version(_ => `slack-line version ${project_info.version}`)
  .alias('v', 'version')
  .argv
