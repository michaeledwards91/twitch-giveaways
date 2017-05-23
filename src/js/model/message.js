var Model = require('./model');
var inherit = require('inherit');

module.exports = Message;

/**
 * Message model constructor.
 *
 * @param {Object} message
 */
function Message(message) {
	Model.call(this);
	this.time = new Date();
	this.html = message.html;
	this.text = message.text;
}

inherit(Message, Model);