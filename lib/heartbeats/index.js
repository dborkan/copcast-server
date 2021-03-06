/**
 * Created by brunosiqueira on 13/10/15.
 */
var express = require('express'),
  app = module.exports = express(),
  db = require('./../db'),
  auth = require('./../auth'),
  config = require('./../config');

app.post("/heartbeats", auth.ensureUser, function (req, res) {

  var location = req.body.location;
  var battery = req.body.battery;

  req.user.lastLat = location.lat;
  req.user.lastLng = location.lng;
  req.user.lastLocationUpdateDate = location.date = new Date();
  req.user.save();
  var locationObj = db.location.build({
    lat: location.lat,
    lng: location.lng,
    date: location.date,
    accuracy: location.accuracy,
    satellites: location.satellites,
    provider: location.provider,
    bearing: location.bearing,
    speed: location.speed,
    userId: req.user.id
  });

  locationObj.save();

  if (battery) {
    db.battery.findOne({where: {userId: req.user.id, date: battery.date}}).then(function (b) {
      if (!b) {
        var batteryObj = db.battery.build({
          batteryPercentage: battery.batteryPercentage,
          batteryHealth: battery.batteryHealth,
          date: battery.date,
          plugged: battery.plugged,
          temperature: battery.temperature,
          userId: req.user.id
        });

        batteryObj.save();
      }
    });

  }

  var connectedSockets = Object.keys(app.get('sockets').connected);
  for (var i = 0; i < connectedSockets.length; i++) {
    var socket = app.get('sockets').connected[connectedSockets[i]];
    if (socket._group.id == req.user.groupId || socket._group.isAdmin) {
      socket.emit('users:heartbeat', {
        id: req.user.id, name: req.user.name, username: req.user.username,
        location: location, battery: battery,
        streamUrl: "rtmp://"+config.wowza.ipAddress+":"+config.wowza.port+config.wowza.path+req.user.id+".stream"
      });
    }
  }
  req.body = [req.body];
  res.sendStatus(200);
});
