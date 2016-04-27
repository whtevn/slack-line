'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.slack_post = exports.slack_request = undefined;

var _axios = require('axios');

var _axios2 = _interopRequireDefault(_axios);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var slack_base_url = function slack_base_url(method) {
  for (var _len = arguments.length, qstring = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    qstring[_key - 1] = arguments[_key];
  }

  return 'https://slack.com/api/' + method + '?' + queryify.apply(undefined, qstring);
};
var objects_as_qstrings = function objects_as_qstrings(obj) {
  for (var _len2 = arguments.length, remaining = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
    remaining[_key2 - 1] = arguments[_key2];
  }

  if (!obj) return [];
  var qstring = Object.keys(obj).map(function (key) {
    return key + '=' + obj[key];
  });
  return [].concat(_toConsumableArray(qstring), _toConsumableArray(objects_as_qstrings.apply(undefined, remaining)));
};
var queryify = function queryify() {
  return objects_as_qstrings.apply(undefined, arguments).join("&");
};

var slack_request = exports.slack_request = function slack_request(method) {
  for (var _len3 = arguments.length, query = Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
    query[_key3 - 1] = arguments[_key3];
  }

  return (0, _axios2.default)(slack_base_url.apply(undefined, [method].concat(query)));
};
var slack_post = exports.slack_post = function slack_post(method) {
  for (var _len4 = arguments.length, query = Array(_len4 > 1 ? _len4 - 1 : 0), _key4 = 1; _key4 < _len4; _key4++) {
    query[_key4 - 1] = arguments[_key4];
  }

  return (0, _axios2.default)({
    method: 'post',
    url: slack_base_url.apply(undefined, [method].concat(query))
  });
};