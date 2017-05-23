var m = require('mithril');
var icon = require('../component/icon');
var Tooltips = require('tooltips');
var throttle = require('throttle');
var withKey = require('../lib/withkey');
var Components = require('../lib/components');
var Messages = require('../component/messages');
var Section = require('../lib/section');
var setters = require('../lib/setters');
var twitch = require('../lib/twitch');
var chat = require('../lib/chat');
var channel = require('../lib/channel');
var evt = require('event');
var extend = require('extend');

var app = module.exports = {};
app.controller = Controller;
app.view = view;
app.config = require('tga/data/config.json');
app.options = require('tga/data/options.json');

/**
 * Initiate an app on a container, and return the controller instance.
 *
 * @param  {Element} container
 * @return {Controller}
 */
app.init = function (container) {
	var instance = new Controller(container);
	m.module(container, {
		controller: function () {
			return instance;
		},
		view: view
	});
	return instance;
};

// models
var User = require('../model/user');
var Users = require('../model/users');
var Message = require('../model/message');
var Winners = require('../model/winners');

function Controller(container, config) {
	var self = this;
	window.app = this;
	this.twitch = twitch;
	this.channel = channel;
	this.chat = chat;
	this.container = container;
	this.setter = setters(this);

	// session data
	this.config = extend(true, app.config, config);
	var savedOptions = localStorage[this.config.storageName]
		? JSON.parse(localStorage[this.config.storageName])
		: {};
	this.options = extend(true, {}, app.options, savedOptions);
	this.version = require('tga/data/changelog.json')[0].version;
	this.isNewVersion = this.options.lastReadChangelog !== this.version;
	this.users = new Users();
	this.selectedUsers = new Users();
	this.winners = new Winners(channel.name, {onsync: m.redraw});
	this.rolling = {
		type: 'all',
		types: ['all', 'active', 'keyword'],
		activeTimeout: 20 * 1000 * 60,
		keyword: null,
		caseSensitive: true,
		subscriberLuck: 1,
		minBits: 0,
		subscribedTime: 0,
		groups: {
			staff: true,
			admin: true,
			mod: true,
			user: true
		}
	};
	this.winner = null;
	this.messages = new Messages();

	// load past winners
	this.winners.connect();

	// save config on change
	this.setter.on('options', function (options) {
		localStorage[self.config.storageName] = JSON.stringify(options);
	});

	// selected users abstraction
	this.updateSelectedUsers = function () {
		self.selectedUsers.reset();
		for (var i = 0, user; user = self.users[i], i < self.users.length; i++) {
			if (selectedFilter(user)) {
				self.selectedUsers.insert(user);
			}
		}
	};

	this.requestUpdateSelectedUsers = throttle(function () {
		self.updateSelectedUsers();
		setTimeout(m.redraw);
	}, 150);

	// create and periodically update updateActiveCutoffTime so we don't have
	// to recreate this object tens of thousands of times on each selected
	// users filter event
	this.activeCutoffTime;
	function updateActiveCutoffTime() {
		self.activeCutoffTime = new Date(Date.now() - self.rolling.activeTimeout);
	}
	updateActiveCutoffTime();
	setInterval(updateActiveCutoffTime, 1000);

	// set activeTimeout user cleaning interval
	setInterval(function () {
		if (self.rolling.type === 'active') {
			self.requestUpdateSelectedUsers();
		}
	}, 1000 * 10);

	function selectedFilter(user) {
		var rol = self.rolling;
		if (!rol.groups[user.group]) return false;
		if (rol.subscriberLuck > self.config.maxSubscriberLuck && !user.subscriber) return false;
		if (rol.minBits && rol.minBits > user.bits) return false;
		if (rol.subscribedTime && (!user.subscriber || rol.subscribedTime > user.subscribedTime)) return false;
		if (self.searchFilter) {
			if (self.searchFilter.value === 'truthy') {
				if (!user[self.searchFilter.prop]) return false;
			} else if (self.searchFilter.value === 'falsy') {
				if (user[self.searchFilter.prop]) return false;
			} else {
				if (self.searchFilter.value !== user[self.searchFilter.prop]) return false;
			}
		}
		if (self.searchQuery && !~user.name.indexOf(self.searchQuery) && !~user.displayName.indexOf(self.searchQuery)) return false;
		if (rol.type === 'all') return true;
		if (rol.type === 'active' && self.activeCutoffTime > user.lastMessage) return false;
		if (rol.type === 'keyword' && rol.keyword && rol.keyword !== user.keyword) return false;
		return true;
	}

	chat.on('message', function (message) {
		var id = twitch.toID(message.user.name);
		var user;
		if (self.users.exists(id)) {
			user = self.users.get(id);
			var prevGroup = user.group;
			user.extend(message.user);
			// if user's group has changed, we need to resort users
			if (prevGroup !== user.group) {
				self.users.sort();
				self.updateSelectedUsers();
			}
		} else {
			user = new User(message.user);
			// check if the user shouldn't be ignored
			if (~Users.ignoredGroups.indexOf(user.group)) return;
			if (~self.options.ignoreList.indexOf(user.id)) return;
			self.users.insert(user);
		}
		user.lastMessage = new Date();
		if (self.winner === user) user.messages.push(new Message(message));
		if (self.rolling.keyword) {
			var keywordIndex = self.rolling.caseSensitive
				? message.text.indexOf(self.rolling.keyword)
				: message.text.toLowerCase().indexOf(self.rolling.keyword.toLowerCase());
			if (keywordIndex === 0) {
				if (self.options.keywordAntispam && user.keyword === self.rolling.keyword) {
					user.keywordEntries++;
					if (user.keywordEntries > self.options.keywordAntispamLimit) user.eligible = false;
				} else {
					user.keyword = self.rolling.keyword;
					user.keywordEntries = 1;
				}
				self.requestUpdateSelectedUsers();
			}
		}
		if (self.winner && self.winner === user && !self.winner.respondedAt)
			self.winner.respondedAt = new Date();
		m.redraw();
	});

	this.users.on('insert', function (user) {
		if (selectedFilter(user)) self.selectedUsers.insert(user);
	});
	this.users.on('remove', self.selectedUsers.remove.bind(self.selectedUsers));

	this.setter.on('rolling.groups', this.updateSelectedUsers);
	this.setter.on('rolling.type', this.updateSelectedUsers);
	this.setter.on('rolling.activeTimeout', function () {
		updateActiveCutoffTime();
		self.requestUpdateSelectedUsers();
	});
	this.setter.on('rolling.keyword', self.requestUpdateSelectedUsers);
	this.setter.on('rolling.minBits', self.requestUpdateSelectedUsers);
	this.setter.on('rolling.subscribedTime', self.requestUpdateSelectedUsers);

	// search
	this.search = '';
	this.searchFilter = null;
	this.searchQuery = '';
	this.setter.on('search', function () {
		self.search = String(self.search).trim().toLowerCase();
		self.searchFilter = self.config.searchFilters[self.search[0]];
		self.searchQuery = self.searchFilter ? self.search.substr(1).trim() : self.search;
	});
	this.setter.on('search', self.requestUpdateSelectedUsers);

	// rolling function
	this.roll = function () {
		// Blur active element, since there is a chrome rendering bug this.
		// When section changes while some of the range inputs is focused,
		// Chrome will not clear the old index.js section from raster,
		// although it is no longer in DOM. This was causing loading indicator
		// to be overlayed on the old section while spinning.
		if (document.activeElement && document.activeElement.blur) {
			document.activeElement.blur();
		}

		self.messages.clear();

		var pool = [];
		var subLuck = self.rolling.subscriberLuck;
		for (var i = 0, j, user; user = self.selectedUsers[i], i < self.selectedUsers.length; i++) {
			if (!user.eligible) continue;
			if (user.subscriber && subLuck > 1)
				for (j = 0; j < subLuck; j++) pool.push(user);
			else pool.push(user);
		}

		if (!pool.length) {
			self.messages.danger('There is none to roll from.');
			return;
		}

		// clean current winner data
		if (self.winner) {
			delete self.winner.rolledAt;
			delete self.winner.respondedAt;
			delete self.winner.messages;
		}


		channel.channel()
			.then(null, function (err) {
				console.error(err);
				return false;
			}).then(function (stream) {
				self.winners.add({
					name: self.winner.name,
					displayName: self.winner.displayName || self.winner.name,
					title: stream ? stream.status : 'couldn\'t retrieve stream title'
				});
			});

		// send viewers + entered tracking events if user has management rights
		// on the channel
		if (chat.user.broadcaster || chat.user.moderator) {
			try {
				// send 'entered' event
				ga('send', 'event', {
					eventCategory: 'entered',
					eventAction: 'roll',
					eventLabel: channel.name,
					eventValue: pool.length,
					nonInteraction: true
				});
			} catch (err) {
				console.error(err);
			}

			// send 'viewers' event
			channel.stream().then(function (stream) {
				// stream is null when channel is not streaming
				if (stream) ga('send', 'event', {
					eventCategory: 'viewers',
					eventAction: 'roll',
					eventLabel: stream.channel.name,
					eventValue: stream.viewers,
					nonInteraction: true
				});
			}, function (err) {
				console.error(err);
			});
		}

		// pick random winner from array of eligible users
		var winner = pool[Math.random() * pool.length | 0];
		winner.messages = [];
		winner.rolledAt = new Date();

		// uncheck winner
		if (self.options.uncheckWinners) {
			winner.eligible = false;
		}

		// announce winner
		if (self.options.announceWinner) {
			chat.post(String(self.options.announceTemplate).replace('{name}', winner.name));
		}

		// set winner and open their profile
		self.setter('winner')(winner);
		self.section.activate('profile', winner);
	};

	// components
	this.components = new Components(this)
		.use(require('../component/userlist'), this.selectedUsers);

	// primary section
	this.section = new Section(this)
		.use(require('../section/index'))
		.use(require('../section/winners'))
		.use(require('../section/config'))
		.use(require('../section/changelog'))
		.use(require('../section/about'))

		.use(require('../section/profile'))
		.use(require('../section/bitcoin'));

	// clear messages when changing sections
	this.section.on('active', this.messages.clear.bind(this.messages));

	// this.toSection = this.section.activator.bind(this.section);
	this.toSection = function (name, data) {
		return withKey(1, self.section.activator(name, data));
	};

	// active section class - returns 'active' when passed section name is active
	this.classWhenActive = function (name, normalClass, activeClass) {
		if (!activeClass) {
			activeClass = normalClass;
			normalClass = '';
		}
		return normalClass + ' ' + (self.section.isActive(name) ? activeClass || 'active' : '');
	};

	// tooltips
	this.tooltips = false;
	this.setter.on('options.displayTooltips', makeTooltips);
	makeTooltips(this.options.displayTooltips);

	function makeTooltips(display) {
		if (display && !self.tooltips) self.tooltips = new Tooltips(container, self.config.tooltips);
		else if (!display && self.tooltips) {
			self.tooltips.destroy();
			self.tooltips = false;
		}
	}

	// also clean users when ignore list has changed
	this.setter.on('options.ignoreList', throttle(this.cleanUsers, 1000));
}

function view(ctrl) {
	return [
		m('.viewers', [
			m('.bar', [
				m('.search', [
					m('input[type=text]', {
						oninput: m.withAttr('value', ctrl.setter('search')),
						onkeydown: withKey(27, ctrl.setter('search').to('')),
						placeholder: 'search...',
						required: true,
						value: ctrl.search
					}),
					ctrl.search
						? m('.cancel', {onclick: ctrl.setter('search').to(''), 'data-tip': 'Cancel search <kbd>ESC</kbd>'}, icon('close', '-small'))
						: null
				]),
				m('h3.count', ctrl.selectedUsers.length)
			]),
			ctrl.components.render('userlist'),
		]),
		m('.primary', [
			m('.bar', {key: 'bar'}, [
				m('div', {
					class: ctrl.classWhenActive('index', 'button index', 'active'),
					onmousedown: ctrl.toSection('index'),
					'data-tip': 'Giveaway'
				}, [icon('gift')]),
				ctrl.winner
					? m('div', {
						class: ctrl.classWhenActive('profile', 'button profile', 'active'),
						onmousedown: ctrl.toSection('profile', ctrl.winner),
						'data-tip': 'Last winner'
					}, [icon('trophy'), m('span.label', ctrl.winner.name)])
					: null
				,
				m('.spacer'),
				m('div', {
					class: ctrl.classWhenActive('winners', 'button winners', 'active'),
					onmousedown: ctrl.toSection('winners'),
					'data-tip': 'Past winners'
				}, [icon('trophy-list')]),
				m('div', {
					class: ctrl.classWhenActive('config', 'button config', 'active'),
					onmousedown: ctrl.toSection('config'),
					'data-tip': 'Settings'
				}, [icon('cogwheel')]),
				m('div', {
					class: ctrl.classWhenActive('changelog', 'button index', 'active'),
					onmousedown: ctrl.toSection('changelog'),
					'data-tip': 'Changelog'
				}, [
					icon('list'),
					ctrl.isNewVersion && !ctrl.section.isActive('changelog') ? m('.new') : null
				]),
				m('div', {
					class: ctrl.classWhenActive('about', 'button index', 'active'),
					onmousedown: ctrl.toSection('about'),
					'data-tip': 'About + FAQ'
				}, [icon('help')])
			]),
			ctrl.messages.render(),
			m('section.section.' + ctrl.section.active, {key: ctrl.section.key}, ctrl.section.render()),
		])
	];
}