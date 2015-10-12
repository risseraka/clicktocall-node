var path = require('path');
var express = require('express');
var morgan = require('morgan');
var bodyParser = require('body-parser');
var twilio = require('twilio');
var config = require("../config");

// Create a Twilio REST API client for authenticated requests to Twilio
var client = twilio(config.accountSid, config.authToken);

// Configure appplication routes
module.exports = function(app) {
  // Set Jade as the default template engine
  app.set('view engine', 'jade');

  // Express static file middleware - serves up JS, CSS, and images from the
  // "public" directory where we started our webapp process
  app.use(express.static(path.join(process.cwd(), 'public')));

  // Parse incoming request bodies as form-encoded
  app.use(bodyParser.urlencoded({
    extended: true
  }));

  // Use morgan for HTTP request logging
  app.use(morgan('combined'));

  // Home Page with Click to Call 
  app.get('/', function(request, response) {
    response.render('index');
  });

  // Handle an AJAX POST request to place an outbound call
  app.post('/call', function(request, response) {
    // This should be the publicly accessible URL for your application
    // Here, we just use the host for the application making the request,
    // but you can hard code it or use something different if need be
    var phoneNumber = encodeURIComponent(request.body.phoneNumber);
    var url = 'http://' + request.headers.host + '/outbound/' + phoneNumber;

    console.log('/call body:', request.body);

    // Place an outbound call to the user, using the TwiML instructions
    // from the /outbound route
    client.makeCall({
      to: request.body.callerId,
      from: config.twilioNumber,
      url: url,
      statusCallback: url + '/status/'
    }, function(err, message) {
      if (err) {
	console.log('/call err:', err);
        response.status(500).send(err);
      } else {
	console.log('/call message:', message);

        response.send({
          message: 'Thank you! We will be calling you shortly.'
        });
      }
    });
  });

  // Return TwiML instuctions for the outbound call
  app.post('/outbound/:phoneNumber', function(request, response) {
    // We could use twilio.TwimlResponse, but Jade works too - here's how
    // we would render a TwiML (XML) response using Jade
    console.log('/outbound body:', request.body);

    var phoneNumber = request.params.phoneNumber;

    console.log('/outbound call sid:', phoneNumber);

    response.type('text/xml');
    response.render('outbound', {
      callerId: request.body.To,
      action: '/outbound/' + encodeURIComponent(phoneNumber) + '/dialstatus',
      phoneNumber: phoneNumber
    });
  });

  app.post('/outbound/:phoneNumber/status', function(request, response) {
    console.log('/outbound/status body:', request.body);

    response.status(200).send();
  });

  app.post('/outbound/:phoneNumber/dialstatus', function(request, response) {
    console.log('/outbound/dialstatus body:', request.body);

    response.type('text/xml');
    response.render('dialstatus', {
      callerId: request.body.To,
      phoneNumber: request.params.phoneNumber
    });
  });

};


