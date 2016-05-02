*slackpipe* - a command line interface for some simple interractions with slack.com 

Slack is an amazing communcation tool, and we use it extensively. However, because there are many rooms
that I must follow, I find myself spending more time than I would like clicking between them. I wanted
to be able to read all of my slack updates in a single stream. 

This is a work in progress. Feel free to contact through github with questions, concerns, or pull requests

installation
============
  
    npm install slackpipe -g

set up your token
------------------

Your token may be sent in a few ways, the easiest for long-term use is an environment variable

    export SLACK_TOKEN='xoxp-239847-xxxx-2398-xxxxx'

However, for the purposes of testing, all commands may be run with `-t` or `--token`. The command
line argument takes precident.

command line usage
=================

the following is a brief overview of the project. For more information, see

  slackpipe --help

for more information on advice for setting this project up for greatest effect, see the "recommended aliases" section below

follow many rooms
-----------------

the most useful feature of this project, in my opinion, is the ability to follow many rooms in a single buffer. 

    "[\"channel_1\", \"channel_2\"]" | slackpipe follow

or

    cat follow_rooms.json | slackpipe follow

you may also separate the rooms into their own streams, writing to log files within a defined directory

    cat follow_rooms.json | slackpipe follow --log ~/.slack/ --quiet

quiet is not required, but without it slackpipe will log to both the directory defined and stdout

write a message
---------------

    "my message" | slackpipe -c channel-name write

or

    slackpipe -c channel-name write -m "my message"

by default all messages will come from your user unless you indicate otherwise

    "my message" | slackpipe -c channel-name write

write also accepts `--username` and `--emoji` to customize your message's look

for more information see 

    slackpipe write --help

recommended aliases
====================

the nature of this project is that many tasks can be accomplished with the tools provided.
However, in many cases, some work will be required on the part of the user to make the 
project useful. Below are a few aliases and bash functions that will get you started

write and follow
-----------------

ask a question in a specific room, and follow that room for a response

    alias ask-mychannel='ask-slack new-test-channel'

    ask-slack(){
      local room=${1}
      local question=${2}
      echo $question | slackpipe.js write -c $room | slackpipe.js follow
    }

usage:

    ask-mychannel "who wants to go to lunch?"

or

    ask-slack channel_2 "does anyone know what went wrong with the demo?"


follow important rooms
----------------------

keeping a list of rooms to follow is easy, and allows watching for updates
in many places while watching one output

    alias follow-slack="cat ~/.my-slack-rooms.json | slackpipe.js follow"

where ~/.my-slack-rooms.json is an array of channel names

    [
      "channel_1",
      "channel_2"
    ] 


read recent history for a room
------------------------------

    sup(){
      local room=${1}
      room | slackpipe.js read -n 5 -t 120
    }

usage

    sup channel_1
