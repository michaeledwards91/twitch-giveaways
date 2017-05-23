var root = document.createElement('div');

module.exports = textify;

function textify(html) {
	root.innerHTML = html && html.nodeType === 1 ? html.outerHTML : html + '';
	var imgs = root.querySelectorAll('img');
	for (var i = 0, l = imgs.length; i < l; i++) imgs[i].outerHTML = imgs[i].getAttribute('alt');
	return root.textContent || root.innerText;
}