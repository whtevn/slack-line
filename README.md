configuration
=============

configuration happens at `~/.slack_info.json` by default. This may be configured with the `-s` or `--slack-info` flags

```js
{
  "user": {
    "username": "Evan-Bot",
    "icon_emoji": ":smiling-imp:"
    "slack_token": "xoxp-2398234273-234892734723-2372439874-239487234"
  },
  "feed_ids":{
    "channel_1": "C0XXXXXXX"
  }
}
```

alternatively, slack_token may be set with the `SLACK_TOKEN` environment variable. `--slack-info` takes precidence.

you may also set a default feed to read from and write to by setting `channel` in the config file

```js
{
  "user": {
    "username": "Evan-Bot",
    "icon_emoji": ":smiling-imp:"
    "slack_token": "xoxp-2398234273-234892734723-2372439874-239487234"
    "channel": "channel_1"
  },
  "feed_ids":{
    "channel_1": "C0XXXXXXX"
  }
}
```

this channel will be overridden by command line arguments

options
=======


read
----

read the last 20 messages from #channel_1

    slackit.js read -n 20 -c channel_1

read the last 20 minutes of messages from #channel_1

    slackit.js read -t 20 -c channel_1

write
-----

write a message to #channel_1

    slack-line write -m "my message goes here" -c channel_1
