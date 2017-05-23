var m = require('mithril');
var icon = require('../component/icon');
var extend = require('extend');
var ucFirst = require('to-sentence-case');
var closest = require('closest');
var throttle = require('throttle');
var withKey = require('../lib/withkey');
var channel = require('../lib/channel');
var escapeRegexp = require('escape-regexp');
var config = require('tga/data/config.json');
var virtualList = require('./virtual-list');

var userlist = module.exports = {
	name: 'userlist',
	controller: Controller,
	view: view
};

userlist.defaults = {
	itemSize: 30
};

var groups = require('../model/user').groups;

function Controller(users, options) {
	var self = this;
	extend(this, userlist.defaults, options);

	this.users = m.prop(users);
	this.scrollTop = 0;
	this.limit = Math.ceil(window.innerHeight / this.itemSize);

	this.virtualList = virtualList();

	this.scroll = function () {
		self.scrollTop = this.scrollTop;
	};

	this.toggleUser = function (event) {
		var target = closest(event.target, '[data-id]', true, this);
		var id = target && target.dataset.id;
		if (!id) return;
		var user = self.users().get(id);
		if (user) user.eligible = !user.eligible;
	};
}

function view(ctrl) {
	var users = ctrl.users();
	var query = ctrl.searchQuery ? new RegExp('(' + escapeRegexp(ctrl.searchQuery) + ')', 'i') : null;

	function renderUser(i) {
		var user = users[i];
		return m('.user', {
			key: user.id,
			class: user.eligible ? 'checked' : '',
			'data-id': user.id,
			title: user.displayName
		}, [
			m('span.eligible'),
			m('span.name', query
				? m.trust(user.displayName.replace(query, '<span class="query">$1</span>'))
				: user.displayName),
			cheerIcon(user),
			subscribedIcon(user),
			groupIcon(user)
		]);
	}

	return ctrl.virtualList({
		listName: 'userlist',
		props: {class: 'userlist', onclick: withKey(1, ctrl.toggleUser)},
		itemSize: 30, itemsCount: users.length, renderItem: renderUser
	});
}

function cheerIcon(user) {
	if (!Number.isInteger(user.bits) || user.bits < 1) return null;
	for (var i = config.cheerSteps.length - 1; i >= 0; i--) {
		if (user.bits < config.cheerSteps[i]) continue;
		return icon('cheer-' + config.cheerSteps[i], 'badge');
	}
}

function subscribedIcon(user) {
	if (!user.subscriber) {
		return null;
	}

	var subBadgeVersionID = user.subscribedTime/1 === 1 ? 0 : user.subscribedTime;
	var subBadgeURL = user.subscriber && channel.badges
		? channel.badges.subscriber.versions[subBadgeVersionID].image_url_2x
		: false;

	return subBadgeURL
		? m('img.badge.subscriber.-custom', {src: subBadgeURL})
		: m('.badge.subscriber.-placeholder', [
			icon('star'),
			m('.time', user.subscribedTime)
		]);
}

function groupIcon(user) {
	var groupIcon = groups[user.group].icon;
	return !groupIcon ? null : icon(groupIcon, 'badge -' + user.group);
}