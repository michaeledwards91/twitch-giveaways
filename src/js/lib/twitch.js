var m = require('mithril');
var ucfirst = require('to-sentence-case');
var twitch = require('./twitch');
var query = require('query');
var emitter = require('emitter');

var currentChannel = {};
emitter(currentChannel);

var twitch = module.exports = {
	api: 'https://api.twitch.tv/kraken',
	clientID: 'h9v0ctx2gn0uchv227fq2q2daimfkol',
	timeout: 10000,
	request: function request(resource) {
		return m.request({
			method: 'GET',
			url: twitch.api + resource,
			background: true,
			config: function (xhr) {
				xhr.setRequestHeader('Client-ID', twitch.clientID);
				xhr.setRequestHeader('Accept', 'application/vnd.twitchtv.v3+json');
				setTimeout(xhr.abort.bind(xhr), twitch.timeout);
			}
		});
	},
	requestBadges: function badges(resource) {
		return m.request({
			method: 'GET',
			url: 'https://badges.twitch.tv/v1/badges' + resource + '/display',
			background: true,
			config: function (xhr) {
				xhr.setRequestHeader('Client-ID', twitch.clientID);
				xhr.setRequestHeader('Accept', 'application/vnd.twitchtv.v3+json');
				setTimeout(xhr.abort.bind(xhr), twitch.timeout);
			}
		});
	},
	toID: function (value) {
		return String(value).trim().replace(' ', '').toLowerCase();
	},
	following: function (username, channel) {
		channel = twitch.toID(channel);
		username = twitch.toID(username);
		return twitch.request('/users/' + username + '/follows/channels/' + channel);
	},
	profile: function (username) {
		username = twitch.toID(username);
		return twitch.request('/users/' + username);
	},
	channel: function (name) {
		return twitch.request('/channels/' + name);
	},
	stream: function (name) {
		return twitch.request('/streams/' + name).then(function (res) {
			return res.stream;
		});
	},
	pageType: function () {
		var path = window.location.pathname;
		if (path.match(/^\/([^\/]+)\/chat\/?$/i))
			return 'chat';
		if (query('.chat-room') && path.match(/^\/[^\/]+\/?$/i))
			return 'channel';
	}
};