'use strict';

require('mocha');
var assert = require('assert');
var changes = require('./');

describe('vinyl-changes-stream', function() {
  this.timeout(10000);

  it('should export a function', function() {
    assert.equal(typeof changes, 'function');
  });

  it('should throw an error when invalid args are passed', function(cb) {
    try {
      changes();
      cb(new Error('expected an error'));
    } catch (err) {
      assert(err);
      assert.equal(err.message, 'expected "options.db" to be set');
      cb();
    }
  });

  it('should allow passing a string as the database', function(cb) {
    changes('https://skimdb.npmjs.com/registry')
      .once('error', cb)
      .once('data', function(file) {
        assert.equal(typeof file, 'object');
        assert.equal(typeof file.id, 'string');
        assert.equal(typeof file.seq, 'number');
        assert.equal(typeof file.json, 'object');
        this.emit('end');
      })
      .on('end', cb);
  });

  it('should take options', function(cb) {
    changes({db: 'https://skimdb.npmjs.com/registry'})
      .once('error', cb)
      .once('data', function(file) {
        assert.equal(typeof file, 'object');
        assert.equal(typeof file.id, 'string');
        assert.equal(typeof file.seq, 'number');
        assert.equal(typeof file.json, 'object');
        this.emit('end');
      })
      .on('end', cb);
  });

  it('should start from the specified seq', function(cb) {
    changes({db: 'https://skimdb.npmjs.com/registry', since: 123456})
      .once('error', cb)
      .once('data', function(file) {
        assert.equal(typeof file, 'object');
        assert.equal(typeof file.id, 'string');
        assert.equal(typeof file.seq, 'number');
        assert.equal(typeof file.json, 'object');
        assert(file.seq > 123456, 'expected file.seq to be greater than 123456');
        this.emit('end');
      })
      .on('end', cb);
  });

  it('should limit the amount of files returned', function(cb) {
    var count = 0;
    changes({db: 'https://skimdb.npmjs.com/registry', limit: 3})
      .once('error', cb)
      .on('data', function() {
        count++;
      })
      .on('end', function() {
        assert.equal(count, 3);
        cb();
      });
  });
});
