function uid(size) {
	size = Number(size) || 10;
	return Array(size)
		.fill(0)
		.map(function () {return Math.floor(Math.random() * 36).toString(36)})
		.join('');
}

function Winners(channel, options) {
	var self = this;
	self.options = options || {};
	self.connecting = false;
	self.connected = false;
	self.saving = false;
	self.channel = channel;
	self.selectedChannel = channel;
	self.storageKey = 'past-winners';
	self.searchTerm = '';
	self.fromTime = null;
	self.toTime = null;
	self.selected = [];
	self.channels = {};  // channelName->records map
	self.sig;            // channel state signature, used by reload to ignore own changes
	self.used = 0;       // used data in bytes

	self.sync = self.sync.bind(self);
	self.save = self.save.bind(self);
	self.updateUsed = self.updateUsed.bind(self);
	self.switchChannel = self.switchChannel.bind(self);
	self.search = self.search.bind(self);
	self.from = self.from.bind(self);
	self.to = self.to.bind(self);
	self.delete = self.delete.bind(self);
	self.clearSelected = self.clearSelected.bind(self);
	self.mockAdd = self.mockAdd.bind(self);
	self.isSelected = self.isSelected.bind(self);
}

Winners.prototype.connect = function () {
	var self = this;
	if (self.connected) return Promise.resolve();
	if (self.connecting) return self.connecting;
	chrome.storage.onChanged.addListener(self.sync);
	self.connecting = new Promise(function (resolve, reject) {
		chrome.storage.local.get(self.storageKey, function (items) {
			self.reload(items[self.storageKey]);
			resolve();
		});
	}).then(function () {
		self.connected = true;
		self.connecting = false;
		self.updateUsed();
	});
	return self.connecting;
};

Winners.prototype.reload = function (json) {
	var self = this;
	var obj;
	if (json) try {
		obj = JSON.parse(json);
	} catch (err) {}
	if (!obj || !obj.channels) self.channels = {};
	else if (self.sig && self.sig === obj.sig) return;
	else self.channels = obj.channels;
	self.storeChanged();
	self.reselect();
	return self;
};

Winners.prototype.sync = function (changes, namespace) {
	if (namespace !== 'local' || !changes[this.storageKey]) return;
	this.reload(changes[this.storageKey].newValue);
};

Winners.prototype.requestSave = function () {
	var self = this;
	if (!self.connected) throw new Error('Can\'t save, store not connected.');
	if (self.requestSaving) return self.requestSaving;
	self.requestSaving = new Promise(function (resolve) {
		setTimeout(resolve, 60);
	}).then(function () {
		self.requestSaving = false;
		return self.save();
	});
	return self.requestSaving;
};

Winners.prototype.save = function () {
	var self = this;
	if (!self.connected) throw new Error('Can\'t save, store not connected.');
	if (self.saving) return self.saving.then(function () {return self.save()});
	self.saving = new Promise(function (resolve) {
		var data = {};
		data[self.storageKey] = JSON.stringify({
			sig: self.sig,
			channels: self.channels
		});
		chrome.storage.local.set(data, function () {
			self.saving = false;
			self.updateUsed();
			resolve();
		});
	});
	return self.saving;
};

Winners.prototype.storeChanged = function () {
	this.sig = uid();
};

Winners.prototype.updateUsed = function () {
	var self = this;
	return new Promise(function (resolve) {
		chrome.storage.local.getBytesInUse(null, function (used) {
			self.used = used;
			resolve();
			if (self.options.onsync) self.options.onsync();
		});
	});
};

Winners.prototype.add = function (data) {
	if (!this.connected) throw new Error('Can\'t add a winner, store not connected.');
	var list = this.channels[this.channel] = this.channels[this.channel] || [];
	list.push({
		id: uid(),
		name: data.name,
		displayName: data.displayName || data.name,
		time: Date.now(),
		title: data.title
	});
	this.storeChanged();
	this.reselect();
	return this.requestSave();
};

Winners.prototype.mockAdd = function (size, timeStep) {
	size = Number(size) || 10;
	timeStep = Number(timeStep) || 1000 * 60 * 60;
	if (!this.connected) throw new Error('Can\'t add a winner, store not connected.');
	var list = this.channels[this.selectedChannel] = this.channels[this.selectedChannel] || [];
	var time = Date.now() - (size * timeStep);
	var name;
	for (var i = 0; i < size; i++) {
		name = uid(Math.round(Math.random() * 26 + 4)).toLowerCase();
		list.push({
			id: uid(),
			name: name,
			displayName: name[0].toUpperCase() + name.slice(1),
			time: time,
			title: Array(Math.round(Math.random()*20 + 2)).fill(0)
				.map(function() {return uid(Math.round(Math.random()*8 + 2))})
				.join(' ')
		});
		time += timeStep;
	}
	this.storeChanged();
	this.reselect();
	return this.requestSave();
};

Winners.prototype.switchChannel = function (channel) {
	this.selectedChannel = channel;
	this.reselect();
};

Winners.prototype.currentChannel = function () {
	return this.channels[this.selectedChannel] || [];
};

Winners.prototype.search = function (term) {
	this.searchTerm = String(term).toLowerCase();
	this.reselect();
};

Winners.prototype.from = function (time) {
	this.fromTime = time ? new Date(time) : null;
	this.reselect();
};

Winners.prototype.to = function (time) {
	// adds a day to make the date inclusive
	this.toTime = time ? new Date(new Date(time).getTime() + 60000 * 60 * 23.99) : null;
	this.reselect();
};

Winners.prototype.delete = function (id) {
	if (!this.channels[this.selectedChannel]) return Promise.resolve();
	this.channels[this.selectedChannel] = this.channels[this.selectedChannel]
		.filter(function (record) {return record.id !== id});
	if (this.channels[this.selectedChannel].length === 0) {
		delete this.channels[this.selectedChannel];
		this.selectedChannel = this.channel;
	}
	this.storeChanged();
	this.reselect();
	return this.requestSave();
};

Winners.prototype.clearSelected = function () {
	var self = this;
	var i = 0;
	var list = (this.channels[this.selectedChannel] || []);
	this.channels[this.selectedChannel] = list.filter(function (record) {
		return !self.isSelected(record);
	});
	if (this.channels[this.selectedChannel].length === 0) {
		delete this.channels[this.selectedChannel];
		this.selectedChannel = this.channel;
	}
	this.storeChanged();
	this.reselect();
	return this.requestSave();
};

Winners.prototype.reselect = function () {
	var list = this.currentChannel();
	this.selected = list.filter(this.isSelected);
};

Winners.prototype.isSelected = function (record) {
	if (this.searchTerm
		&& record.name.indexOf(this.searchTerm) === -1
		&& record.title && record.title.toLowerCase().indexOf(this.searchTerm) === -1
	) return false;
	if (this.fromTime && this.fromTime > record.time) return false;
	if (this.toTime && this.toTime < record.time) return false;
	return true;
};

module.exports = Winners;