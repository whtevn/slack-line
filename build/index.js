"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.start = start;
exports.read = read;
exports.write = write;

var _slack = require("./lib/slack");

var minutes_ago = function minutes_ago() {
  var t = arguments.length <= 0 || arguments[0] === undefined ? 20 : arguments[0];
  return new Date(new Date().getTime() - t * 60000).getTime() / 1000.0;
};

function start(slack_info) {
  return (0, _slack.slack_request)("rtm.start", slack_info).then(function (response) {
    return response.data;
  });
}

function read(channel) {
  var constraints = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];
  var slack_info = arguments[2];

  // read all messages since some given time
  if (channel) constraints.channel = channel;
  if (constraints.time) {
    constraints.oldest = minutes_ago(constraints.time);
    delete constraints.time;
  }
  return (0, _slack.slack_request)("channels.history", slack_info, constraints).then(function (result) {
    return result.data.messages;
  });
}

function write(channel, text) {
  for (var _len = arguments.length, info = Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
    info[_key - 2] = arguments[_key];
  }

  return _slack.slack_post.apply(undefined, ["chat.postMessage"].concat(info, [{ channel: channel, text: text }]));
}