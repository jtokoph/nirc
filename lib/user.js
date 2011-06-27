var xMode = {
        '@': 'o',
        '+': 'v'
    };

function User (nick, modes) {
    this.nick = nick;
    this.modes = [];
    modes = modes || [];
    if (modes instanceof Array) {
        this.addModes(modes);
    } else {
        this.addMode(modes);
    }
};

User.prototype.addMode = function(mode) {
    if (mode == '') {
        return;
    }

    mode = xMode[mode] || mode;

    if (this.modes.indexOf(mode) == -1) {
        this.modes.push(mode);
    }
};

User.prototype.addModes = function(modes) {
    var that = this;
    modes.forEach(function(mode) {
        this.addMode(mode);
    });
};

User.prototype.removeMode = function(mode) {
    mode = xMode[mode] || mode;
    delete this.modes[this.modes.indexOf(mode)];
};

User.prototype.removeModes = function(modes) {
    var that = this;
    modes.forEach(function(mode) {
        that.removeMode(mode);
    });
};

User.prototype.hasMode = function(mode) {
    mode = xMode[mode] || mode;
    return (this.modes.indexOf(mode) > -1);
};

module.exports = User;