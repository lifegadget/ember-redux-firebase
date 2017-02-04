import Ember from 'ember';
import auth from './firebase/auth';
import watch from './firebase/watch';
import unwatch from './firebase/unwatch';
const { get, debug, getOwner, inject: {service} } = Ember;
const DEFAULT_NAME = '[EmberFireRedux default app]';
let app;

/**
 * start listening for Auth State changes and dispatch
 * events when they occur
 */
function onAuthStateChanged(context) {
  const dispatch = context.get('redux.dispatch');
  app.auth().onAuthStateChanged(
    (user) => {
      dispatch({type: 'CURRENT_USER_CHANGED', user});
      context.set('isAuthenticated', user ? true : false);
    },
    (e) => dispatch({type: 'ERROR_DISPATCHING', message: e.message}));
}

function onConnectedChanged(dispatch, url) {
  const connectedRef = app.database().ref(".info/connected");
  connectedRef.on('value', (snap) => {
    if(snap.val()) {
      dispatch({
        type: 'FIREBASE_CONNECTED',
        url
      });
    } else {
      dispatch({
        type: 'FIREBASE_DISCONNECTED',
        url
      });
    }
  });
}

const fb = Ember.Service.extend({
  redux: service(),
  _currentUserProfile: false,

  init() {
    const {redux} = this.getProperties('redux');
    if(!redux) {
      console.error(`Tried to start ember-firebase-redux service but there was no redux service available for dispatch!`);
      return;
    }
    const config = getOwner(this)._lookupFactory('config:environment');
    if (!config || typeof config.firebase !== 'object') {
      throw new Error('Please set the `firebase` property in your environment config.');
    }
    debug(`Connected to Firebase DB: ${config.firebase.databaseURL}`);
    const modulePrefix = get(config, 'modulePrefix');
    app = window.firebase.initializeApp(config.firebase, modulePrefix || DEFAULT_NAME);
    onAuthStateChanged(this);
    onConnectedChanged(redux.dispatch, config.firebase.databaseURL);
  },

  ref(refPath) {
    return app.database().ref(refPath);
  },

  auth() {
    return auth(this, app);
  },

  watch() {
    return watch(this);
  },

  unwatch() {
    return unwatch(app);
  },

  currentUserProfile(path) {
    if (!path && path === false) {
      this._currentUserProfile = '/users';
    } else {
      this._currentUserProfile = path;
    }
  },
  isAuthenticated: false

});

export default fb;