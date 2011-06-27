var util = require('util'),
    events = require('events');
    User = require('./user');
    
// Channel constructor
function Channel (client, channel, password) {
    var that = this;
    
    this.client = client;
    this.name = channel;
    this.password = password;
    
    this.mode = [];
    
    this.users = {};
    
    this.topic = null;
    this.topicSet = null;
    this.topicSetBy = null;
    
    this.joined = false;
    
    // handle join response
    this.on('JOIN', function(msg) {
        this.joined = true;
        this.users[msg.nick] = new User(msg.nick);
    });
    
    // get NAMES list
    this.on('353', function(msg) {
        var users = msg.trailing.split(' ');
        users.forEach(function (user) {
            var parsed = user.match(/^([@+%~\&])?(.*)$/);
            parsed[1] = parsed[1] || [];
            that.users[parsed[2]] = new User(parsed[2], parsed[1]);
        });
    });
    
    // handle nick changes
    this.on('NICK', function(msg) {
        if (typeof(this.users[msg.nick]) != 'undefined') {
            this.users[msg.trailing] = this.users[msg.nick];
            this.users[msg.trailing].nick = msg.trailing;
            delete this.users[msg.nick];
        }
    });
    
    // handle channel parts
    this.on('PART', function(msg) {
        console.log(this.users);
        if (typeof(this.users[msg.nick]) != 'undefined') {
            delete this.users[msg.nick];
        }
        console.log(this.users);
    });
    
    // handle quits
    this.on('QUIT', function(msg) {
        console.log(this.users);
        if (typeof(this.users[msg.nick]) != 'undefined') {
            delete this.users[msg.nick];
        }
        console.log(this.users);
    });
    
    // handle channel mode changes
    this.on('MODE', function(msg) {
        if (msg.params.length >= 3) {
            // User mode changes
            this.updateUserModes(msg.params[1], msg.params.slice(2));
        } else if (msg.params.length == 2) {
            // channel mode changes
            this.updateChannelMode(msg.params[1]);
        }
    });
    
    this.on('names', function() {
        this.client.raw('MODE ' + this.name);
    });
    
    // channel modes
    this.on('324', function(msg) {
        this.updateChannelMode(msg.params[2]);
    });
    
    // channel created time
    this.on('329', function(msg) {
        this.created = msg.params[2];
    });
    
    // channel topic
    this.on('332', function (msg) {
        this.topic = msg.trailing;
    });
    this.on('333', function (msg) {
        this.topicSet = msg.params[3];
        this.topicSetBy = msg.params[2];
    });
};

util.inherits(Channel, events.EventEmitter);

Channel.prototype.join = function(callback) {
    callback && this.once('JOIN', callback);
    
    this.client.raw('JOIN ' + this.name + (this.password ? ' ' + this.password : ''));
    
    return this;
};

Channel.prototype.send = function(msg) {
    this.client.raw('PRIVMSG ' + this.name + ' :' + (msg||''));
};

Channel.prototype.part = function (msg) {
    this.client.raw('PART', this.name, ':' + (msg||''))
}

Channel.prototype.updateUserModes = function(modeStr, nicks) {
    var that = this,
        change = '',
        curNick = 0;
    
    modeStr.split('').forEach(function(c) {
        if (c == '+' || c == '-') {
            change = c;
        } else {
            if (change == '+') {
                that.users[nicks[curNick]].addMode(c);
            } else {
                that.users[nicks[curNick]].removeMode(c);
            }
            
            // emit the change
            that.emit('usermodechange', nicks[curNick], change, c);
            
            curNick++;
        }
    });
};

Channel.prototype.updateChannelMode = function(modeStr) {
    var that = this,
        change = '';
    modeStr.split('').forEach(function(c) {
        if (c == '+' || c == '-') {
            change = c;
        } else {
            if (change == '+') {
                (that.mode.indexOf(c) == -1) && that.mode.push(c);
            } else {
                delete that.mode[that.mode.indexOf(c)];
            }
        }
    });
};

module.exports = Channel;