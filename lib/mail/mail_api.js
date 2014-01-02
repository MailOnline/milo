'use strict';

var MessengerAPI = require('../messenger/m_api')
	, _ = require('mol-proto')
	, check = require('../util/check')
	, Match = check.Match;


var MailMsgAPI = _.createSubclass(MessengerAPI, 'MailMsgAPI', true);


_.extendProto(MailMsgAPI, {
	translateToSourceMessage: translateToSourceMessage,
 	filterSourceMessage: filterSourceMessage
});

module.exports = MailMsgAPI;


// TODO: this function should return relevant DOM event dependent on element tag
// Can also implement beforedatachanged event to allow preventing the change
// translateToDomEvent
var windowMessageRegExp = /^message\:/
	, windowMessagePrefix = 'message:';

function translateToSourceMessage(message) {
	if (message == 'domready')
		return 'readystatechange';
	else if (windowMessageRegExp.test(message))
		return 'message';
	else
		return '';
}


// filterDataMessage
function filterSourceMessage(sourceMessage, msgType, msgData) {
	if (sourceMessage == 'readystatechange') {
		if (this._domReadyFired) return false;
		Object.defineProperty(this, '_domReadyFired', {
			writable: true,
			value: true
		});
		return true;
	} else if (sourceMessage == 'message')
		return windowMessagePrefix + msgData.data.type == msgType;
};