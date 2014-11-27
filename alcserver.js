var express 		   = require('express'),
	app				   = express(),
	request			   = require('request'),
	alchURL			   = 'http://access.alchemyapi.com/calls/text/TextGetTextSentiment',
	alchKey			   = '',
	InfiniteLoop	   = require('infinite-loop'),
	il 				   = new InfiniteLoop(),
	AWS 			   = require('aws-sdk'),
    awsCredentialsPath = './aws.credentials.json',
    sqsQueueUrl 	   ='https://sqs.us-east-1.amazonaws.com/486347889594/Twittmap',
    snsTopicArn		   ='arn:aws:sns:us-east-1:486347889594:Twittmap',
    sqs,sns;

AWS.config.loadFromPath(awsCredentialsPath);
sqs = new AWS.SQS();
sns = new AWS.SNS();
var removeFromQueue = function(message) {
   sqs.deleteMessage({
      QueueUrl: sqsQueueUrl,
      ReceiptHandle: message.ReceiptHandle
   }, function(err, data) {
      // If we errored, tell us that we did
      err && console.log(err);
   });
};

// function receiveFromQueue(){
// 	sqs.receiveMessage({
// 	   QueueUrl: sqsQueueUrl,
// 	   MaxNumberOfMessages: 1, // how many messages do we wanna retrieve?
// 	   VisibilityTimeout: 60, // seconds - how long we want a lock on this job
// 	   WaitTimeSeconds: 3 // seconds - how long should we wait for a message?
// 	 }, function(err, data) {
// 	   // If there are any messages to get
// 	   if(err) console.log(err,err.stack);
// 	   if (data.Messages) {
// 	      // Get the first message (should be the only one since we said to only get one above)
// 	      var message = data.Messages[0],
// 	          body = JSON.parse(message.Body);
// 	      // Now this is where you'd do something with this message
// 	     // console.log(JSON.stringify(body));
// 	      sns.publish({
// 	      	Message: JSON.stringify(body),
// 	      	TopicArn: snsTopicArn
// 	      }, function(err, data) {
// 			  if (err) console.log(err, err.stack); // an error occurred
//   			  else     console.log(data);           // successful response
// 			});
// 	      //doSomethingCool(body, message);  // whatever you wanna do
// 	      // Clean up after yourself... delete this message from the queue, so it's not executed again
// 	      removeFromQueue(message);  // We'll do this in a second
// 	   }
// 	 });
// };

function receiveFromQueue(){
	sqs.receiveMessage({
	   QueueUrl: sqsQueueUrl,
	   MaxNumberOfMessages: 1, // how many messages do we wanna retrieve?
	   VisibilityTimeout: 60, // seconds - how long we want a lock on this job
	   WaitTimeSeconds: 3 // seconds - how long should we wait for a message?
	 }, function(err, data) {
	   // If there are any messages to get
	   if(err) console.log(err,err.stack);
	   if (data.Messages) {
	      // Get the first message (should be the only one since we said to only get one above)
	      var message = data.Messages[0],
	          body = JSON.parse(message.Body);
	      //body.test = 'damn';
	      request.post({url:alchURL, form:{apikey:alchKey,text:encodeURIComponent(body.text),outputMode:'json'}}, 
				function(err,result,resbody){
					if(err) console.log(err,err.stack);
					else {
						var score = JSON.parse(resbody);
						var sType = score.docSentiment;
						//var sTypeJson = JSON.parse(sType);
						//console.log(sType.type);
						//console.log(score);
						if(score.status=='OK') body.Sentiment = sType.type;
						else body.Sentiment = 'none';
						console.log(body.Sentiment);
						//console.log(JSON.parse(body.Sentiment.docSentiment));
						//console.log(body.text);
						sns.publish({
							Message: JSON.stringify(body),
							TopicArn: snsTopicArn}, 
							function(err, data) {
								if (err) console.log(err, err.stack); // an error occurred
								else     console.log(data);           // successful response
							});
		 			}	
				});
	      //doSomethingCool(body, message);  // whatever you wanna do
	      // Clean up after yourself... delete this message from the queue, so it's not executed again
	      removeFromQueue(message);  // We'll do this in a second
	   }
	 });
};

// request.post({url:alchURL, form:{apikey:alchKey,text:encodeURIComponent('really bad day'),outputMode:'json'}}, 
// 	function(err,result,body){
// 		if(err) console.log(err,err.stack);
// 		else {
// 			var score = JSON.parse(body);
// 		 	console.log(score);
// 		 }
// 	});
//receiveFromQueue();
il.add(receiveFromQueue).run();
// while(true){
// 	console.log("retrieving");
// 	receiveFromQueue();
// }