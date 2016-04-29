installation
============
  
    npm install slack-line -g

configuration
=============

configuration happens at `~/.slack_info.json` by default. This may be configured with the `-s` or `--slack-info` flags

all configuration, aside from setting your slack token, is completely optional. Your name will be used based on your token

```js
{
  "user": {
    "username": "Evan-Bot",
    "icon_emoji": ":smiling-imp:"
    "slack_token": "xoxp-2398234273-234892734723-2372439874-239487234"
  }
}
```

alternatively, slack_token may be set with the `SLACK_TOKEN` environment variable. `--slack-info` takes precidence, if the
token exists.

you may also set a default feed to read from and write to by setting `channel` in the config file

```js
{
  "user": {
    "username": "Evan-Bot",
    "icon_emoji": ":smiling-imp:"
    "slack_token": "xoxp-2398234273-234892734723-2372439874-239487234"
    "channel": "channel_1"
  }
}
```

this channel will be overridden by command line arguments

you may also follow channels by writing their events into a file. in order to do this, you must define the channels you wish to follow

a file will be created for each room you follow. files are started fresh each time 
the follow command is started

```js
{
  "user": {
    "username": "Evan-Bot",
    "icon_emoji": ":smiling-imp:"
    "slack_token": "xoxp-2398234273-234892734723-2372439874-239487234"
    "channel": "channel_1"
  },
  "follow":[
    "channel_1",
    "channel_2"
  ]
}
```

finally, you may define the directory which these follow files will be saved. by default, they are saved in `~/.slack`. the history directory will be created if it doesn't already exist

```js
{
  "user": {
    "username": "Evan-Bot",
    "icon_emoji": ":smiling-imp:"
    "slack_token": "xoxp-2398234273-234892734723-2372439874-239487234"
    "channel": "channel_1"
  },
  "follow":[
    "channel_1",
    "channel_2"
  ],
  "history": "~/.slack"
}
```

options
=======

use the -h or --help flags to find out more about slack-line 

-h and --help are also available on each subcommand

read
----

read the last 20 messages from #channel_1

    slackit.js read -n 20 -c channel_1

read the last 20 minutes of messages from #channel_1

    slackit.js read -t 20 -c channel_1

write
-----

write a message to #channel_1

    slackit.js write -m "my message goes here" -c channel_1

follow
------

follow a set of channels by piping their output into text files to tail, grep, or otherwise watch 

channels are defined in `.slack_info.json`

