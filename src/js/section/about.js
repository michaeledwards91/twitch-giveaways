var m = require('mithril');
var icon = require('../component/icon');
var animate = require('../lib/animate');
var morpher = require('../lib/morpher');

module.exports = {
	name: 'about',
	controller: Controller,
	view: view
};

function Controller() {
	this.version = require('tga/data/changelog.json')[0];
	this.faqs = require('tga/data/faq.json');
	// send page view
	ga('send', 'pageview', '/app/about');
}

var lineToP = morpher('p', true);

function view(ctrl) {
	return [
		m('.card', [
			m('.title', {config: animate('slideintop', 100)}, [
				m('h1', [
					m('a', {
						href: 'https://chrome.google.com/webstore/detail/twitch-giveaways/poohjpljfecljomfhhimjhddddlidhdd',
						target: '_blank'
					}, 'Twitch Giveaways')
				])
			]),
			m('.lead', [
				m('.emblem', {config: animate('slideintop')}, [icon('tga')]),
				m('aside.middle', [
					m('.meta', {config: animate('slideinright', 50)}, [m('h3', ctrl.version.version)]),
					m('.meta', {config: animate('slideinleft', 50)}, [m('em', ctrl.version.date)])
				]),
				m('aside.lower', [
					m('a.action', {href: 'https://github.com/darsain/twitch-giveaways', target: '_blank', config: animate('slideinright', 150)}, [
						m('span.name', 'Repository'),
						icon('github')
					]),
					m('a.action', {href: 'https://twitter.com/darsain', target: '_blank', config: animate('slideinleft', 150)}, [
						icon('twitter'),
						m('span.name', 'Author')
					])
				])
			])
		]),
		m('fieldset.begging', [
			m('legend', {config: animate('fadein', 100)}, 'Support the development'),
			require('../component/support').view(ctrl)
		]),
		m('fieldset.sponsorship', [
			m('legend', {config: animate('fadein', 100)}, 'Sponsor Twitch Giveaways'),
			m('article', {config: animate('slideinleft', 100)}, [
				m('p', [
					'To sponsor Twitch Giveaways, email: ',
					m('a', {href: 'mailto:' + ctrl.config.sponsorshipEmail}, [
						ctrl.config.sponsorshipEmail
					])
				]),
				m('p', ['You\'ll get:']),
				m('ul', [
					m('li', 'Logo spanning 50% of the available width.'),
					m('li', 'Leading to URL of your choice.'),
					m('li', 'Tooltip with name and description of your product.')
				])
			])
		]),
		m('fieldset.faq', [
				m('legend', {config: animate('fadein', 100)}, 'Frequently Asked Questions')
			].concat(ctrl.faqs.map(function (faq, i) {
				return m('article.qa', {config: animate('slideinleft', 50 * i + 100)}, [
					m('h1.question', m.trust(faq.question))
				].concat(faq.answer.map(lineToP)));
		})))
	];
}