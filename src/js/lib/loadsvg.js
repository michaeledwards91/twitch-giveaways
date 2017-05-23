module.exports = loadsvg;

/**
 * Creates an SVG element out of the text returned by URL.
 *
 * Callback receives 2 arguments:
 *   1st: error   Error object if something wen't wrong.
 *   2nd: element Created SVG element.
 *
 * @param  {String}   url
 * @param  {Function} callback
 */
function loadsvg(url, callback) {
	var request = new XMLHttpRequest();
	request.onload = create;
	request.ontimeout = error;
	request.onerror = error;
	request.open('get', url, true);
	request.send();

	function error(message) {
		callback(new Error(message || request.statusText));
	}

	function create() {
		var div = document.createElement('div');
		div.innerHTML = inlinesvg(request.responseText);
		var svgEl = div.children[0];
		if (!svgEl || svgEl.nodeName.toLowerCase() !== 'svg') {
			return error('URL "' + url + '" returned something that didn\'t result in an SVG element.');
		}
		callback(null, svgEl);
	}
}

/**
 * Drops `<?xml ?>` and `<!DOCTYPE >` from SVG file.
 *
 * @param  {String} svg
 * @return {String}
 */
function inlinesvg(svg) {
	return String(svg)
		// drop <?xml ?>
		.replace(/<\?xml[^<]+\?>/i, '')
		// drop <!DOCTYPE >
		.replace(/<!doctype[^<]+\>/i, '');
}