import Ember from 'ember';
import auth from './firebase/auth';
import watch from './firebase/watch';
import unwatch from './firebase/unwatch';
import Services from 'ember-redux-core/utils/services';
const { get, debug, getOwner, inject: {service}, RSVP: {Promise} } = Ember;
const DEFAULT_NAME = '[ember-redux-core]';
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
      const actionType = user ? 'CURRENT_USER_CHANGED' : 'SIGN_OUT';
      dispatch({type: `@firebase/auth/${actionType}`, user});
      Ember.set(context, 'isAuthenticated', user ? true : false);
      Ember.set(context, 'currentUser', user);
      const userProfile = context._currentUserProfile;
      const ac = (dispatch, firebase, options= {}) => (snap) => {
        dispatch({
          type: 'USER_PROFILE_UPDATED',
          key: snap.key,
          data: snap.val()
        });
        if (options.cb) {
          options.cb(snap);
        }
      };
      if (user) {
        context.watch().node(`${userProfile.path}/${user.uid}`, ac(dispatch, context, {
          cb: userProfile.cb
        }));
      }
    },
    (e) => dispatch({type: 'ERROR_DISPATCHING', message: e.message}));
}

function onConnectedChanged(dispatch, url) {
  const connectedRef = app.database().ref(".info/connected");
  connectedRef.on('value', (snap) => {
    if(snap.val()) {
      dispatch({
        type: '@firebase/app/CONNECTED',
        url
      });
    } else {
      dispatch({
        type: '@firebase/app/DISCONNECTED',
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

    // add this service to the Redux service registry so reducers will have access
    const serviceRegistry = new Services();
    serviceRegistry.add('firebase', this);

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
      type: '@firebase/app/INITIALIZED', 
      url: config.firebase.databaseURL,
      appName: modulePrefix || DEFAULT_NAME
    });
    onAuthStateChanged(this);
    onConnectedChanged(redux.dispatch, config.firebase.databaseURL);
  },

  ref(refPath) {
    return app.database().ref(refPath);
  },

  set(path, value, name, options = {}) {
    return this._writeToDB('set', path, value, name, options);
  },
  push(path, value, name, options = {}) {
    return this._writeToDB('push', path, value, name, options);
  },
  update(path, value, name, options = {}) {
    return this._writeToDB('update', path, value, name, options);
  },
  multipathUpdate(updates, type) {
    const { redux } = this.getProperties('redux');
    const { dispatch } = redux;
    dispatch({type: `${type}@attempt`, updates });
    return app.database().ref()
      .update(updates)
      .then(() => dispatch({
        type: `${type}@success`,
        updates
      }))
      .catch(e => {
        dispatch({
          type: `${type}@failure`,
          error: e
        });
        return Promise.reject(e);
      });
  },

  _writeToDB(operation, path, value, name, options) {
    const { redux } = this.getProperties('redux');
    const { dispatch } = redux;
    const opName = operation.toUpperCase();
    name = `${name}`;
    // Firebase hates "undefined" values
    if(typeof value === 'object') {
      Object.keys(value).forEach(prop => {
        if(value[prop] === undefined) {
          delete value[prop];
        }
      });
    }
    dispatch(Ember.assign(options, {type: `${name}@attempt`, path, value, opName }));

    return app.database().ref(path)[operation](value)
      .then((result) => {
        dispatch({type: `${name}@success`, path, value, opName });
        return Promise.resolve(result);
      })
      .catch(e => {
        dispatch({
          type: `${name}@failure`, 
          code: e.code, 
          message: e.message,
          path, 
          value, 
        });
        return Promise.reject(e);
      });

  },

  /**
   * Removes a path from the database, dispatching appropriate
   * actions along the way
   */
  remove(path, name) {
    const { redux } = this.getProperties('redux');
    const { dispatch } = redux;

    dispatch({type: `@firebase/REMOVE_${name}_ATTEMPT`, path});
    return new Promise((resolve, reject) => {

      app.database().ref(path).remove()
        .then( ( ) => {
          dispatch({
            type: `@firebase/REMOVE_${name}_SUCCESS`, 
            path,
          }); 
          resolve();
        })
        .catch((e) => {
          dispatch({
            type: `@firebase/REMOVE_${name}_FAILURE`, 
            path,
            code: e.code,
            message: `Failed to remove path from Firebase: {e.message || e}`
          });
          reject(e);
        });
    });
  },

  /**
   * Allows you to filter down 
   */
  filter(pathOrHash, filter, action) {
    let start;
    let firebaseRef;
    if (typeof pathOrHash === 'string') {
      firebaseRef = pathOrHash;
      start = app.database().ref(firebaseRef).once('value');
    } else {
      let data;
      [firebaseRef, data] = pathOrHash;
      start = Promise.resolve(data);
    }

    return new Promise((resolve, reject)=> {
      start
        .then(input => Promise.resolve(input.filter(filter)))
        .then(output => app.database().ref(firebaseRef).update(output))
        .then(resolve)
        .catch(reject)
    });
    
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

  addWatcher(watcher) {
    Ember.debug(`adding db watcher:\n${JSON.stringify(watcher, null, 2)}`);
    watchers.push(watcher);
  },

  listWatchers() {
    return watchers.map(w => `${w.event}: ${w.path}`);
  }

});

fb[Ember.NAME_KEY] = 'firebase-redux';
export default fb;