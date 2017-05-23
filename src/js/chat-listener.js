var channelname = location.pathname.match(/^\/([^\/]+)\//)[1].toLowerCase();
var postman = document.createElement('div');
var ctrl = window.ctrl = window.App.__container__.lookup('controller:chat');
postman.id = 'twitch-giveaways-message-passing';
postman.style.display = 'none';

var ignoredSenders = ['twitchnotify', 'jtv'];

document.body.appendChild(postman);

// Listen for messages from content script and handle the request
var requestHandlers = {
	'send-message': sendMessage
};
var observer = new MutationObserver(function (mutations) {
	for (var i = 0; i < mutations.length; i++) {
		var mutation = mutations[i];
		if (mutation.attributeName === 'data-in') {
			var message = postman.getAttribute('data-in');
			try {
				var request = JSON.parse(message);
				var handler = requestHandlers[request.type];
				if (handler) {
					handler(request);
				}
			} catch (err) {
				console.log('Twitch Giveaways: Can\'t parse data-in message: ', err.message);
			}
		}
	}
});

observer.observe(postman, {attributes: true});

// Send message to content.js.
function sendToContent(request) {
	postman.setAttribute('data-out', JSON.stringify(request));
}

// Promise that calls retriever until it returns something not null/undefined.
function getLater(retriever, timeout) {
	var timeout = Date.now() + (timeout || 5000);
	var interval = 100;
	return new Promise(function (resolve, reject) {
		check();

		function check() {
			try {
				var result = retriever();
				if (result === null || result === undefined) {
					return endOrTimeout();
				}
				resolve(result);
			} catch (err) {
				endOrTimeout();
			}
		}

		function endOrTimeout() {
			if (Date.now() > timeout) {
				reject(new Error(retriever.name + ' could\'t be resolve in time, giving up'));
			} else {
				setTimeout(check, interval)
			}
		}
	});
}

getLater(function () { return TMI._sessions[0]._connections.main; })
	// Tap into TMI message event.
	.then(function (main) {
		main.on('message', processMessage);
		console.log('Twitch Giveaways: Listening on chat started.');

		return getLater(function () { return TMI._sessions[0]._rooms[channelname]; })
			.then(function (room) {
				return {username: main.nickname, room: room};
			});
	})
	// Get current user data and capabilities
	.then(function (data) {
		var room = data.room;
		var user = {
			name: data.username
		};
		var meta = {channel: data.room.name};

		// Initial chat-user event since the listener below won't trigger
		// for people with no badges
		sendToContent({type: 'chat-user', payload: user, meta: meta});

		// Listen for badge changes and update user object.
		room.on('badgeschanged', function badgeschanged(name) {
			if (name !== user.name) {
				return;
			}

			(room._roomUserBadges[user.name] || []).forEach(function (x) {
				user[x.id] = true;
			}) > -1;
			sendToContent({type: 'chat-user', payload: user, meta: meta});
		});
	})
	.catch(console.log);

function processMessage(obj) {
	// Ignore notifications and other non-messages.
	if (obj.command !== 'PRIVMSG' || ~ignoredSenders.indexOf(obj.sender) || obj.style === 'notification') {
		return;
	}
	var tags = obj.tags;
	var bits = 0;
	var subscribedTime = 0;
	var badges = tags._badges.map(function (obj) {
		switch (obj.id) {
			case 'bits':
				bits = obj.version;
				break;
			case 'subscriber':
				subscribedTime = parseInt(obj.version) || 1;
				break;
		}
		return obj.id;
	});

	sendToContent({
		type: 'chat-message',
		payload: {
			user: {
				name: obj.sender,
				displayName: tags['display-name'],
				badges: badges,
				staff: ~badges.indexOf('staff'),
				admin: ~badges.indexOf('admin'),
				broadcaster: ~badges.indexOf('broadcaster'),
				subscriber: tags.subscriber,
				mod: tags.mod,
				turbo: tags.turbo,
				subscribedTime: subscribedTime,
				bits: bits
			},
			text: obj.message.trim(),
			html: emotify(obj).trim()
		},
		meta: {
			channel: obj.target.match(/#?(.+)/)[1]
		}
	});
}

// Create message HTML string with emotes in it.
function emotify(obj) {
	var text = obj.message;
	var emotes = [];
	var slices = [];

	// Serialize emotes into easily walkable array.
	Object.keys(obj.tags.emotes).forEach(function (key) {
		for (var i = 0; i < obj.tags.emotes[key].length; i++) {
			emotes.push({
				id: key,
				start: obj.tags.emotes[key][i][0],
				end: obj.tags.emotes[key][i][1]
			});
		}
	});
	emotes.sort(emoteSorter);

	// Generate HTML with emotes.
	var i = 0;
	for (var e = 0; e < emotes.length; e++) {
		var emote = emotes[e];

		if (emote.start > 0) {
			slices.push(text.slice(i, emote.start));
		}

		var alt = text.slice(emote.start, emote.end + 1);
		var src = 'https://static-cdn.jtvnw.net/emoticons/v1/' + emote.id + '/1.0';
		slices.push('<img class="emoticon" src="' + src + '" alt="' + alt + '" title="' + alt + '">');
		i = emote.end + 1;
	}

	if (text.length > i) {
		slices.push(text.slice(i));
	}

	return slices.join('');
}

function emoteSorter(a, b) {
	return a.start < b.start ? -1 : 1;
}

// Send message to chat via Twitch UI.
function sendMessage(request) {
	var message = request.payload;
	var chatTextarea = document.querySelector('.chat-room .js-chat_input');

	if (!chatTextarea) {
		console.log('Twitch Giveaways: Message not sent. Can\' find the needed elements.');
		return;
	}

	chatTextarea.value = String(message);

	// Simulate an input event so ember's data binding picks up the new value,
	// since changing textarea.value programatically doesn't fire anything.
	chatTextarea.dispatchEvent(new Event('input', {
		bubbles: true,
		cancelable: true
	}));

	// Fire Enter keyboard event on textarea to send the message.
	fireKeyEvent('keydown');
	fireKeyEvent('keypress');

	function fireKeyEvent(name) {
		// This is such a not well thought out, i.e. retarded interface...
		var enterEvent = new KeyboardEvent('keydown', {
			bubbles: true,
			cancelable: true,
			key: "Enter",
			code: "Enter"
		});
		Object.defineProperty(enterEvent, 'keyCode', {value: 13});
		Object.defineProperty(enterEvent, 'which', {value: 13});
		chatTextarea.dispatchEvent(enterEvent);
	}
}

// Send message to chat via TMI interface.
// The disadvantage of this is that sender doesn't see the message he has send,
// so instead the sendMessage() function above is used.
function sendMessageTMI(data) {
	try {
		TMI._sessions[0]._connections.main._send('PRIVMSG #' + data.channel + ' :' + data.message);
	} catch (err) {
		console.log('Twitch Giveaways: Couldn\'t send chat message, TMI interface not found.');
	}
}