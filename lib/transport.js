'use strict';

//var Mailgun = require('mailgun-js');
var mandrill = require('mandrill-api/mandrill');

var packageData = require('../package.json');

module.exports = function (options) {
	return new MandrillTransport(options);
};

function MandrillTransport(options) {
  this.name = 'Mandrill';
  this.version = packageData.version;

  options = options || {};

  this.async = options.async || false;
  this.tags = options.tags || [];
  this.metadata = options.metadata || {};
  this.recipient_metadata = options.recipient_metadata || [];
  this.preserve_recipients = options.preserve_recipients;
  if (this.preserve_recipients === undefined) {
    this.preserve_recipients = true;
  }

  var auth = options.auth || {};
  this.template = options.template || packageData.name;
  this.mandrillClient = new mandrill.Mandrill(auth.apiKey);
}


MandrillTransport.prototype.send = function send(mail, callback) {
	console.log('Sending with mandrill...');
	this.generateMessage(mail.message.createReadStream(), (function(err, raw) {
			if (err) {
					return typeof callback === 'function' && callback(err);
			}
			this.sendMessage(mail, raw, callback);
	}).bind(this));
};

function arrToAddressString(arr) {
	if ( typeof arr === 'string' ) { return arr };
	arr.map(function(addr){
		var a = '<'+add.address+'>';
		if ( addr.name ) {
			a = '"'+addr.name+'" '+a;
		}
		return a;
	}).join(', ');
}

/**
 * <p>Compiles a BuildMail message and forwards it to handler that sends it.</p>
 *
 * @param {Object} mail Mail object
 * @param {Function} callback Callback function to run when the sending is completed
 */
MandrillTransport.prototype.sendMessage = function(mail, raw, callback) {
	//new Buffer(raw, 'utf-8') // required
	callback = callback || function(){};
	var md = mail.data;

	var from = Array.isArray(md.from) ? md.from[0] : md.from;
	var to = md.to.split(/\s*,\s*/);

	this.mandrillClient.messages.sendRaw({
		"raw_message": raw,
		"from_email": from.address,
		"from_name": from.name,
		"to": to,
		"async": false,
		"ip_pool": 'Main Pool',
		"return_path_domain": null
	}, function(result) {
		callback(null, {
			envelope: mail.data.envelope || mail.message.getEnvelope()
		});

	    /*
	    [{
	            "email": "recipient.email@example.com",
	            "status": "sent",
	            "reject_reason": "hard-bounce",
	            "_id": "abc123abc123abc123abc123"
	        }]
	    */
	}, function(err) {
		if ( err ) {
			console.log('A mandrill error occurred: ' + err.name + ' - ' + err.message);
			return callback(err);
		}
	});

};


/**
 * <p>Compiles the BuildMail object to a string.</p>
 *
 * <p>SES requires strings as parameter so the message needs to be fully composed as a string.</p>
 *
 * @param {Object} mailStream BuildMail stream
 * @param {Function} callback Callback function to run once the message has been compiled
 */

MandrillTransport.prototype.generateMessage = function(mailStream, callback) {
		var chunks = [];
		var chunklen = 0;

		mailStream.on('data', function(chunk) {
				chunks.push(chunk);
				chunklen += chunk.length;
		});

		mailStream.on('end', function() {
				callback(null, Buffer.concat(chunks, chunklen).toString());
		});
};
