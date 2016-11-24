'''
/*
 * Copyright 2010-2016 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 *  http://aws.amazon.com/apache2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */
 '''

from AWSIoTPythonSDK.MQTTLib import AWSIoTMQTTClient
import sys
import logging
import time
import getopt
import json
import random
import geohash
from sense_hat import SenseHat

location = "London"

city = [ 
    ("London",51.507351,-0.127758),
    ("Las Vegas",36.169941,-115.139830),
    ("New York",40.712784,-74.005941),
    ("Singapore",1.352083,103.819836),
    ("Sydney",-33.867487,151.206990),
    ("Paris",48.856614,2.352222),
    ("Seattle",47.606209,-122.332071),
    ("San Francisco",37.774929,-122.419416),
    ("Montreal",45.501689,-73.567256),
    ("Rio De Janeiro",-22.906847,-43.172896),
    ("Beijing",39.904211,116.407395),
    ("Moscow",55.755826,37.617300),
    ("Buenos Aires",-34.603684,-58.381559),
    ("New Dehli",28.613939,77.209021),
    ("Cape Town",-33.924869,18.424055),
    ("Lagos",6.524379,3.379206),
    ("Munich",48.135125,11.581981),
    ("Milan",45.464211,9.191383),
    ("Rome",41.890251,12.492373),
    ("Cambridge",52.205337,0.121816),
    ("Warsaw",52.233333,21.016667)
];

sense = SenseHat()

# Custom MQTT message callback
def customCallback(client, userdata, message):
    logger.debug("Received a new message: ")
    logger.debug(message.payload)
    logger.debug("from topic: ")
    logger.debug(message.topic)

# Usage
usageInfo = """Usage:

Use certificate based mutual authentication:
python basicPubSub.py -e <endpoint> -r <rootCAFilePath> -c <certFilePath> -k <privateKeyFilePath>

Use MQTT over WebSocket:
python basicPubSub.py -e <endpoint> -r <rootCAFilePath> -w

Type "python basicPubSub.py -h" for available options.
"""
# Help info
helpInfo = """-e, --endpoint
    Your AWS IoT custom endpoint
-r, --rootCA
    Root CA file path
-c, --cert
    Certificate file path
-k, --key
    Private key file path
-w, --websocket
    Use MQTT over WebSocket
-h, --help
    Help information


"""

# Read in command-line parameters
useWebsocket = False
host = ""
rootCAPath = ""
certificatePath = ""
privateKeyPath = ""
try:
    opts, args = getopt.getopt(sys.argv[1:], "hwe:k:c:r:", ["help", "endpoint=", "key=","cert=","rootCA=", "websocket"])
    if len(opts) == 0:
        raise getopt.GetoptError("No input parameters!")
    for opt, arg in opts:
        if opt in ("-h", "--help"):
            print(helpInfo)
            exit(0)
        if opt in ("-e", "--endpoint"):
            host = arg
        if opt in ("-r", "--rootCA"):
            rootCAPath = arg
        if opt in ("-c", "--cert"):
            certificatePath = arg
        if opt in ("-k", "--key"):
            privateKeyPath = arg
        if opt in ("-w", "--websocket"):
            useWebsocket = True
except getopt.GetoptError:
    print(usageInfo)
    exit(1)

# Missing configuration notification
missingConfiguration = False
if not host:
    print("Missing '-e' or '--endpoint'")
    missingConfiguration = True
if not rootCAPath:
    print("Missing '-r' or '--rootCA'")
    missingConfiguration = True
if not useWebsocket:
    if not certificatePath:
        print("Missing '-c' or '--cert'")
        missingConfiguration = True
    if not privateKeyPath:
        print("Missing '-k' or '--key'")
        missingConfiguration = True
if missingConfiguration:
    exit(2)

# Configure logging
logger = None
if sys.version_info[0] == 3:
    logger = logging.getLogger("core")  # Python 3
else:
    logger = logging.getLogger("AWSIoTPythonSDK.core")  # Python 2
logger.setLevel(logging.DEBUG)
streamHandler = logging.StreamHandler()
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
streamHandler.setFormatter(formatter)
logger.addHandler(streamHandler)

# Init AWSIoTMQTTClient
myAWSIoTMQTTClient = None
if useWebsocket:
    myAWSIoTMQTTClient = AWSIoTMQTTClient("basicPubSub", useWebsocket=True)
    myAWSIoTMQTTClient.configureEndpoint(host, 443)
    myAWSIoTMQTTClient.configureCredentials(rootCAPath)
else:
    myAWSIoTMQTTClient = AWSIoTMQTTClient("basicPubSub")
    myAWSIoTMQTTClient.configureEndpoint(host, 8883)
    myAWSIoTMQTTClient.configureCredentials(rootCAPath, privateKeyPath, certificatePath)

# AWSIoTMQTTClient connection configuration
myAWSIoTMQTTClient.configureAutoReconnectBackoffTime(1, 32, 20)
myAWSIoTMQTTClient.configureOfflinePublishQueueing(-1)  # Infinite offline Publish queueing
myAWSIoTMQTTClient.configureDrainingFrequency(2)  # Draining: 2 Hz
myAWSIoTMQTTClient.configureConnectDisconnectTimeout(10)  # 10 sec
myAWSIoTMQTTClient.configureMQTTOperationTimeout(5)  # 5 sec

# Connect and subscribe to AWS IoT
subscribe_topic = "myapp/+/avg/+"
myAWSIoTMQTTClient.connect()
myAWSIoTMQTTClient.subscribe(subscribe_topic, 1, customCallback)
time.sleep(2)

# Publish to the sensors' topics in a loop forever
while True:
    for sensor_type in [ ("temperature", (-10, 40) ), ( "humidity", (30, 90) ) ]:
        if random.random() < 0.5:
            city_num = random.randint(0,len(city) - 1)
            (device_name, latitude, longitude) = city[city_num]
        else:
            device_name = "Random"
            latitude = random.uniform(-80, 80)
            longitude = random.uniform(-180, 180)
        (sensor_name, (min_value, max_value)) = sensor_type
        message_data = {}
        if device_name == location:
            if sensor_type == "temperature":
                message_data["sensor_value"] = sense.get_temperature()
            else:
                message_data["sensor_value"] = sense.get_humidity()
            sense.show_message(location)
        else:
            message_data["sensor_value"] = min_value + (max_value - min_value) * random.random()
               
        message_data["latitude"] = latitude
        message_data["longitude"] = longitude
        message_data["geohash"] = geohash.encode(latitude, longitude)
        message_data["geohash_uint64"] = geohash.encode_uint64(latitude, longitude)
        message_json = json.dumps(message_data)
        publish_topic = "myapp/" + device_name + "/sensor/" + sensor_name
        logger.debug(publish_topic + " -> " + message_json)
        myAWSIoTMQTTClient.publish(publish_topic, message_json, 1)
    time.sleep(0.2)

