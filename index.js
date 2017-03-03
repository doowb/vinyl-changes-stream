'use strict';

var File = require('vinyl');
var through = require('through2');
var extend = require('extend-shallow');
var superagent = require('superagent');
var Changes = require('changes-stream');
var PluginError = require('plugin-error');

/**
 * Create a stream of [vinyl][] files from a couchdb changes stream provided by [changes-stream][].
 * Files contain a stringified `change` object on `file.contents` and the raw JSON object on `file.json`.
 * `file.id` and `file.seq` are also populated with the `.id` and `.seq` from the `change` object.
 *
 * ```js
 * changes('https://skimdb.npmjs.com/registry')
 *  .on('current', function(seq) {
 *    console.log('caught up to the current update', seq);
 *  })
 *  .pipe(through.obj(function(file, enc, next) {
 *    console.log(file.seq, file.id);
 *    //=> 123456 'some-package-name'
 *    next(null, file);
 *  }));
 * ```
 *
 * @name changes
 * @param  {Object|String} `options` Options object for passing additional options to [changes-stream][]. If passed a string, that will be used for the `db`.
 * @param  {String} `options.db` The couchdb database to get changes from.
 * @param  {Number} `options.since` Optionally specify the seq id to start from. This seq id will not be included in the stream.
 * @param  {Number} `options.limit` Optionally specify a limit to how many changes are returned. Once the limit has been met, the stream will end.
 * @emits  {Number} `current` When the stream has caught up to the current seq, the seq will be emitted.
 * @return {Stream} Returns a stream to be used in a pipeline
 * @api public
 */

module.exports = function changes(options) {
  var defaults = {include_docs: true};
  if (typeof options === 'string') {
    options = {db: options};
  }

  var opts = extend(defaults, options);
  if (!opts.db) {
    throw new Error('expected "options.db" to be set');
  }

  var cache = {};
  var updateSeq;
  var count = 0;
  var limit = typeof opts.limit === 'undefined' ? -1 : opts.limit;
  var stream = new Changes(opts);

  return stream.pipe(through.obj(function(change, enc, next) {
    var self = this;
    if (updateSeq && cache[opts.db]) {
      handleChange();
      return;
    }

    getSeq(opts.db, function(err, seq) {
      if (err) return next(toError(err));
      updateSeq = cache[opts.db] = seq;
      handleChange();
    });

    function handleChange() {
      try {
        count++;
        if (change.doc) {
          self.push(toVinyl(change));
        }

        if (change.seq >= updateSeq) {
          updateSeq = change.seq;
          self.emit('current', updateSeq);
        }

        if (limit !== -1 && count >= limit) {
          stream.destroy();
          return;
        }
      } catch (err) {
        next(toError(err));
        return;
      }
      next();
    }
  }));
};

function toError(err) {
  return new PluginError('vinyl-changes-stream', err);
}

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
