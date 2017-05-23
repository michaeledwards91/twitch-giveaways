var Model = require('./model');
var inherit = require('inherit');
var twitch = require('../lib/twitch');
var twitchURL = 'https://twitch.tv';

module.exports = User;

/**
 * User model constructor.
 *
 * @param {String} name
 */
function User(props) {
	Model.call(this);

	this.group = 'user';
	this.eligible = true;
	this.badges = [];
	this.staff = false;
	this.admin = false;
	this.subscriber = false;
	this.mod = false;
	this.turbo = false;
	this.bits = 0;
	this.subscribedTime = 0;

	this.extend(props);

	this.id = this.name;
	this.channelURL = twitchURL + '/' + this.id;
	this.profileURL = this.channelURL + '/profile';
	this.messageURL = twitchURL + '/message/compose?to=' + this.id;
	this.lastMessage = new Date();
}

inherit(User, Model);

var proto = User.prototype;
var superProto = Model.prototype;

/**
 * Extend current object with new data.
 *
 * @param  {Object} props
 * @return {User}
 */
proto.extend = function (props) {
	this.name = props.name ? String(props.name).trim().toLowerCase() : this.name;
	delete props.name;

	if (!this.name) {
		throw new Errror('User object requires name property.');
	}

	// Special formatting for special characters.
	if (/[^a-z0-9_\-]/i.test(props.displayName)) {
		this.displayName = props.displayName + ' (' + this.name + ')';
	} else {
		this.displayName = props.displayName || this.displayName || this.name;
	}
	delete props.displayName;

	this.badges = Array.isArray(props.badges) ? props.badges : this.badges;
	delete props.badges;

	this.bits = 'bits' in props ? props.bits|0 : this.bits;
	delete props.bits;

	this.subscribedTime = 'subscribedTime' in props ? props.subscribedTime|0 : this.subscribedTime;
	delete props.subscribedTime;

	// Fill up boolean properties.
	var keys = Object.keys(props);
	for (var i = 0; i < keys.length; i++) {
		this[keys[i]] = !!props[keys[i]];
	}

	// Decide group.
	for (var group in User.groups) {
		if (this[group]) {
			this.group = group;
			break;
		}
	}

	if (!this.group) {
		this.group = 'user';
	}

	return this;
};

User.isGroup = function (group) {
	return group in User.groups;
};

User.groups = {
	broadcaster: {
		order: 1,
		icon: 'broadcaster'
	},
	staff: {
		order: 2,
		icon: 'twitch'
	},
	admin: {
		order: 3,
		icon: 'shield-full'
	},
	mod: {
		order: 4,
		icon: 'shield-empty'
	},
	user: {
		order: 5,
		icon: null
	}
};

User.badges = Object.keys(User.groups).concat('subscriber');