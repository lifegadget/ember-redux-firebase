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
      dispatch({type: 'FIREBASE/CURRENT_USER_CHANGED', user});
      context.set('isAuthenticated', user ? true : false);
      context.set('currentUser', user);
      if(user && context._currentUserProfile) {
        context.watch().node(`${context._currentUserProfile}/${user.uid}`, 'UPDATE_USER_PROFILE');
      } else if (!user && context._currentUserProfile)  {
        const remove = watchers
          .filter(w => w.path[0] === context._currentUserProfile)
          .map(w => w.path[1]);
        dispatch({type: 'FIREBASE/USER_PROFILE_WATCHERS_REMOVE', remove});
      }
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
    return accumulator || (watcher.event === current.event && watcher.path.join() === current.path.join() );
  };
  return watchers.reduce(validator, false);
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
    return unwatch(app, watchers);
  },

  watching() {
    return watchers;
  },

  currentUserProfile(path = undefined) {
    if (path === undefined) {
      this._currentUserProfile = '/users';
    } else {
      this._currentUserProfile = path;
    }
    debug(`User Profile path set to: ${this._currentUserProfile}`); 
  },
  isAuthenticated: false,
  currentUser: {},

  addWatcher(watcher, forceDuplicate = false) {
    if(!forceDuplicate && watcherIsDuplicate(watcher)) {
      debug(`Attempt to add a duplicate watcher to "${watcher.path.join('/')}::${watcher.event}". Make sure to unwatch before adding another watcher or set "forceDuplicate" to true.`);
    } else {
      watchers.push(watcher);
    }
  }

});

export default fb;