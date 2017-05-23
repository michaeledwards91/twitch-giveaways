var m = require('mithril');

module.exports = icon;

icon.svgPrefix = 'icon';

function icon(name, classes, props) {
	if (typeof classes !== 'string') {
		props = classes;
		classes = false;
	}
	props = props || {};
	if (classes) {
		if (props.class) props.class = classes + ' ' + props.class;
		else if (props.className) props.className = classes + ' ' + props.className;
		else props.class = classes;
	}
	props.role = 'img';
	return m('svg.Icon.-' + name, props, [
		m('use', {'href': '#' + icon.svgPrefix + '-' + name})
	]);
}