var Pikaday = require('../vendor/pikaday');
var withKey = require('./withkey');

var defaults = {
	minDate: new Date('01-01-2017'),
	maxDate: new Date()
};

module.exports = function makeDatePicker(options) {
	options = Object.assign({}, defaults, options);
	return function (el, isInit, ctx) {
		if (isInit) return;

		var picker = new Pikaday({
			field: el,
			minDate: options.minDate,
			maxDate: options.maxDate,
			position: 'bottom right',
			onSelect: mockInputEvent
		});

		el.addEventListener('keydown', resetPicker);
		el.addEventListener('input', refreshPicker);

		ctx.onunload = function () {
			picker.destroy();
			el.removeEventListener('keydown', resetPicker);
			el.removeEventListener('input', refreshPicker);
		};

		function resetPicker(event) {
			// Escape filter
			if ((event.which || event.keyCode) !== 27) return;
			el.value = '';
			mockInputEvent();
		}

		function refreshPicker() {
			var date = new Date(el.value);
			if (isNaN(date.getTime())) date = null;
			picker.setDate(date, true);
			// blur on input reset
			if (!el.value) setTimeout(function () {el.blur()}, 1);
		}

		function mockInputEvent() {
			el.dispatchEvent(new Event('input', {bubbles: true, cancelable: true}));
		}
	};
};