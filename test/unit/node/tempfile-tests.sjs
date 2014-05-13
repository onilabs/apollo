@ = require(['sjs:test/std', 'sjs:nodejs/rimraf']);
@stream = require('sjs:nodejs/stream');
@crypto = require('nodejs:crypto');
var tmp = require('sjs:nodejs/tempfile');

var tmproot = @path.join(require('nodejs:os').tmpDir(), "sjs-tests");

@TemporaryFile = function(opts, fn) {
  opts['base'] = tmproot;
  return tmp.TemporaryFile.apply(null, arguments);
};

@TemporaryDir = function(opts, fn) {
  opts['base'] = tmproot;
  return tmp.TemporaryDir.apply(null, arguments);
};

@context {||
  @test.beforeEach {|s|
    if (@fs.exists(tmproot)) {
      @rimraf(tmproot);
    }
    try {
      @fs.mkdir(tmproot);
    } catch(e) {
      if (e.code !== 'EEXIST') throw e;
    }
    s.root = tmproot;
  }

  @test.afterEach {|s|
    var contents = @fs.readdir(s.root);
    try {
      contents .. @assert.eq([], "leftover files");
    } finally {
      @rimraf(tmproot);
    }
  }

  @context("TemporaryFile") {||
    @test("creates a r/w file and removes it upon completion") {|s|
      var path = null;
      @TemporaryFile({prefix:"pre-", suffix: "-suff"}) {|f|
        @assert.ok(f.path .. @startsWith(s.root), f.path);
        path = f.path;
        @assert.number(f.file);

        var writable = f.writeStream({'encoding':'ascii'});
        writable .. @stream.write("data");
        writable .. @stream.end();

        var bufs = [];
        var readable = f.readStream({'encoding':'ascii'});
        while(true) {
          var buf = readable .. @stream.read(1);
          if(buf == null) break;
          bufs.push(buf);
        }
        Buffer.concat(bufs) .. @assert.eq("data");

        @fs.readFile(f.path, 'ascii') .. @assert.eq("data");

        var buf = new Buffer(10);
        var readBytes = f.file .. @fs.read(buf, 0, 10, 0);
        buf.slice(0, readBytes).toString("ascii") .. @assert.eq("data");
      }
      @assert.ok(path, "block not called");

      var filename = @path.basename(path);
      /^pre-.*-suff$/.test(filename) .. @assert.ok("Unexpected filename: #{filename}");

      @fs.exists(path) .. @assert.eq(false, "file still exists");
    }

    @test("creates a r/w file and leaves it if delete===false") {||
      var path = null;
      @TemporaryFile({'delete':false}) {|f|
        path = f.path;
      }
      @fs.exists(path) .. @assert.ok("file got deleted");
      @fs.unlink(path);
    }

    @test("returns the file if no block given") {||
      var f = @TemporaryFile({'delete':false});
      try {
        f.file .. @assert.number();
        @fs.exists(f.path) .. @assert.ok("file got deleted");
      } finally {
        f.close();
        @fs.unlink(f.path);
      }
    }

    @test("ignores ENOENT on deletion") {||
      tmp.TemporaryFile {|f|
        @fs.unlink(f.path);
      }
    }

    @test("deletes file on error") {||
      var e = new Error("testing");
      var path;
      @assert.raises(e, function() {
        tmp.TemporaryFile {|f|
          path = f.path;
          @fs.exists(path) .. @assert.ok();
          throw e;
        }
      });
      @fs.exists(path) .. @assert.falsy();
    }

    @test("permissions") {||
      @TemporaryFile({}) {|f|
        var stats = @fs.fstat(f.file);
        @assert.eq(stats.mode.toString(8).slice(-3), '600');
      }
    }

    @test("retries on collision") {||
      var _open = @fs.open;
      var _randomBytes = @crypto.randomBytes;
      var attempts = {}
      var extantPath;
      @TemporaryFile({'delete':false}) {|f|
        extantPath = f.path;
      }
      try {
        var bytes = [ 'aaa','bbb','ccc' ];
        var attemptedFiles = [
        ];
        @fs.open = function(path, flags, mode) {
          if (attemptedFiles.length < 3) {
            attemptedFiles.push(path);
            arguments[0] = extantPath; // we should get EEXIST from fs.open
          }
          return _open.apply(this, arguments);
        };
        @crypto.randomBytes = function(len) {
          var mock = bytes.shift();
          if (mock) return mock;
          return _randomBytes.apply(this, arguments);
        };

        @TemporaryFile({}, -> null);

        attemptedFiles .. @map(@path.basename) .. @assert.eq(['tmp-aaa', 'tmp-bbb','tmp-ccc']);
      } finally {
        @fs.open = _open;
        @crypto.randomBytes = _randomBytes;
        @fs.unlink(extantPath);
      }
    }
  }

  @context("TemporaryDir") {||
    @test("creates and (recursively) removes a temporary directory") {|s|
      var path;
      @TemporaryDir({}) {|p|
        path = p;
        path .. @startsWith(s.root) .. @assert.ok(path);
        @fs.stat(path).isDirectory() .. @assert.ok();
        @fs.mkdir(@path.join(path, "dir1"));
        @fs.writeFile(@path.join(path, "dir1", "file1"), "hello!");
      }
      @fs.exists(path) .. @assert.falsy();
    }

    @test("retries on collision") {||
      var _mkdir = @fs.mkdir;
      var _randomBytes = @crypto.randomBytes;
      var attempts = {}
      var extantPath = tmp.TemporaryDir();
      try {
        var bytes = [ 'aaa','bbb','ccc' ];
        var attemptedFiles = [
        ];
        @fs.mkdir = function(path, mode) {
          if (attemptedFiles.length < 3) {
            attemptedFiles.push(path);
            arguments[0] = extantPath; // we should get EEXIST from fs.mkdir
          }
          return _mkdir.apply(this, arguments);
        };
        @crypto.randomBytes = function(len) {
          var mock = bytes.shift();
          if (mock) return mock;
          return _randomBytes.apply(this, arguments);
        };

        @TemporaryDir({}, -> null);

        attemptedFiles .. @map(@path.basename) .. @assert.eq(['tmp-aaa', 'tmp-bbb','tmp-ccc']);
      } finally {
        @fs.mkdir = _mkdir;
        @crypto.randomBytes = _randomBytes;
        @rimraf(extantPath);
      }
    }

    @test("leaves directory if delete===false") {||
      var path;
      @TemporaryDir({'delete':false}) {|p|
        path = p;
      }
      try {
        path .. @fs.exists() .. @assert.ok();
      } finally {
        @rimraf(path);
      }
    }

    @test("permissions") {||
      @TemporaryDir({}) {|path|
        var stats = @fs.stat(path);
        @assert.eq(stats.mode.toString(8).slice(-3), '700');
      }
    }
  }
}
