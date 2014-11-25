/*
 * StratifiedJS 'nodejs/stream' module
 * Stratified helpers for dealing nodejs's async streams
 *
 * Part of the Stratified JavaScript Standard Module Library
 * Version: '0.20.0-development'
 * http://onilabs.com/stratifiedjs
 *
 * (c) 2011 Oni Labs, http://onilabs.com
 *
 * This file is licensed under the terms of the MIT License:
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 */
/**
  @module    nodejs/stream
  @summary   Stratified helpers for dealing with [nodejs's async streams](http://nodejs.org/api/stream.html)
  @home      sjs:nodejs/stream
  @hostenv   nodejs
  @desc
    ### Warning: Asynchronous stream errors

    NodeJS streams can have wildly different behaviours depending on how they're implemented.

    In particular, authors of most streams don't expect the on-demand style of reading/writing that
    StratifiedJS allows, where chunks are read / written explicitly, rather than being triggered
    by one or more event handlers which are permanently attached to the stream.

    One side effect of this is that stream implementations will often emit `error`
    events _at any time_, even when nobody is reading from or writing to the stream.

    For this reason, it's best to use the high-level constructs in this module
    which operate on an entire stream (e.g. [::pump] and [::contents]).
    Calling [::read] or [::write] in a loop to process individual chunks is
    **prone to triggering uncaught exceptions**, and should be **avoided wherever possible**.

    ### Warning: Backwards compatility

    The nodejs stream API changed significantly in nodejs 0.10. The pre-0.10 API
    is not supported by StratifiedJS.

    If you need to use a third-party stream which implements the old API,
    you can create a wrapper (which supports the new API) using:

        var Readable = require('nodejs:stream').Readable;
        var newStream = new Readable().wrap(oldStream);

*/

var sys = require('builtin:apollo-sys');
if (sys.hostenv != 'nodejs')
  throw new Error('The nodejs/stream module only runs in a nodejs environment');

var nodeVersion = process.versions.node.split('.');
@ = require(['../sequence', '../object', '../array', '../event', '../cutil']);
@assert = require('../assert');

/**
  @function read
  @deprecated See the warning about asynchronous errors in the [./stream::] module description.
  @summary  Read a single piece of data from `stream`.
  @param    {Stream} [stream] the stream to read from
  @param    {optional Number} [length] the maximum number of bytes to read
  @return   {String|Buffer}
  @desc
    This function calls `stream.read()`.

    If no data is currently available, it waits for the
    `readable` event on the stream, and then returns one
    piece of data.

    Returns `null` when the stream has ended and there is no
    more data.

    If stream emits `error`, the error is thrown.
*/
exports.read = function readStream(stream, size) {
  waitfor {
    throw stream .. @wait('error');
  } or {
    var chunk = stream.read(size);
    if(chunk === null) {
      // wait for chunk
      stream .. @wait(['readable', 'end']);
      chunk = stream.read(size);
    }
    return chunk
  }
}

/**
  @function readAll
  @summary  Read and return the entire contents of `stream` as a single buffer or string.
  @param    {Stream} [stream] the stream to read from
  @param    {optional String} [encoding]
  @return   {String|Buffer}
  @desc
    Repeatedly calls `read` until the stream ends. This function
    should not be used on infinite or large streams, as it will buffer the
    entire contents in memory.
*/
exports.readAll = function(stream, encoding) {
  var result = sys.streamContents(stream);
  if(encoding || (result.length > 0 && !Buffer.isBuffer(result[0]))) {
    return result.join('');
  }
  return Buffer.concat(result);
};


/**
  @function write
  @deprecated See the warning about asynchronous errors in the [./stream::] module description.
  @summary  Write data to the `dest` stream.
  @param    {Stream} [dest] the stream to write to
  @param    {String|Buffer} [data] the data to write
  @param    {optional String} [encoding] the encoding, if `data` is a string
  @desc
    If the data cannot be written immediately, this function
    will wait for a `drain` event on the `dest` stream before
    returning.

    Any additional arguments (after `data`) are passed through
    to the underlying `write` function.
*/

// like exports.write, but without error listener
var _write = function(dest, data /*, ... */) {
  var wrote = dest.write.apply(dest, Array.prototype.slice.call(arguments, 1));
  if(!wrote) {
    dest .. @wait('drain');
  }
};

exports.write = function(dest, data/*, ...*/) {
  waitfor {
    _write.apply(null, arguments);
  } or {
    throw dest .. @wait('error');
  }
};

/**
  @function contents
  @summary  Return a [sequence::Stream] of chunks of data from a nodejs stream
  @param    {Stream} [dest] the stream to read from
  @param    {optional String} [encoding]
  @return   {sequence::Stream} A sequence of data chunks (String or Buffer)
  @desc
    The return value will be a sequence of Strings if `encoding` is provided,
    otherwise the elements will be whatever data type the underlying stream
    emits.

    The returned stream will end only when the underlying nodejs stream
    ends (or emits an error).
*/
exports.contents = function(stream, encoding) {
  if(encoding) stream.setEncoding(encoding);
  return @Stream(function(emit) {
    sys.streamContents(stream, emit);
  });
}

/**
  @function end
  @summary  End the stream with a final chunk of data.
  @param    {Stream} [dest] the stream to write to
  @param    {optional String|Buffer} [data] the data to write
  @param    {optional String} [encoding] the encoding, if `data` is a string
  @desc
    This function ends the stream. It waits for the stream to actually
    be done before returning.
*/
var _end = function(dest) {
  waitfor {
    dest .. @wait(['close','finish']);
  } and {
    dest.end();
  }
};

exports.end = function(dest, data, encoding) {
  // we might like to use dest.end(data, encoding, resume)
  // but even core nodejs core disregard that and hang
  // the process (e.g https://github.com/joyent/node/issues/8759)
  if (data) {
    exports.write(dest, data, encoding);
  }
  waitfor {
    throw dest .. @wait('error');
  } or {
    _end(dest);
  }
}


/**
  @function pump
  @summary  Keep writing data from `src` into `dest` until `src` ends.
  @param    {Stream|sequence::Stream} [src] the source stream
  @param    {String} [dest] the destination stream
  @param    {optional Settings} [opts]
  @setting  {Boolean} [end=true] end `dest` after writing
  @return   {Stream} `dest`
  @desc
    This function will not return until the `src` stream has ended,
    and all data has been written to `dest`.

    If `end` is not `false`, `dest` it will then call [::end] on `dest`.
*/
exports.pump = function(src, dest, fn_or_opts) {
  var fn, opts;
  if (typeof(fn_or_opts) === 'function') {
    fn = fn_or_opts;
    opts = null;
  } else {
    fn = null;
    opts = fn_or_opts;
  }
  opts = opts || {};
  //TODO: make default
  //var end = opts.end !== false;
  var end = opts.end === true;

  if (!(@isArrayLike(src) || @isStream(src))) src = exports.contents(src);
 
  // old API, allowed a transform function
  if(fn) src = src .. @transform(fn);

  waitfor {
    throw dest .. @wait('error');
  } or {
    src .. @each {|data|
      _write(dest, data);
    }
    if(end) _end(dest);
  } 
  return dest;
};


/**
  @class    ReadableStream
  @summary  A readable in-memory Stream
  @desc
    This class is similar to StringIO in other languages,
    it allows the user to present a `String` or `Buffer` as if it were a nodejs `Stream`.

  @constructor ReadableStream
  @param    {String|Buffer} [data]
  @param    {optional String} [encoding] Encoding (required if `data` is a String)
*/

var defaultEncoding = 'utf-8';

var {Readable, Writable} = require('stream');
var ReadableStream = exports.ReadableStream = function(data, encoding) {
  Readable.call(this, {encoding:encoding});
  this.data = data;
  this.encoding = encoding;
};

require('util').inherits(ReadableStream, Readable);

ReadableStream.prototype.toString = function() {
  return "#<ReadableStream>";
};
ReadableStream.prototype._read = function() {
  this.push(this.data, this.encoding);
  this.data = null;
};

/**
   @class    ReadableStringStream
   @inherit  ::ReadableStream
   @summary  A [::ReadableStream] which defaults to `utf-8` encoding.

   @constructor ReadableStream
   @param {String} [data]
   @param {optional String} [encoding="utf-8"]
*/
exports.ReadableStringStream = function(data, enc) {
  // ignore old API, "start paused"
  if (enc === true) enc = null;

  return new ReadableStream(data, enc || defaultEncoding);
}


/**
   @class    WritableStream
   @summary  A writable in-memory Stream wrapping a single String or Buffer.
   @desc
     This class wraps a `String` or `Buffer` with nodejs `Writable Stream` interface.

     The data written to the stream can be retrieved with
     [::WritableStream::contents].

     If `encoding` is passed, the resulting data will be a String. Otherwise,
     it will be a Buffer.

   @constructor WritableStream
   @param {optional String} [encoding]

   @function WritableStream.contents
   @summary  Return the data that has been written to the stream.
   @return   {String|Buffer}
*/

var WritableStream = exports.WritableStream = function(encoding) {
  this.encoding = encoding;
  Writable.call(this, {encoding:encoding});
  this._data = [];
};

require('util').inherits(WritableStream, Writable);

WritableStream.prototype._write = function(data, _enc, cb) {
  this._data.push(data);
  cb();
};

WritableStream.prototype.contents = function() {
  var data = Buffer.concat(this._data);
  if (this.encoding) return data.toString(this.encoding);
  return data;
};

/**
   @class    WritableStringStream
   @inherit  ::WritableStream
   @summary  A [::WritableStream] which defaults to `utf-8` encoding.

   @constructor WritableStringStream
   @param {optional String} [encoding="utf-8"]

   @variable WritableStringStream.data
   @summary  Data that has been written to the stream (String or Buffer)
   @desc
     This is implemented as a property getter for backwards compatibility.
     For clarity, new code should use [::WritableStream::contents].
*/
exports.WritableStringStream = function(enc) {
  var rv = new WritableStream(enc || defaultEncoding);
  // for backwards compatibility
  Object.defineProperty(rv, 'data', {
    get: WritableStream.prototype.contents,
  });
  return rv;
};


/**
  @class DelimitedReader
  @summary A wrapper around a stream for reading delimited data

  @function DelimitedReader
  @param {Stream} [stream]

  @function DelimitedReader.readUntil
  @param {String|Number} [separator] charater or byte to read until
  @summary Read from the underlying `stream` until reaching `separator` or EOF
  @desc
    This will keep reading (and buffering) from the underlying stream until
    `separator` or EOF. Any additional data (after `separator`) which has been
    read from the underlying stream will be buffered internally
    (for use by a future call to [::DelimitedReader::readUntil]
    or [::DelimitedReader::read]).

  @function DelimitedReader.read
  @summary Read the next available data from the underlying stream
  @desc
    This does the same thing as calling [::read] on the underlying stream,
    except that it may return buffered data which was read (but not rerurned) by
    a previous call to [::DelimitedReader::readUntil].
*/
var DelimitedReader = function(stream) {
  var pending = [];
  var error = @Condition();
  stream.on('error', function(e) { error.set(e); });
  var convertSentinel = null;
  var ended = false;
  var _read = function() {
    waitfor {
      throw error.wait();
    } or {
      if (ended) return null;
      var buf = exports.read(stream);
      if (buf === null) ended = true;
      return buf;
    }
  };

  return {
    readUntil: function(ch) {
      // first, check `pending` buffer
      if (pending.length > 0) {
        var sentinel = convertSentinel(ch);
        @assert.eq(pending.length, 1, "multiple chunks pending");
        var buf = pending[0];
        for (var idx=0; idx<buf.length; idx++) {
          if(buf[idx] == sentinel) {
            // Reached sentinel. Return everything in `pending` up until this point:
            var bufReturn = buf.slice(0, idx+1);
            var bufPending = buf.slice(idx+1);
            pending = bufPending.length > 0 ? [bufPending] : [];
            return bufReturn;
          }
        }
      }

      // not found in `pending`, check for new data...
      while(true) {
        var buf = _read();
        if (buf == null) {
          // reached end, with no sentinel in sight.
          // Return all pending data, or `null`
          if (pending.length == 0) return null;
          var rv = @join(pending);
          pending = [];
          return rv;
        }

        if (!convertSentinel) {
          // this is the first chunk read - determine whether we're
          // in Buffer or String mode
          if (Buffer.isBuffer(buf)) {
            convertSentinel = function(ch) {
              if (typeof(ch) == 'number') return ch;
              @assert.eq(Buffer.byteLength(ch), 1);
              return ch.charCodeAt(0);
            };
          } else {
            // stream is returning strings, so no conversion necessary
            convertSentinel = function(c) {
              @assert.eq(c.length, 1);
              return c;
            };
          }
        }

        var sentinel = convertSentinel(ch);

        for (var idx=0; idx<buf.length; idx++) {
          if(buf[idx] == sentinel) {
            // return the result, including pending chunks and terminal
            var rv = pending;
            pending = [buf.slice(idx+1)];
            rv.push(buf.slice(0, idx+1));
            return @join(rv)
          }
        }

        // didn't find sentinel in `buf`
        pending.push(buf);
      }
    },

    read: function() {
      if (pending.length> 0) {
        return pending.shift();
      }
      return _read();
    }
  }
  
};
exports.DelimitedReader = DelimitedReader;

/**
  @function lines
  @param    {Stream} [stream] the stream to read from
  @param    {optional String} [sep="\n"]
  @param    {optional String} [encoding="utf-8"]
  @return   {../sequence::Stream} A sequence of lines
  @summary  Return a [../sequence::Stream] of lines from a nodejs Stream
  @desc
    This function creates and calls a [::DelimitedReader]
    repeatedly with the given separator (`\n` by default)
    and generates a [../sequence::Stream] of the results.

    Each element in the returned stream will include the
    trailing `sep` character, except for the final element
    (which will be the end of the stream, whether it ends with
    `sep` or not).

    Multiple-character `sep` values are not supported.

    If `encoding` is passed, this function will call
    `stream.setEncoding(encoding)` before reading from the stream.

    If stream has no encoding (i.e it returns Buffer objects),
    `sep` will be treated as an ASCII byte.
*/
//TODO: convert this to a stream function, possibly in sequence?
exports.lines = function(stream, sep, encoding) {
  if (encoding) stream.setEncoding(encoding);
  var reader = DelimitedReader(stream);
  if(!sep) sep = '\n';
  return @Stream(function(emit) {
    var buf;
    while(true) {
      buf = reader.readUntil(sep);
      if (buf === null) break;
      emit(buf);
    }
  });
};
