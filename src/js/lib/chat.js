var emitter = require('emitter');
var channel = require('./channel');

var chat = module.exports = {
	user: {}
};

// Make chat object an event emitter.
emitter(chat);

// Listen for new chat-message events sent by content script.
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
	if (message && message.meta && message.meta.channel !== channel.name) {
		return;
	}

	chat.tab = sender.tab;

	switch (message.type) {
		case 'chat-message':
			chat.emit('message', message.payload);
			break;

		case 'chat-user':
			chat.user = message.payload;
			break;
	}
});

// Send message to chat.
chat.post = function (message) {
	if (!chat.tab) {
		console.log('Twitch Giveaways: Can\'t send the message, don\'t know where to :(');
		return;
	}

	// asks content script to post the message
	chrome.tabs.sendMessage(chat.tab.id, {
		type: 'send-message',
		payload: message,
		meta: {
			channel: channel.name
		}
	});
};

