'use strict';

console.log('Loading function');

// You must add your AWS_IOT_ENDPOINT as an environmental variable
// in your function configuration
var AWS_IOT_ENDPOINT = process.env.AWS_IOT_ENDPOINT;

var AWS = require('aws-sdk');
var iotdata = new AWS.IotData({endpoint: AWS_IOT_ENDPOINT});

exports.handler = (event, context, callback) => {
    //console.log('Received event:', JSON.stringify(event, null, 2));
    event.Records.forEach((record) => {
        // Kinesis data is base64 encoded so decode here
        const payload = new Buffer(record.kinesis.data, 'base64').toString('ascii');
        console.log('Decoded payload:', payload);
        const message = JSON.parse(payload);
        const sensor_name = message['SENSOR_NAME'];
        const publish_topic = 'myapp/avg/' + sensor_name;
        var params = {
            topic: publish_topic,
            payload: payload,
            qos: 1
        };
        iotdata.publish(params, function(err, data) {
            if (err) console.log('Error: ' + err, err.stack); // an error occurred
            else     console.log('Published: ' + data);       // successful response
        });
    });
    callback(null, `Successfully processed ${event.Records.length} records.`);
};
