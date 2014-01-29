'use strict';

var Messenger = require('../../lib/messenger')
	, MessengerMessageSource = require('../../lib/messenger/msngr_source')
	, MessengerRegexpAPI = require('../../lib/messenger/m_api_rx')
	, assert = require('assert');

describe('MessengerMessageSource and MessengerRegexpAPI', function() {
	var internalMessenger, messenger;

	beforeEach(function() {
		internalMessenger = new Messenger;
		var mApi = new MessengerRegexpAPI;
		var mSource = new MessengerMessageSource(undefined, undefined, mApi, internalMessenger);
		messenger = new Messenger(undefined, undefined, mSource);
	});

	it('should subscribe to another messenger', function() {
		messenger.on('', logPost);

		function logPost(msg, data) {
			posted.push({ msg: msg, data: data });
		}

		var posted = [];
		internalMessenger.postMessage('', { test: 1 });

		assert.equal(posted.length, 1);
		assert.deepEqual(posted, [{ msg: '', data: { test: 1 } }]);
	});

	// TODO: this test fails currently
	it.skip('should prevent duplicate messages when pattern subscription is present', function() {
		messenger.on(/.*/, function() {});
		messenger.on('a', logPost);

		function logPost(msg, data) {
			posted.push({ msg: msg, data: data });
		}

		var posted = [];
		internalMessenger.postMessage('a', { test: 2 });

		assert.equal(posted.length, 1);
		assert.deepEqual(posted, [{ msg: 'a', data: { test: 2 } }]);
	});
});
