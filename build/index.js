"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.read = read;
exports.write = write;

var _slack = require("./lib/slack");

var minutes_ago = function minutes_ago() {
  var t = arguments.length <= 0 || arguments[0] === undefined ? 20 : arguments[0];
  return new Date(new Date().getTime() - t * 60000).getTime() / 1000.0;
};

function read(channel) {
  var constraints = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];
  var slack_info = arguments[2];

  // read all messages since some given time
  if (channel) constraints.channel = channel;
  if (constraints.time) {
    constraints.oldest = minutes_ago(constraints.time);
    delete constraints.time;
  }
  return Promise.all([(0, _slack.slack_request)("users.list", slack_info), (0, _slack.slack_request)("channels.history", Object.assign(slack_info, constraints))]).then(function (result) {
    var users = result[0].data.members.reduce(function (p, c) {
      p[c.id] = c.name;
      return p;
    }, {});
    var history = result[1].data.messages.map(function (c) {
      c.username = users[c.user];
      return c;
    });
    return history;
  });
}

function write(channel, text, slack_info) {
  return (0, _slack.slack_post)("chat.postMessage", Object.assign(slack_info, { channel: channel, text: text }));
}