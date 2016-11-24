## Serverless IoT Analytics

A demo environment where temperature and humidity sensors,
distributed worldwide, and emulated by a Raspberry Pi,
are processed using AWS IoT, stored to an S3 bucket using a [Kinesis Firehose](https://aws.amazon.com/kinesis/firehose/) delivery stream,
aggregated by location (using [geohashes](https://en.wikipedia.org/wiki/Geohash)) and time (in 30 seconds tumbling time windows)
via a [Kinesis Analytics](https://aws.amazon.com/kinesis/analytics/) application, and the output [Kinesis Stream](https://aws.amazon.com/kinesis/streams/) is process by a [Lambda](https://aws.amazon.com/lambda/)
function publishing the information back on the AWS IoT platform, in specific
[MQTT](http://mqtt.org) topics where a static web page, using client-side JavaScript, is
subscribing via secure WebSockets to display the aggregated data on a world map.

![architecture](https://danilop.s3.amazonaws.com/Images/ServerlessIoTAnalytics.png)

You can configure a real location (where the Raspeberry Pi is located)
to use temperature and humidity from the sensors of a Sense HAT.

You can easily remove dependency on a Raspberry Pi and run your (almost) everywhere.

## License

Copyright (c) 2016 Danilo Poccia, http://danilop.net

This code is licensed under the The MIT License (MIT). Please see the LICENSE file that accompanies this project for the terms of use.

## Installation

You need the AWS IoT Device SDK for Python and a geohash module to run the demo:

    pip install AWSIoTPythonSDK python-geohash

Check and replace the required configurations in the source code.

I am planning to write down a more detailed installation guide in the (near?) future.
