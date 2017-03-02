'use strict';

var File = require('vinyl');
var through = require('through2');
var superagent = require('superagent');
var Changes = require('changes-stream');

module.exports = function(options) {
  var defaults = {include_docs: true};
  if (typeof options === 'string') {
    options = {db: options};
  }

  var opts = Object.assign(defaults, options);
  if (!opts.db) {
    throw new Error('expected "options.db" to be set');
  }

  var cache = {};
  var updateSeq;
  var count = 0;
  var limit = typeof opts.limit === 'undefined' ? -1 : opts.limit;
  var changes = new Changes(opts);

  return changes.pipe(through.obj(function(change, enc, next) {
    var stream = this;
    if (updateSeq && cache[opts.db]) {
      handleChange();
      return;
    }

    getSeq(opts.db, function(err, seq) {
      if (err) return next(err);
      updateSeq = cache[opts.db] = seq;
      handleChange();
    });

    function handleChange() {
      try {
        count++;
        if (change.doc) {
          stream.push(toVinyl(change));
        }

        if (change.seq >= updateSeq) {
          updateSeq = change.seq;
          stream.emit('current', updateSeq);
        }

        if (limit !== -1 && count >= limit) {
          changes.destroy();
          return;
        }
      } catch (err) {
        next(err);
        return;
      }
      next();
    }
  }));
};

function toVinyl(change) {
  var file = new File({
    id: change.id,
    seq: change.seq,
    json: change,
    contents: new Buffer(JSON.stringify(change, null, 2)),
  });
  return file;
}

function getSeq(url, cb) {
  superagent.get(url, function(err, res) {
    if (err) return cb(err);
    cb(null, res.body && res.body.update_seq);
  });
}
