var util = require('util'),
    events = require('events'),
    net = require('net'),
    Channel = require('./channel');
    
    // Client constructor
function Client (host, port, nick, name, password) {
    var that = this;
    
    // Default connection settings
    this.host = host || 'localhost';
    this.port = port || 6667;
    this.nick = nick || 'nircbot';
    this.name = name || 'nIRC Bot';
    this.password = password || undefined;
    
    // Joined channel list
    this.channels = {};
    
    this.motd = '';
    
    // Create socket for this Client
    this.socket = new net.Socket();
    this.socket.setEncoding('utf8');
    
    this.connected = false;
    
    // Create message buffer
    this.buffer = '';
    
    // Handle when we connect to send nick
    this.socket.on('connect', function() {
        if (that.password) {
            that.raw('PASS ' + that.password);
        }
        that.raw('NICK ' + that.nick);
        that.raw('USER ' + (process.env.USER || that.nick) + ' 8 * :' + that.name);
    });
    
    
    // Parse data into messages
    this.socket.on('data', function(data) {
        // append to buffer
        that.buffer = that.buffer + data;
        
        // split out \r\n messages
        var msgs = that.buffer.split('\r\n');
        
        // move partial messages back into buffer
        that.buffer = msgs.pop();
        
        // trigger rawmessage event for each message
        for (var i = 0, l = msgs.length; i < l; i++) {
            that._processRawMessage(msgs[i]);
        }
    });
    
    this.socket.on('close', function(error) {
        that.emit('close', error);
    });
    
    this.on('001', function(msg) {
        that.connected = true;
        // set nick to nick from server
        // in case it changed it
        that.nick = msg.params[0];
        that.emit('connect');
    });
    
    // Handle PING
    this.on('PING', function (msg) {
        that.raw('PONG :' + msg.trailing);
    });
    
    // MOTD
    this.on('375', function() {
        var raw372 = function(msg) {
            that.motd = that.motd + msg.trailing.substr(2) + '\n';
        };
        // get all lines of motd
        that.on('372', raw372);
        
        // stop listening for info after 376
        that.on('376', function() {
            that.removeListener('372', raw372);
            that.emit('motd', that.motd);
        });
    });
    
    // names
    this.on('353', this.emitOnParam2);
    // end of names
    this.on('366', this.emitOnParam1);
    
    // channel modes
    this.on('324', this.emitOnParam1);
    
    // channel created
    this.on('329', this.emitOnParam1);
    
    // channel topic
    this.on('332', this.emitOnParam1);
    // channel topic
    this.on('333', this.emitOnParam1);
    
    // send channel messages
    this.on('PRIVMSG', function (msg) {
        if (this.channels[msg.params[0]]) {
            this.channels[msg.params[0]].emit(msg.command, msg);
        } else {
            this.emit('whisper', msg);
        }
    });
    
    // send channel modes
    this.on('MODE', this.emitOnParam0);
    
    // pass on joins
    this.on('JOIN', this.emitOnTrailing);
    
    // nick already in use
    this.on('433', function(msg) {
        this.longNickCounter = this.longNickCounter || 1;
        this.raw('NICK ' + this.nick + this.longNickCounter);
        this.raw('USER ' + (process.env.USER || this.nick) + ' 8 * :' + this.name);
    });
    
    // tell all channels about a nick change
    this.on('NICK', function(msg) {
        for (var chan in this.channels) {
            if (this.channels[chan].users[msg.nick]) {
                this.channels[chan].emit(msg.command, msg);
            }
        }
    });
    
    // handle channel parts
    this.on('PART', this.emitOnParam0);
    
    // handle server quits
    this.on('QUIT', function(msg) {
        for (var chan in this.channels) {
            if (this.channels[chan].users[msg.nick]) {
                this.channels[chan].emit(msg.command, msg);
            }
        }
    });
};

util.inherits(Client, events.EventEmitter);

Client.prototype.connected = false;

Client.prototype.connect = function(callback) {
    callback && this.once('connect', callback);
    this.socket.connect(this.port, this.host);
};

Client.prototype.raw = function() {
    var msg = [].splice.call(arguments,0).join(' ');
    // ensure separator
    if (!(/\r\n$/).test(msg)) {
        msg += '\r\n';
    }
    
    this.socket.write(msg);
};

Client.prototype._processRawMessage = function (msg) {
    var parsed = this.parseRaw(msg);
    this.emit('parsed', parsed);
    this.emit('rawmessage', msg);
    this.emit(parsed.command, parsed);
};

// returns channel object
Client.prototype.channel = function (channel, password) {
    // if we already have this channel, return it
    channel = channel.toLowerCase();
    if(this.channels[channel]) {
        return this.channels[channel];
    }
    
    this.channels[channel] = new Channel(this, channel, password);
    return this.channels[channel];
    
};

// helper for joining
Client.prototype.join = function(channel, password, callback) {
    var chan = this.channel(channel, password);
    return chan.join(callback);
};

Client.prototype.quit = function (quitMsg) {
    this.raw('QUIT :' + (quitMsg || 'Bye!'));
};

/* 
 * Parse function stolen from https://github.com/martynsmith/node-irc/blob/master/lib/irc.js
 */
Client.prototype.parseRaw = function (line) {
    var message = {};
    var match;

    message.raw = line;
    
    // Parse prefix
    if ( (match = line.match(/^:([^ ]+) +/)) != null ) {
        message.prefix = match[1];
        line = line.replace(/^:[^ ]+ +/, '');
        if ( (match = message.prefix.match(/^([_a-zA-Z0-9\[\]\\`^{}|-]*)(!([^@]+)@(.*))?$/)) != null ) {
            message.nick = match[1];
            message.user = match[3];
            message.host = match[4];
        }
        else {
            message.server = message.prefix;
        }
    }

    // Parse command
    match = line.match(/^([^ ]+) +/);
    message.command = match[1];
    
    line = line.replace(/^[^ ]+ +/, '');

    message.params = [];
    var middle, trailing;

    // Parse parameters
    if ( line.indexOf(':') != -1 ) {
        var index = line.indexOf(':');
        middle = line.substr(0, index).replace(/ +$/, "");
        trailing = line.substr(index+1);
    }
    else {
        middle = line;
    }

    if ( middle.length )
        message.params = middle.split(/ +/);

    if ( typeof(trailing) != 'undefined' && trailing.length ) {
        message.trailing = trailing;
    }
        

    return message;
};


// helpers for emiting on channels
Client.prototype.emitOnParam0 =  function (msg) {
    this.emitOnParam(msg, 0);
};

Client.prototype.emitOnParam1 =  function (msg) {
    this.emitOnParam(msg, 1);
};

Client.prototype.emitOnParam2 =  function (msg) {
    this.emitOnParam(msg, 2);
};

Client.prototype.emitOnParam3 =  function (msg) {
    this.emitOnParam(msg, 3);
};

Client.prototype.emitOnParam =  function (msg, param) {
    this.emitOnChannel(msg, msg.params[param]);
};

Client.prototype.emitOnTrailing =  function (msg) {
    this.emitOnChannel(msg, msg.trailing);
};

Client.prototype.emitOnChannel =  function (msg, channel) {
    this.channels[channel] && this.channels[channel].emit(msg.command, msg);
};

module.exports = Client;