// Initialize the Amazon Cognito credentials provider
AWS.config.region = '<REGION>'; // Region
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: '<IDENTITY_POOL_ID>',
});

var AWS_IOT_ENDPOINT = '<ENDPOINT>';

var result = document.getElementById('result');
var mymap = L.map('mapid').setView([40, 10], 2);
var myrectangles = {};
var mysensors = {};

AWS.config.credentials.get(function(err) {
    if (err) {
        console.log(err);
        return;
    }
    var requestUrl = SigV4Utils.getSignedUrl(
      AWS_IOT_ENDPOINT, AWS.config.region, AWS.config.credentials);
    initClient(requestUrl);
});

function getColorForRange(value, min, max) {
    if (value < (min + (max - min) / 3)) {
      // Blue
      color = 32 + Math.floor(224 * 3 * ((value - min) / (max - min)));
      return "rgb(0,0," + color + ")";
    } else if (value < (min + 2 * (max - min) / 3)) {
      // Green
      color = 32 + Math.floor(224 * 3 * ((value - min - (max - min) / 3) / (max - min)));
      return "rgb(0," + color + ",0)";
    } else {
      // Red
      color = 32 + Math.floor(224 * 3 * ((value - min -  2 * (max - min) / 3) / (max - min)));
      return "rgb(" + color + ",0,0)";
    }
}

function getColorForSensor(geohash, sensor_type, min, max) {
  if (mysensors[geohash] === undefined || !(sensor_type in mysensors[geohash])) {
    return "rgb(127,127,127)";
  } else {
    return getColorForRange(mysensors[geohash][sensor_type], min, max);
  }
}

function messageArrived(message) {
    try {
        console.log("msg arrived: " + message.destinationName + " -> " + message.payloadString);
        var tokens = message.destinationName.split('/');
        var payload = JSON.parse(message.payloadString);

        var place = tokens[1];
        var sensor_type = tokens[2];
        var sensor_avg = payload['AVG_SENSOR_VALUE'];
        var geohash = payload['GEOHASH'];

        if (mysensors[geohash] === undefined) {
          mysensors[geohash] = {};
        }
        mysensors[geohash][sensor_type] = sensor_avg;

        var bounds = Geohash.bounds(geohash);
        var rectangle = L.rectangle(
            [
                [bounds.sw.lat, bounds.sw.lon],
                [bounds.ne.lat, bounds.ne.lon]
            ], {
                color: getColorForSensor(geohash, "humidity", 30, 90),
                fillColor: getColorForSensor(geohash, "temperature", -10, 40),
                fillOpacity: 0.5,
                radius: 500
            });
        if (geohash in myrectangles) {
            myrectangles[geohash].remove();
        }
        myrectangles[geohash] = rectangle;
        rectangle.addTo(mymap);

    } catch (e) {
        console.log("error! " + e.stack);
    }
}

function initClient(requestUrl) {
    var clientId = String(Math.random()).replace('.', '');
    var client = new Paho.MQTT.Client(requestUrl, clientId);
    var connectOptions = {
        onSuccess: function() {
            console.log('connected');

            client.subscribe('myapp/avg/+');

            message = new Paho.MQTT.Message('{"id":"' + AWS.config.credentials.identityId + '"}');
            message.destinationName = 'myapp/browser/' + clientId;
            console.log(message);
            client.send(message);
        },
        useSSL: true,
        timeout: 3,
        mqttVersion: 4,
        onFailure: function() {
            console.error('connect failed');
        }
    };
    client.connect(connectOptions);

    client.onMessageArrived = messageArrived;

}

function initMap() {
    L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mymap);
}

function init() {
    // do setup stuff
    initMap();
}

function SigV4Utils() {}

SigV4Utils.getSignatureKey = function(key, date, region, service) {
    var kDate = AWS.util.crypto.hmac('AWS4' + key, date, 'buffer');
    var kRegion = AWS.util.crypto.hmac(kDate, region, 'buffer');
    var kService = AWS.util.crypto.hmac(kRegion, service, 'buffer');
    var kCredentials = AWS.util.crypto.hmac(kService, 'aws4_request', 'buffer');
    return kCredentials;
};

SigV4Utils.getSignedUrl = function(host, region, credentials) {
    var datetime = AWS.util.date.iso8601(new Date()).replace(/[:\-]|\.\d{3}/g, '');
    var date = datetime.substr(0, 8);

    var method = 'GET';
    var protocol = 'wss';
    var uri = '/mqtt';
    var service = 'iotdevicegateway';
    var algorithm = 'AWS4-HMAC-SHA256';

    var credentialScope = date + '/' + region + '/' + service + '/' + 'aws4_request';
    var canonicalQuerystring = 'X-Amz-Algorithm=' + algorithm;
    canonicalQuerystring += '&X-Amz-Credential=' + encodeURIComponent(credentials.accessKeyId + '/' + credentialScope);
    canonicalQuerystring += '&X-Amz-Date=' + datetime;
    canonicalQuerystring += '&X-Amz-SignedHeaders=host';

    var canonicalHeaders = 'host:' + host + '\n';
    var payloadHash = AWS.util.crypto.sha256('', 'hex')
    var canonicalRequest = method + '\n' + uri + '\n' + canonicalQuerystring + '\n' + canonicalHeaders + '\nhost\n' + payloadHash;

    var stringToSign = algorithm + '\n' + datetime + '\n' + credentialScope + '\n' + AWS.util.crypto.sha256(canonicalRequest, 'hex');
    var signingKey = SigV4Utils.getSignatureKey(credentials.secretAccessKey, date, region, service);
    var signature = AWS.util.crypto.hmac(signingKey, stringToSign, 'hex');

    canonicalQuerystring += '&X-Amz-Signature=' + signature;
    if (credentials.sessionToken) {
        canonicalQuerystring += '&X-Amz-Security-Token=' + encodeURIComponent(credentials.sessionToken);
    }

    var requestUrl = protocol + '://' + host + uri + '?' + canonicalQuerystring;
    return requestUrl;
};

init();
