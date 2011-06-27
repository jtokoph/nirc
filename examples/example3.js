var nirc = require('../lib/nirc'),
    client = new nirc.Client('irc.freenode.net', 6667, 'nircex3', 'nIrc Example');

client.connect();

client.on('INVITE', function (invite_msg) {
    var chan = client.join(invite_msg.trailing, null, function(msg){
        this.send('Thanks for the invite ' + invite_msg.nick);
    });
});

client.on('whisper', function(msg) {
    client.raw('PRIVMSG ' + msg.nick + ' :hi');
});


process.on('SIGINT', function() {
    if (client.connected) {
        client.quit('Interrupted.');
    }
    process.exit(0);
});

client.on('parsed', function(msg) {
    console.log(msg);
});