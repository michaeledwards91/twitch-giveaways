// dependencies
var loadsvg = require('../lib/loadsvg');

loadsvg(chrome.extension.getURL('icons.svg'), appendSVG);

function appendSVG(err, svg) {
	if (err) throw err;
	svg.style.display = 'none';
	document.body.appendChild(svg);
}