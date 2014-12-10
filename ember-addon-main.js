'use strict';

var path = require('path');

function UnwatchedTree (dir) { this.dir = dir } // from broccoli-bower
UnwatchedTree.prototype.read = function (readTree) { return this.dir }
UnwatchedTree.prototype.cleanup = function () { }

module.exports = {

  name: 'ember-magic-resolver',

  treeFor: function(name) {
    if (name === 'vendor') {
      return new UnwatchedTree(path.join('node_modules', 'ember-magic-resolver', 'dist'));
    }
  },

  included: function(app) {
    this._super.included(app);

    app.import('vendor/magic-resolver.js', {
        exports: {'magic-resolver': ['default']},
    });

    app._podTemplatePatterns = function() {
      return this.registry.extensionsForType('template').map(function(extension) {
        return new RegExp('template\..*?' + extension + '$');
      });
    };
  }
};
