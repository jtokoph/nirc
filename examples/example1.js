var nirc = require('../lib/nirc'),
    client = new nirc.Client('irc.freenode.net', 6667, 'nircex1', 'nIrc Example');

client.connect(function() {
    var chan = client.join('#nirctest', null, function(msg){
        // this function runs once on join
        
        this.send('Hello.');
        
        // any join events after the first will be other people
        chan.on('JOIN', function(msg) {
            chan.send('Welcome to ' + chan.name + ', ' + msg.nick);
        });
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