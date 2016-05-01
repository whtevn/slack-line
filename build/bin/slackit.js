#!/usr/bin/env node
'use strict';

var _package = require('../package.json');

var _package2 = _interopRequireDefault(_package);

var _index = require('../index');

var Slack = _interopRequireWildcard(_index);

var _display = require('../lib/display');

var display = _interopRequireWildcard(_display);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var fs = require('fs');

var mkdirp = require('mkdirp');
var yargs = require('yargs');
var dateFormat = require('dateformat');
var colors = require('colors');

// Slack.start(slack_info)
// Slack.read(slack_info, channel_name, constraints={}, log_function){
// Slack.write(slack_info, channel_name, text){
// Slack.follow(slack_info, log_function){

var HOME = process.env.HOME || process.env.USERPROFILE;
var DEFAULT_HOME = HOME + '/.slack_info.json';
var DEFAULT_HISTORY = HOME + '/.slack';

function retrieve_config(loc) {
  var slack_info = void 0;
  try {
    slack_info = require(loc);
  } catch (e) {
    console.log('slack info file not found in ' + loc);
    slack_info = { user: {} };
  }
  var token = slack_info.user && slack_info.user.slack_token || slack_info.token || process.env.SLACK_TOKEN;
  slack_info.user = Object.assign(slack_info.user || { as_user: 1 }, { token: token });
  if (slack_info.user.channel) throw new Error((loc + ' no longer uses user.channel. use "default-channel" on the main object instead.').yellow + "\nSee https://www.npmjs.com/package/slack-line for more information".cyan);
  return slack_info;
}

var follow_options = {
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
};
var read_options = {
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

var write_options = {
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
};

function output(log_message) {
  var stream = arguments.length <= 1 || arguments[1] === undefined ? process.stdout : arguments[1];

  return function (message) {
    stream.write(log_message(message) + '\n');
  };
}

function save_and_output(log_message, argv, follow) {
  var buffers = follow.reduce(function (buffers, channel) {
    var filename = argv.prefix + '/' + channel + '.log';
    var buffer = {};
    buffer[channel] = fs.createWriteStream(filename);
    return Object.assign({}, buffers, buffer);
  }, {});
  return function (message, channel) {
    if (!argv.quiet) output(function (message) {
      return channel.name + ' ' + log_message(message);
    })(message);
    if (!argv.zen) output(log_message, buffers[channel.name])(message);
  };
}

yargs.usage('$0 <cmd> [args]').command('read', 'Read recent messages from a channel', read_options, function (argv) {
  var slack_info = retrieve_config(argv.slackInfo);
  var constraints = {
    count: argv.number,
    oldest: argv.time
  };
  Slack.read(slack_info, argv.channel, constraints, output(display.log_message)).catch(function (e) {
    return console.log(e.stack);
  });
}).command('write', 'write a message to a slack channel', write_options, function (argv) {
  var slack_info = retrieve_config(argv.slackInfo);
  Slack.write(slack_info, argv.channel, argv.message).then(function (channel) {
    return console.log('message written to #' + channel);
  }).catch(function (e) {
    return console.log(e.stack);
  });
}).command('follow', 'pipe channels defined in --slack-info to files', Object.assign({}, read_options, follow_options), function (argv) {
  var slack_info = retrieve_config(argv.slackInfo);
  Slack.follow(slack_info, save_and_output(display.log_message, argv, slack_info.follow)).catch(function (e) {
    return console.log(e.stack);
  });
}).help('help').alias('h', 'help').version(function (_) {
  return 'slack-line version ' + _package2.default.version;
}).alias('v', 'version').argv;