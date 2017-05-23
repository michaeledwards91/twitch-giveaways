var m = require('mithril');
var icon = require('../component/icon');
var animate = require('../lib/animate');
var withKey = require('../lib/withkey');
var manyTimes = require('../lib/many-times');

module.exports = {
	name: 'config',
	controller: Controller,
	view: view
};

function formatIngoreListItem(item) {
	return String(item).trim().replace(' ', '').toLowerCase();
}

function Controller() {
	var self = this;
	this.updateIgnoreList = function (list) {
		self.setter('options.ignoreList')(list.split('\n').map(formatIngoreListItem));
	};
	// send page view
	ga('send', 'pageview', '/app/settings');
}

function view(ctrl) {
	var i = 0;
	return [
		// uncheck winners
		m('article.option.uncheck-winners', {
			key: 'option-uncheck-winners',
			config: animate('slideinleft', 50 * i++)
		}, [
			m('label', {onmousedown: withKey(1, ctrl.setter('options.uncheckWinners').to(!ctrl.options.uncheckWinners))}, 'Uncheck winners'),
			icon(ctrl.options.uncheckWinners ? 'check' : 'close', {
				class: 'checkbox' + (ctrl.options.uncheckWinners ? ' checked' : ''),
				onmousedown: withKey(1, ctrl.setter('options.uncheckWinners').to(!ctrl.options.uncheckWinners))
			}),
			m('p.description', 'When enabled, winners are automatically unchecked to not win twice.')
		]),

		// announce winner
		m('article.option.announce-winner', {
			key: 'option-announce-winner',
			config: animate('slideinleft', 50 * i++)
		}, [
			m('label', {onmousedown: withKey(1, ctrl.setter('options.announceWinner').to(!ctrl.options.announceWinner))}, 'Announce winners'),
			icon(ctrl.options.announceWinner ? 'check' : 'close', {
				class: 'checkbox' + (ctrl.options.announceWinner ? ' checked' : ''),
				onmousedown: withKey(1, ctrl.setter('options.announceWinner').to(!ctrl.options.announceWinner))
			}),
			m('p.description', 'Announce winner in chat. You need to be logged in!')
		]),

		// announce template
		m('article.option.announce-template', {
			key: 'option-announce-template',
			config: animate('slideinleft', 50 * i++)
		}, [
			m('label[for=option-announce-template]', [
				'Announce template',
				m('p.description', [m('code', '{name}'), ' - winner\'s name'])
			]),
			m('textarea#option-announce-template', {
				oninput: m.withAttr('value', ctrl.setter('options.announceTemplate')),
				value: ctrl.options.announceTemplate
			})
		]),

		// keyword antispam
		m('article.option.keyword-antispam', {
			key: 'option-keyword-antispam',
			config: animate('slideinleft', 50 * i++)
		}, [
			m('label', {onmousedown: withKey(1, ctrl.setter('options.keywordAntispam').to(!ctrl.options.keywordAntispam))}, 'Keyword antispam'),
			icon(ctrl.options.keywordAntispam ? 'check' : 'close', {
				class: 'checkbox' + (ctrl.options.keywordAntispam ? ' checked' : ''),
				onmousedown: withKey(1, ctrl.setter('options.keywordAntispam').to(!ctrl.options.keywordAntispam))
			}),
			ctrl.options.keywordAntispam ? m('input[type=range]', {
				min: 1,
				max: 5,
				oninput: m.withAttr('value', ctrl.setter('options.keywordAntispamLimit').type('number')),
				value: ctrl.options.keywordAntispamLimit
			}) : null,
			ctrl.options.keywordAntispam ? m('span.meta', ctrl.options.keywordAntispamLimit) : null,
			m('p.description', 'People who enter keyword more than ' + manyTimes(ctrl.options.keywordAntispamLimit) + ' are automatically unchecked.')
		]),

		// ignore list
		m('article.option.ignore-list', {
			key: 'option-ignore-list',
			config: animate('slideinleft', 50 * i++)
		}, [
			m('label[for=option-ignore-list]', [
				'Ignore list',
				m('p.description', 'Separate usernames with new lines.')
			]),
			m('textarea#option-ignore-list', {
				placeholder: 'enter names here',
				oninput: m.withAttr('value', ctrl.updateIgnoreList),
				value: ctrl.options.ignoreList.join('\n')
			})
		]),

		// display tooltips
		m('article.option.display-tooltips', {
			key: 'option-display-tooltips',
			config: animate('slideinleft', 50 * i++)
		}, [
			m('label', {onmousedown: withKey(1, ctrl.setter('options.displayTooltips').to(!ctrl.options.displayTooltips))}, 'Display tooltips'),
			icon(ctrl.options.displayTooltips ? 'check' : 'close', {
				class: 'checkbox' + (ctrl.options.displayTooltips ? ' checked' : ''),
				onmousedown: withKey(1, ctrl.setter('options.displayTooltips').to(!ctrl.options.displayTooltips))
			}),
			m('p.description', 'Hide tooltips if you already know what is what.')
		])
	];
}
