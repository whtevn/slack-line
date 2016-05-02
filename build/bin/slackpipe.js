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

var base_options = {
  "slack-token": {
    alias: 's',
    describe: 'optionally define your slack token. The SLACK_TOKEN environment variable is recommended.'
  }
};

var follow_options = Object.assign({}, {
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
}, base_options);

var read_options = Object.assign({
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

var write_options = {
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
};

function output(log_message) {
  var stream = arguments.length <= 1 || arguments[1] === undefined ? process.stdout : arguments[1];

  return function (message) {
    stream.write(log_message(message) + '\n');
  };
}

function save_and_output(log_message, argv, follow) {
  if (argv.log) {
    var _buffers = follow.reduce(function (buffers, channel) {
      var filename = argv.prefix + '/' + channel + '.log';
      var buffer = {};
      buffer[channel] = fs.createWriteStream(filename);
      return Object.assign({}, buffers, buffer);
    }, {});
  }
  return function (message, channel) {
    if (!argv.quiet) output(function (message) {
      return channel.name + ' ' + log_message(message);
    })(message);
    if (argv.log) output(log_message, buffers[channel.name])(message);
  };
}

yargs.usage('$0 <cmd> [args]').command('read', 'Read recent messages from a channel', read_options, function (argv) {
  var slack_info = {
    token: argv.slackToken || process.env.SLACK_TOKEN
  };
  var constraints = {
    count: argv.number,
    oldest: argv.time
  };

  if (!argv.channel) {
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', function (chunk) {
      if (chunk !== null) {
        Slack.read(slack_info, chunk.trim(), constraints, output(display.log_message)).catch(function (e) {
          return process.stderr.write(e + '\n');
        });
      }
    });

    process.stdin.on('end', function () {
      //process.stdout.write('end');
    });
  } else {
      Slack.read(slack_info, argv.channel, constraints, output(display.log_message)).catch(function (e) {
        return process.stderr.write(JSON.stringify(e) + '\n');
      });
    }
}).command('write', 'write a message to a slack channel', write_options, function (argv) {
  var slack_info = {
    token: argv.slackToken || process.env.SLACK_TOKEN,
    as_user: 1
  };
  if (argv.username) Object.assign(slack_info, { username: argv.username, as_user: 0 });
  if (argv.icon) Object.assign(slack_info, { icon_url: argv.icon, as_user: 0 });
  if (argv.emoji) Object.assign(slack_info, { icon_emoji: argv.emoji, as_user: 0 });

  process.stdin.setEncoding('utf8');

  process.stdin.on('data', function (chunk) {
    var pauser = Promise.resolve(process.stdout.pause());
    if (chunk !== null) {
      pauser = Slack.write(slack_info, argv.channel, chunk.toString().trim()).then(function (channel) {
        return process.stdout.write(channel);
      }).catch(function (e) {
        return process.stderr.write(JSON.stringify(e) + '\n');
      });
    }
    pauser.then(process.stdout.resume);
  });
  process.stdin.on('error', function (chunk) {
    console.warn("error", chunk);
  });

  if (argv.message) {
    Slack.write(slack_info, argv.channel, argv.message).then(function (channel) {
      return process.stdout.write(channel);
    }).catch(function (e) {
      return process.stderr.write(JSON.stringify(e) + '\n');
    });
  }
}).command('follow', 'pipe channels defined in --slack-info to files', Object.assign({}, read_options, follow_options), function (argv) {
  var slack_info = { token: argv.slackToken || process.env.SLACK_TOKEN };

  if (!argv.channels) {
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.on('readable', function () {});

    process.stdin.on('error', function (chunk) {
      console.log(chunk);
    });
    process.stdin.on('data', function (chunk) {
      if (chunk !== null) {
        try {
          slack_info.follow = JSON.parse(chunk.trim());
        } catch (e) {
          slack_info.follow = [chunk.trim()];
        }
        Slack.follow(slack_info, save_and_output(display.log_message, argv, slack_info.follow)).catch(function (e) {
          return console.warn(e);
        });
      }
    });
  }
  if (argv.channels) {
    slack_info.follow = argv.channels.split(",").map(function (channel) {
      return channel.trim();
    });
    Slack.follow(slack_info, save_and_output(display.log_message, argv, slack_info.follow)).catch(function (e) {
      return console.warn(e);
    });
  }
}).help('help').alias('h', 'help').version(function (_) {
  return 'slack-line version ' + _package2.default.version;
}).alias('v', 'version').argv;