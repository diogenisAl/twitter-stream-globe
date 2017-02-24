var sentiment = require('sentiment');
var Twit = require('twit');
var Pubnub = require('pubnub');
var fs = require('fs');
var nconf = require('nconf');

nconf.file({ file: 'config.json' }).env();

TweetPublisher = { };

var twitter = TweetPublisher.twitter = new Twit({
	consumer_key: nconf.get('kn77pOKSigcogXMcPIeKwnAOy'),
	consumer_secret: nconf.get('HnCBrojfdSPBTIASgFMmuohMHuJf8YFFbCU59U35aCFapo8e7W'),
	access_token: nconf.get('T821714904994422784-j5nbhwEjjDVujS9FgxJF1bDKCCAjEZu'),
	access_token_secret: nconf.get('1Wi2GCjeruW3dSuWZkQkpA1B0XIYWfqD1H2gsXQJzWvyg')
});

var pubnub = TweetPublisher.pubnub = Pubnub({
	publish_key: nconf.get('pub-c-b0f9dbbe-9f61-42e3-a2c6-45a1f73e42ce'),
	subscribe_key: nconf.get('sub-c-4cc6c66c-de4d-11e6-8652-02ee2ddab7fe')
});

var stream, cachedTweet, publishInterval;

/**
 * Starts Twitter stream and publish interval
 */
TweetPublisher.start = function () {

	var response = { };

	// If the stream does not exist create it
	if (!stream) {

		// Connect to stream and filter by a geofence that is the size of the Earth
		stream = twitter.stream('statuses/filter', { locations: '-180,-90,180,90' });

		// When Tweet is received only process it if it has geo data
		stream.on('tweet', function (tweet) {	
			// calculate sentiment with "sentiment" module
			tweet.sentiment = sentiment(tweet.text);

			// save the Tweet so that the very latest Tweet is available and can be published
			cachedTweet = tweet
		});

		response.message = 'Stream created and started.'
	}
	// If the stream exists start it
	else {
		stream.start();
		response.message = 'Stream already exists and started.'
	}
	
	// Clear publish interval just be sure they don't stack up (probably not necessary)
	if (publishInterval) {
		clearInterval(publishInterval);
	}

	// Only publish a Tweet every 100 millseconds so that the browser view is not overloaded
	// This will provide a predictable and consistent flow of real-time Tweets
	publishInterval = setInterval(function () {
		if (cachedTweet) {
			publishTweet(cachedTweet);
		}
	}, 100); // Adjust the interval to increase or decrease the rate at which Tweets sent to the clients

	return response;
}

/**
 * Stops the stream and publish interval
 **/
TweetPublisher.stop = function () {

	var response = { };

	if (stream) {
		stream.stop();
		clearInterval(publishInterval);
		response.message = 'Stream stopped.'
	}
	else {
		response.message = 'Stream does not exist.'
	}

	return response;
}

var lastPublishedTweetId;

/**
 * Publishes Tweet object through PubNub to all clients
 **/
function publishTweet (tweet) {

	if (tweet.id == lastPublishedTweetId) {
		return;
	}
	
	lastPublishedTweetId = tweet.id;

	pubnub.publish({
		post: false,
		channel: 'tweet_stream',
		message: tweet,
		callback: function (details) {
			// success
		}
	});
}

module.exports = TweetPublisher;
