/* jshint node: true */
'use strict';

module.exports = {
  name: 'ember-redux-firebase',
  contentFor(type, config) {
    if(type === 'head') {
      return '<script src="https://www.gstatic.com/firebasejs/3.3.0/firebase.js"></script>';
    }
  }
};
