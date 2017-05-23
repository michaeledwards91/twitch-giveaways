module.exports = function (number) {
	number = number | 0;
	switch (number) {
		case 1: return 'once';
		case 2: return 'twice';
		default: return number + ' times';
	}
};