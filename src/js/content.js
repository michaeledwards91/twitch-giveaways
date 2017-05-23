var channel = getChannelName();
var button = document.createElement('a');
var postman;
button.className = 'tga-button button button--icon-only float-left';
button.title = 'Open Twitch Giveaways';
button.target = '_blank';
button.innerHTML = '<svg width="20" height="20" viewBox="0 0 512 512" style="margin: 4px 4px 0"><g fill="#6441a4"><path d="M231 462h-162.875v-204.331h162.875v204.331zm0-301.331h-181v67h181v-67zm50 301.331h162.875v-204.331h-162.875v204.331zm0-301.331v67h181v-67h-181zm16.884-45h37.032c27.667 0 26.667-35.669 5.426-35.669-16.384 0-29.071 15.335-42.458 35.669zm51.458-65.669c63.574 0 62.908 90.669-.426 90.669h-91.166c12.673-27.625 38.166-90.669 91.592-90.669zm-174.184 30c-21.241 0-22.241 35.669 5.426 35.669h37.032c-13.387-20.334-26.074-35.669-42.458-35.669zm-9-30c53.426 0 78.919 63.044 91.592 90.669h-91.166c-63.334 0-64-90.669-.426-90.669z"/></g></svg>';

// check if we are running in an extension page
if (window.name === 'tga-embedded-chat') {
	// inject chat listener
	inject({
		onload: loadObserver,
		src: chrome.extension.getURL('chat-listener.js')
	});

	// Relay some runtime messages to chat listener.
	chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
		if (request.type === 'send-message') {
			relayToInject(request);
		}
	});
} else if (['www.twitch.tv', 'twitch.tv'].indexOf(window.location.hostname) > -1) {
	// Keep updating TGA button
	setInterval(function (callback) {
		var container = document.querySelector('.chat-buttons-container');
		if (!container) return;

		channel = getChannelName();
		if (!channel) return;

		button.href = chrome.extension.getURL('main.html?channel=' + channel);
		if (button.parentNode !== container) container.appendChild(button);
	}, 1000);
	// content analytics
	// disabled due to triggering too many events
	// inject({src: chrome.extension.getURL('content-analytics.js')});
}

function getChannelName() {
	var match = window.location.pathname.match(/^\/([^\/]+)(\/|$)/);
	return match ? match[1].toLowerCase() : null;
}

function inject(props) {
	var script = document.createElement('script');
	Object.assign(script, props);
	document.body.appendChild(script);
	document.body.removeChild(script);
}

function loadObserver() {
	postman = document.querySelector('#twitch-giveaways-message-passing');
	var observer = new MutationObserver(function (mutations) {
		for (var i = 0; i < mutations.length; i++) {
			var mutation = mutations[i];
			if (mutation.attributeName === 'data-out') {
				var message = postman.getAttribute('data-out');
				try {
					chrome.runtime.sendMessage(JSON.parse(message));
				} catch (err) {
					console.log('Twitch Giveaways: Can\'t parse data-out message: ', err.message);
				}
			}
		}
	});

	observer.observe(postman, {attributes: true});
}

function relayToInject(request) {
	if (!postman) {
		console.log('Twitch Giveaways: Can\'t relay to chat listener, postman not loaded yet.');
		return;
	}

	postman.setAttribute('data-in', JSON.stringify(request));
}
