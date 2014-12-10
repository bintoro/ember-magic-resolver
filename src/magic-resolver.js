// Magic Resolver 0.1
// Adapted from Ember Resolver 0.1.10

(function() {
/* globals define registry requirejs */

define("magic-resolver", ["ember",         "ember/resolver",  "exports"  ],
  function(               __dependency1__, __dependency2__,  __exports__) {

  "use strict";

  var Ember         = __dependency1__["default"] || __dependency1__;
  var EmberResolver = __dependency2__["default"] || __dependency2__;

  if (typeof requirejs.entries === 'undefined') {
    requirejs.entries = requirejs._eak_seen;
  }

  function classFactory(klass) { // from Ember Resolver
    return {
      create: function (injections) {
        if (typeof klass.extend === 'function') {
          return klass.extend(injections);
        } else {
          return klass;
        }
      }
    };
  }

  function makeDictionary() { // from Ember Resolver
    var cache = Object.create(null);
    cache['_dict'] = null;
    delete cache['_dict'];
    return cache;
  }

  function chooseModuleName(moduleEntries, moduleName) { // from Ember Resolver
    var underscoredModuleName = Ember.String.underscore(moduleName);

    if (moduleName !== underscoredModuleName && moduleEntries[moduleName] && moduleEntries[underscoredModuleName]) {
      throw new TypeError("Ambiguous module names: `" + moduleName + "` and `" + underscoredModuleName + "`");
    }

    if (moduleEntries[moduleName]) {
      return moduleName;
    } else if (moduleEntries[underscoredModuleName]) {
      return underscoredModuleName;
    } else {
      var partializedModuleName = moduleName.replace(/\/-([^\/]*)$/, '/_$1');

      if (moduleEntries[partializedModuleName]) {
        Ember.deprecate('Modules should not contain underscores. ' +
                        'Attempted to lookup "'+moduleName+'" which ' +
                        'was not found. Please rename "'+partializedModuleName+'" '+
                        'to "'+moduleName+'" instead.', false);

        return partializedModuleName;
      } else {
        return moduleName;
      }
    }
  }

  var capitalize = Ember.String.capitalize;
  var classify = Ember.String.classify;
  var underscore = Ember.String.underscore;
  var get = Ember.get;

  function resolve(fullName) {
      if (fullName in this._resolverCache) {
        return this._resolverCache[fullName];
      } else {
        return this._resolverCache[fullName] = this.dispatch(fullName);
      }
  }

  function dispatch(fullName) { // adapted from DefaultResolver.resolve()
    var parsedName = this.parseName(fullName);
    var resolveMethodName = parsedName.resolveMethodName;
    var resolved;
    if (!(parsedName.name && parsedName.type)) {
      throw new TypeError('Invalid fullName: `' + fullName + '`, must be of the form `type:name` ');
    }
    if (this[resolveMethodName]) {
      resolved = this[resolveMethodName](parsedName);
    } else {
      resolved = this.resolveModule(parsedName);
    }
    if (!resolved) {
      resolved = this.resolveLegacy(parsedName);
    }
    return resolved;
  }

  function resolveModule(parsedName) {
    /* jshint validthis: true */

    // console.log("*** Got a resolve request for " + parsedName.fullName);
    Ember.assert('Module prefix must be defined', this.namespace.modulePrefix);

    var candidates = [];
    var modulePath, exportName, exportStem, templatePath, dottedPath;
    var resolvedExport;
    var self = this;

    function addCandidate(parsedName, modulePaths, exportName, exportStem) {
      if (!(modulePaths instanceof Array)) {
        modulePaths = [modulePaths];
      }
      modulePaths.forEach(function(modulePath) {
        var nameObj = {
          parsedName: parsedName,
          modulePath: modulePath,
          exportName: exportName,
          exportStem: exportStem,
        };
        candidates.push(nameObj);
        // console.log("Added candidate "
        //             + modulePath
        //             + (exportStem ? "(" + exportStem + ")" : "")
        //             + (exportName ? "[" + exportName + "]" : ""));
      });
    }

    var parts = parsedName.fullNameWithoutType.split('/');
    var capitalizedType = capitalize(parsedName.type);

    if (parsedName.fullNameWithoutType === 'main') {
      addCandidate(parsedName, parsedName.prefix + '/' + parsedName.type);
    }

    // Full name as module path
    modulePath = parsedName.fullNameWithoutType;
    exportStem = classify(parts.slice(-1).toString());
    addCandidate(parsedName, 
      this.podScheme(parsedName, modulePath), null, exportStem);
    addCandidate(parsedName, 
      this.defaultScheme(parsedName, modulePath), null, exportStem);

    if (parsedName.type === 'template') {
      // Any level of nesting via dotted notation
      for (var i = 1; i < parts.length; i++) {
        templatePath = parts.slice(0, parts.length - i).join('/');
        dottedPath = '.' + parts.slice(-i).join('.');
        addCandidate(parsedName, 
          this.podScheme(parsedName, templatePath) + dottedPath);
        addCandidate(parsedName, 
          this.defaultScheme(parsedName, templatePath + dottedPath));
      }
    } else {
      // Any level of nesting via named exports
      for (var i = 1; i < parts.length; i++) {
        modulePath = parts.slice(0, parts.length - i).join('/');
        exportName = classify(parts.slice(-i).join('-'));
        exportStem = classify(parts.slice(-i - 1, -i).toString());
        addCandidate(parsedName, 
          this.podScheme(parsedName, modulePath), exportName, exportStem);
        addCandidate(parsedName, 
          this.defaultScheme(parsedName, modulePath), exportName, exportStem);
      }
    }

    candidates.find(function(item) {
      var moduleName = self.findModuleName(item.modulePath);
      if (!moduleName) {
        self._logLookup(false, parsedName, item.modulePath);
        return;
      }
      var module = require(moduleName, null, null, true);
      var validExports;
      if (item.exportName) {
        validExports = [item.exportName + capitalizedType];
          if (item.exportStem) {
            validExports.push(item.exportStem + item.exportName + capitalizedType);
          }
      }
      else if (item.parsedName.type === 'template') {
        validExports = ['default'];
      } 
      else {
        validExports = ['default', 'Base' + capitalizedType];
        if (item.exportStem) {
          validExports.push(item.exportStem + capitalizedType);
        }
      }
      var exportName = validExports.find(function(item) {
        return module[item];
      });
      if (exportName) {
        resolvedExport = module[exportName];
        if (self.shouldWrapInClassFactory(resolvedExport, parsedName)) {
          resolvedExport = classFactory(resolvedExport);
        }
        var logExportName = 
          (item.parsedName.type === 'template' ? '' : "[" + exportName + "]");
        self._logLookup(true, parsedName, moduleName + logExportName);
      }
      else {
        resolvedExport = null;
        self._logLookup(false, parsedName, moduleName + " ✓");
      }
      return resolvedExport;
    });
    return resolvedExport;
  }

  function resolveLegacy(parsedName) {
  }

  function lookupLegacyDescription(fullName) { // from DefaultResolver.lookupDescription()
    var parsedName = this.parseName(fullName);
    var description = parsedName.root + '.' + classify(parsedName.name);
    if (parsedName.type !== 'model') {
      description += classify(parsedName.type);
    }
    return description;
  }

  var Resolver = EmberResolver.extend({

    resolve: resolve,
    dispatch: dispatch,
    resolveModule: resolveModule,
    resolveModel: resolveModule,
    resolveTemplate: resolveModule,
    resolveOther: resolveModule,
    resolveLegacy: resolveLegacy,

    pluralizedTypes: null,

    init: function() {
      this._super();
      this._resolverCache = makeDictionary();
    },

    parseName: function(fullName) { // from DefaultResolver
      return this._parseNameCache[fullName] || (
        this._parseNameCache[fullName] = this._super(fullName));
    },

    podScheme: function(parsedName, modulePath) {
      // adapted from EmberResolver.podBased[...]()
      var podPrefix = this.namespace.podModulePrefix || this.namespace.modulePrefix;
      var originalPath = modulePath;
      var modulePaths = [];
      if (parsedName.type === 'template') {
        modulePath = modulePath.replace(/^components\//, '');
      }
      modulePaths.push(podPrefix + '/' + modulePath + '/' + parsedName.type);

      if (parsedName.type === 'component' || originalPath.match(/^components/)) {
        podPrefix = podPrefix + '/components';
        modulePaths.push(podPrefix + '/' + modulePath + '/' + parsedName.type);
      }
      return modulePaths;
    },

    defaultScheme: function(parsedName, modulePath) {
      return (parsedName.prefix + '/' +  this.pluralize(parsedName.type) + '/' + modulePath);
    },

    findModuleName: function(modulePath) { // adapted from EmberResolver
      var moduleEntries = requirejs.entries;
      var moduleName;
      var tmpModuleName = chooseModuleName(moduleEntries, modulePath);
      if (tmpModuleName && moduleEntries[tmpModuleName]) {
        moduleName = tmpModuleName;
      }
      return moduleName;
    },

    lookupDescription: function(fullName) {
      return fullName.fullName || fullName;
    }

  });

  __exports__["default"] = Resolver;

});

})();
