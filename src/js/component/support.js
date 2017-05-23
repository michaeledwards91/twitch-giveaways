var m = require('mithril');
var icon = require('../component/icon');
var animate = require('../lib/animate');

module.exports = {
	name: 'support',
	view: view
};

function view(ctrl, tooltip) {
	return m('.support', {'data-tip': tooltip ? tooltip : ''}, [
		m('a.paypal', {
			href: 'https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=AWZ2ZX5T3MF42',
			target: '_blank',
			config: animate('slideinleft', 50)
		}, [icon('paypal'), 'Paypal']),
		m('a.bitcoin', {
			href: '#',
			onmousedown: ctrl.toSection('bitcoin'),
			config: animate('slideinleft', 100)
		}, [icon('bitcoin'), 'Bitcoin'])
	]);
}