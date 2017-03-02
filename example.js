'use strict';

var through = require('through2');
var changes = require('./');

// get the changes from the npm registry
var options = {
  db: 'https://skimdb.npmjs.com/registry',
  // since is the seq number to start after
  since: 1283832,
  // only return 10 changes
  // this will cause the stream to end once 10 changes have passed through
  limit: 10
};

changes(options)
  .on('current', function(seq) {
    console.log('caught up to the current update', seq);
  })
  .on('error', console.error)
  .pipe(through.obj(function(file, enc, next) {
    console.log(file.seq, file.id);
    next(null, file);
  }))
  .on('error', console.error)
  // pull the data through so the stream doesn't stop
  .on('data', function() {})
  .on('end', function() {
    console.log('done');
  })
