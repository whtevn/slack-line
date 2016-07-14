'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.log_message = log_message;
var dateFormat = require('dateformat');
var date_of = function date_of(entry) {
  return dateFormat(entry, "h:MMt");
};

var display_attachments = function display_attachments(attachments) {
  return attachments && attachments.map(function (a) {
    return a.text;
  }) || '';
};

function log_message(message, environment) {
  var date = message.date;
  var name = message.username;
  var text = message.text;
  var attachments = message.attachments;
  return date_of(date).yellow + '\t' + name.cyan + '\t' + text + display_attachments(attachments);
}