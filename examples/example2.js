var nirc = require('../lib/nirc'),
    client = new nirc.Client('irc.freenode.net', 6667, 'nircex2', 'nIrc Example');

client.connect(function() {
    var chan = client.join('#nirctest');
    
    chan.on('PRIVMSG', function(msg) {
        if(msg.trailing.indexOf('go away') === 0) {
            client.quit('Leaving because I was told to');
        }
        if(msg.trailing.indexOf('part dude') === 0) {
            chan.part('okbai');
        }
    });
    
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