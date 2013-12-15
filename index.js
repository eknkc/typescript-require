var os = require('os');
var vm = require('vm');
var fs = require('fs');
var path = require('path');

var tsc = require.resolve("typescript").replace(/typescript\.js$/, "tsc.js");
var tscScript = vm.createScript(fs.readFileSync(tsc, "utf8"), tsc);

var options = {
  nodeLib: false,
  targetES5: true,
  moduleKind: 'commonjs'
};

module.exports = function(opts) {
  options = merge(options, opts);
};

require.extensions['.ts'] = function(module) {
  var jsname = compileTS(module);
  runJS(jsname, module);
};

/**
 * Compiles TypeScript file, returns js file path
 * @return {string} js file path
 */
function compileTS (module) {
  var exitCode = 0;
  var tmpDir = path.join(os.tmpDir(), "tsreq_" + Math.floor(Math.random() * 0xFFFFFFFF));

  var argv = [
    "node",
    "tsc.js",
    "--nolib",
    "--target",
    options.targetES5 ? "ES5" : "ES3", !! options.moduleKind ? "--module" : "", !! options.moduleKind ? options.moduleKind : "",
    "--outDir",
    tmpDir,
    path.resolve(__dirname, "typings/lib.d.ts"),
    options.nodeLib ? path.resolve(__dirname, "typings/node.d.ts") : null,
    module.filename
  ];

  var proc = merge(merge({}, process), {
    argv: compact(argv),
    exit: function(code) {
      exitCode = code;
    }
  });

  var sandbox = {
    process: proc,
    require: require,
    module: module,
    Buffer: Buffer,
    setTimeout: setTimeout
  };

  tscScript.runInNewContext(sandbox);
  if (exitCode != 0) {
    throw new Error('Unable to compile TypeScript file.');
  }

  return path.join(tmpDir, path.basename(module.filename, ".ts") + ".js");
}

function runJS (jsname, module) {
  var content = fs.readFileSync(jsname, 'utf8');

  var sandbox = {};
  for (var k in global) {
    sandbox[k] = global[k];
  }
  sandbox.require = module.require.bind(module);
  sandbox.exports = module.exports;
  sandbox.__filename = jsname;
  sandbox.__dirname = path.dirname(module.filename);;
  sandbox.module = module;
  sandbox.global = sandbox;
  sandbox.root = root;

  return vm.runInNewContext(content, sandbox, { filename: jsname });
}

function merge(a, b) {
  if (a && b) {
    for (var key in b) {
      a[key] = b[key];
    }
  }
  return a;
};

function compact(arr) {
  var narr = [];
  arr.forEach(function(data) {
    if (data) narr.push(data);
  });
  return narr;
}
