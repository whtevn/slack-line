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
  const token = slack_info.user.slack_token  || process.env.SLACK_TOKEN
  slack_info.user = Object.assign(slack_info.user, {token}); 
  return slack_info
}

const follow_options = {
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

    function output(fn, argv){
      return function(message, environment){
        console.log(fn(message, environment));
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
      Slack.write(slack_info, channel_name, text)
      .catch(e => console.log(e.stack))
    }
  )
  .command('follow', 'pipe channels defined in --slack-info to files', 
    Object.assign({}, read_options, follow_options),
    function(argv){
      Slack.follow(slack_info, output(display.log_message, argv))
      .catch(e => console.log(e.stack))
    }
  )
  .help('help')
  .alias('h', 'help')
  .version(_ => `slack-line version ${project_info.version}`)
  .alias('v', 'version')
  .argv
 
