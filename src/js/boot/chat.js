var match = window.location.search.match(/channel=([^&]+)(&|$)/);
var channel = match ? match[1].toLowerCase() : null;
var iframe = document.querySelector('#chat');
iframe.src = 'https://www.twitch.tv/' + channel + '/chat';
document.querySelector('title').textContent = 'TGA: ' + channel;