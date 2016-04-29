'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.slack_request = slack_request;
exports.slack_post = slack_post;

var _axios = require('axios');

var _axios2 = _interopRequireDefault(_axios);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function slack_base_url(method) {
  for (var _len = arguments.length, qstring = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    qstring[_key - 1] = arguments[_key];
  }

  return 'https://slack.com/api/' + method + '?' + queryify.apply(undefined, qstring);
}

function objects_as_qstrings(obj) {
  if (!obj) return [];
  var qstring = Object.keys(obj).map(function (key) {
    return key + '=' + obj[key];
  });

  for (var _len2 = arguments.length, remaining = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
    remaining[_key2 - 1] = arguments[_key2];
  }

  return [].concat(_toConsumableArray(qstring), _toConsumableArray(objects_as_qstrings.apply(undefined, remaining)));
}

function queryify() {
  for (var _len3 = arguments.length, objs = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
    objs[_key3] = arguments[_key3];
  }

  return objects_as_qstrings(Object.assign.apply(Object, [{}].concat(objs))).join("&");
}

function slack_request(method) {
  for (var _len4 = arguments.length, query = Array(_len4 > 1 ? _len4 - 1 : 0), _key4 = 1; _key4 < _len4; _key4++) {
    query[_key4 - 1] = arguments[_key4];
  }

  return (0, _axios2.default)(slack_base_url.apply(undefined, [method].concat(query)));
}

function slack_post(method) {
  for (var _len5 = arguments.length, query = Array(_len5 > 1 ? _len5 - 1 : 0), _key5 = 1; _key5 < _len5; _key5++) {
    query[_key5 - 1] = arguments[_key5];
  }

  return (0, _axios2.default)({
    method: 'post',
    url: slack_base_url.apply(undefined, [method].concat(query))
  });
}