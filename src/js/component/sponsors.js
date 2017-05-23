var m = require('mithril');
var e = require('e');
var Tooltip = require('tooltip');
var animate = require('../lib/animate');

var sponsors = require('tga/data/sponsors.json').filter(activeSponsors);

module.exports = {
	name: 'sponsors',
	view: view
};

function view(ctrl) {
	var s = sponsors;

	return m('.sponsors', s[0] && s[0].double ? [sponsor(s[0])] : [
			s[0] ? sponsor(s[0]) : placeholder(ctrl.config),
			s[1] ? sponsor(s[1]) : placeholder(ctrl.config)
	]);
}

function sponsor(sponsor) {
	var anchorProps = {
		href: sponsor.url,
		target: '_blank',
		class: sponsor.double ? 'double' : '',
		config: tooltip(sponsor)
	};

	return m('a', anchorProps, [
		m('img.banner', {
			src: chrome.extension.getURL('banner/' + sponsor.banner)
		})
	]);
}

function placeholder(config) {
	var dummySponsor = {
		name: 'Your name',
		description: 'And description, leading to your custom URL...'
	};
	var linkProps = {
		href: 'mailto:' + config.sponsorshipEmail,
		target: '_blank',
		config: tooltip(dummySponsor)
	};

	return m('a', linkProps, [
		m('.sponsor-placeholder', [
			m('.text', [
				'Sponsor ',
				m('strong', 'Twitch Giveaways'),
				' and get your logo ',
				m('strong', 'HERE')
			])
		])
	]);
}

function activeSponsors(sponsor) {
	var time = Date.now();
	return time > new Date(sponsor.start) && time < new Date(sponsor.end);
}

function tooltip(sponsor) {
	return function (el, isInit, ctx) {
		if (isInit) return;

		var content = e([
			e('strong', sponsor.name),
			e('br'),
			e('small', sponsor.description)
		]);
		var options = {
			baseClass: 'tgatip',
			auto: 1,
			effectClass: 'slide'
		};

		ctx.tip = new Tooltip(content, options);
		ctx.show = function () {
			ctx.tip.show(el);
		};
		ctx.hide = function () {
			ctx.tip.hide();
		};
		ctx.onunload = function () {
			ctx.hide();
			el.removeEventListener('mouseover', ctx.show);
			el.removeEventListener('mouseout', ctx.hide);
		};

		el.addEventListener('mouseover', ctx.show);
		el.addEventListener('mouseout', ctx.hide);
	}
}