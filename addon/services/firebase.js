import Ember from 'ember';
import auth from './firebase/auth';
import watch from './firebase/watch';
import unwatch from './firebase/unwatch';
const { get, debug, getOwner, inject: {service} } = Ember;
const DEFAULT_NAME = '[EmberFireRedux default app]';
export let app;
export let watchers = [];

/**
 * start listening for Auth State changes and dispatch
 * events when they occur
 */
function onAuthStateChanged(context) {
  const dispatch = context.get('redux.dispatch');
  app.auth().onAuthStateChanged(
    (user) => {
      dispatch({type: 'FIREBASE/AUTH/CURRENT_USER_CHANGED', user});
      context.set('isAuthenticated', user ? true : false);
      context.set('currentUser', user);
      const userProfile = context._currentUserProfile;
      const ac = (dispatch, firebase, cb = null) => (snap) => {
        dispatch({
          type: 'USER_PROFILE_UPDATED',
          key: snap.key,
          data: snap.val()
        });
        if (cb) {
          cb(snap);
        }
      };
      context.watch().node(`${userProfile.path}/${user.uid}`, ac(dispatch, context, userProfile.cb));
    },
    (e) => dispatch({type: 'ERROR_DISPATCHING', message: e.message}));
}

function onConnectedChanged(dispatch, url) {
  const connectedRef = app.database().ref(".info/connected");
  connectedRef.on('value', (snap) => {
    if(snap.val()) {
      dispatch({
        type: 'FIREBASE/APP/CONNECTED',
        url
      });
    } else {
      dispatch({
        type: 'FIREBASE/APP/DISCONNECTED',
        url
      });
    }
  });
}

function watcherIsDuplicate(watcher) {
  const validator = (accumulator, current) => {
    return accumulator || (watcher.event === current.event && watcher.path === current.path );
  };
  return watchers.reduce(validator, false);
}

export const Firebase = class {
  clearWatchers() {
    watchers = [];  
  }
};


const fb = Ember.Service.extend({
  redux: service(),

  init() {
    const { redux } = this.getProperties('redux');
    this._currentUserProfile = { path: false, setup: c => f => f(c), cleanup: c => f => f(c) };

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
    redux.dispatch({
      type: 'FIREBASE/APP/INITIALIZED', 
      url: config.firebase.databaseURL,
      appName: modulePrefix || DEFAULT_NAME
    });
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
    return unwatch(this, watchers);
  },

  watching() {
    return watchers;
  },

  currentUserProfile(path = undefined, cb = undefined) {
    if (path === undefined) {
      path = '/users';
    } 
    this._currentUserProfile = { path, cb };
    debug(`User Profile path set to: ${this._currentUserProfile.path}`); 
  },
  isAuthenticated: false,
  currentUser: {},

  addWatcher(watcher, forceDuplicate = false) {
    if(!forceDuplicate && watcherIsDuplicate(watcher)) {
      debug(`Attempt to add a duplicate watcher to "${watcher.path}::${watcher.event}". Make sure to unwatch before adding another watcher or set "forceDuplicate" to true.`);
    } else {
      watchers.push(watcher);
    }
  }

});

export default fb;