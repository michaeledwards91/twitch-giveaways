var m = require('mithril');

module.exports = VirtualList;

function VirtualList() {
	var container;
	var scrollTop = 0;
	var scrollLeft = 0;
	var width = 0;
	var height = 0;
	var firstUpdate = true;
	var firstRrender = false;

	function config(el, isInit, ctx) {
		if (isInit) return;
		container = el;

		window.addEventListener('resize', update);
		container.addEventListener('scroll', update);

		ctx.onunload = function () {
			window.removeEventListener('resize', update);
			container.removeEventListener('scroll', update);
		};

		// page crashes without timeout here. no idea...
		setTimeout(update, 12);
	}

	function update() {
		scrollTop = container.scrollTop;
		scrollLeft = container.scrollLeft;
		width = container.clientWidth;
		height = container.clientHeight;
		if (firstUpdate) {
			firstUpdate = false;
			firstRrender = true;
		}
		m.redraw();
	}

	return function (props) {
		var v = !props.horizontal;
		var pos = v ? scrollTop : scrollLeft;
		var viewSize = v ? height : width;
		var renderCount = Math.min(Math.ceil(viewSize / props.itemSize), props.itemsCount);
		var startIndex = Math.min(Math.floor(pos / props.itemSize), props.itemsCount - renderCount);
		var startSpacing = (startIndex * props.itemSize) + 'px';
		var endSpacing = ((props.itemsCount - startIndex - renderCount) * props.itemSize) + 'px';
		var containerStyle = {
			overflowX: v ? 'hidden' : 'auto',
			overflowY: v ? 'auto' : 'hidden'
		};
		var startSpacerStyle = {
			width: v ? 0 : startSpacing,
			height: v ? startSpacing : 0
		};
		var endSpacerStyle = {
			width: v ? 0 : endSpacing,
			height: v ? endSpacing : 0
		};
		var items = [];

		if (props.itemsCount === 0) {
			if (props.renderEmpty) items.push(props.renderEmpty());
		} else {
			items.push(m('.start-spacer', {key: 'start-spacer', style: startSpacerStyle}));
			for (var i = startIndex; i < startIndex + renderCount; i++) {
				items.push(props.renderItem(i, firstRrender));
			}
			items.push(m('.end-spacer', {key: 'end-spacer', style: endSpacerStyle}));
		}

		if (firstRrender) firstRrender = false;

		return m('div', Object.assign({}, props.props, {style: containerStyle, config: config}), items);
	};
}