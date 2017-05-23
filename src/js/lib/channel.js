var twitch = require('./twitch');
var emitter = require('emitter');

var match = window.location.search.match(/channel=([^&]+)(&|$)/);
var retries = 4;
var remainingRetries = retries;

var channel = module.exports = !match ? false : {
	name: match[1],
	load: function () {
		return twitch.request('/channels/' + channel.name)
			.then(setupChannel, retryLoad);
	},
	loadBadges: function () {
		if (!channel.id) {
			throw new Error('loadBadges: channel.id required');
		}
		return twitch.requestBadges('/channels/' + channel.id)
			.then(setupBadges, retryBadges);
	},
	channel: function () {
		return twitch.channel(channel.name);
	},
	stream: function () {
		return twitch.stream(channel.name);
	},
	hasFollower: function (username, callback) {
		twitch.following(username, match[1], callback);
	}
};

if (channel) {
	channel.load();
}

function setupChannel(obj) {
	Object.assign(channel, {
		displayName: obj.display_name,
		id: obj._id
	});
	channel.emit('load');
	channel.loadBadges();
}
function setupBadges(obj) {
	channel.badges = obj.badge_sets;
	channel.emit('load:badges');
}
function retryLoad() {
	if (remainingRetries > 0) {
		setTimeout(channel.load, retryDelay());
	}
	remainingRetries--;
}
function retryBadges() {
	if (remainingRetries > 0) {
		setTimeout(channel.loadBadges, retryDelay());
	}
	remainingRetries--;
}
function retryDelay() {
	return Math.max((retries - remainingRetries) * 1000, 100);
}

emitter(channel);
