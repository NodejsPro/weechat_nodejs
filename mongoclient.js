var db;
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var config = require('config');

// Use connect method to connect to the Server
MongoClient.connect(config.get('dbURL'), function(err, mongodb) {
    assert.equal(null, err);
    console.log("Connected correctly to server");
    db = mongodb;
});

var collection = function( name ) {
    return db.collection( name );
};

module.exports = collection;