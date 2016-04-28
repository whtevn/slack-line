#!/usr/bin/env node

var dateFormat = require('dateformat');
var colors = require('colors');
var project_info   = require('../package.json');
import * as Slack from '../index.js';

const HOME = _ => process.env.HOME || process.env.USERPROFILE;
const default_home = `${HOME()}/.slack_info.json`;

const date_of = entry => {
  const entry_date = new Date(entry.ts.split('.')[0]*1000)
  return dateFormat(entry_date, "h:MMt");
}

function slack_info(loc){
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

const read_options = {
      'slack-info': {
        alias: 's',
        default: default_home,
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
        default: default_home,
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

const display_attachments = attachments=>(attachments&&attachments.map((a)=>a.text)||'')

function read_from_slack(argv) {
  const info = slack_info(argv.slackInfo)
  const channel = argv.channel||info.user.channel;
  
  return Slack.read(info.feed_ids[channel],
                    {time: argv.time, count: argv.number},
                    info.user)
              .then(history => history.map(entry => `${date_of(entry).yellow}\t${entry.username.cyan}\t${entry.text}${display_attachments(entry.attachments)}`))
              .then(history => history.reverse())
              .then(history => history.join("\n"))
              .then(history => console.log(history))
              .catch(e => {
                console.log(e.stack)
                process.exit(1)
              })
}

function write_to_slack(argv){
      const info = slack_info(argv.slackInfo);
      const channel = argv.channel||info.user.channel;
      return Slack.write(channel, argv.message, info.user)
                  .then(_ => console.log(`message sent to #${channel}`))
                  .catch(e => {
                    console.log(e.stack)
                    process.exit(1)
                  })
    }

const yargs = require('yargs')

yargs
  .usage('$0 <cmd> [args]')
  .command('read', 'Read recent messages from a channel', 
    read_options, 
    read_from_slack
  )
  .command('write', 'write a message to a slack channel', 
    write_options,
    write_to_slack 
  )
  /*.command('repl', 'interactive command line interface', function(argv){
    var inquirer = require('inquirer');
    const repl = function(){
      const new_yarg = yargs
                        .reset()
                        .resetOptions()
                        .help()
                        .command(
                          'read',
                          'Read recent messages from a channel', 
                          read_options, 
                          read_from_slack
                        )
                        .command('write', 'write a message to a slack channel', 
                          write_options,
                          write_to_slack 
                        )
      return inquirer.prompt([
                {
                  type: 'input',
                  name: 'command',
                  message: '>'
                }
              ])
              .then((answers) => {
                new_yarg
                  .parse(answers.command)
                  .argv
              })
              .then(repl)
              .catch(e => console.log(e))
    }
    repl();
  })*/
  .help('help')
  .alias('h', 'help')
  .version(_ => `slack-line version ${project_info.version}`)
  .alias('v', 'version')
  .argv
 
