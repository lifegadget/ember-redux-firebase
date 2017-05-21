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
 * events when they occur. Because there are async side-effects
 * needed this feature relies on a "thunk" middleware to be 
 * present.
 */
function onAuthStateChanged(dispatch, context) {
  app.auth().onAuthStateChanged(
    (user) => {
      let actionType;
      let callback;
      if (user) {
        actionType = 'LOGGED_IN';
        callback = () => context.watch().loggedIn(user);
      } else {
        actionType = 'LOGGED_OUT';
        callback = () => context.unwatch().loggedOut();
      }
      dispatch({
        type: `@firebase/auth/${actionType}`, 
        user,
        firebase: context
      });
      Ember.set(context, 'isAuthenticated', user ? true : false);
      Ember.set(context, 'currentUser', user);
      callback();
    },
    (e) => dispatch({type: '@firebase/GENERAL_ERROR', message: e.message})
  );
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

export const Firebase = class {
  clearWatchers() {
    watchers = [];  
  }
};

const fb = Ember.Service.extend({
  redux: service(),

  init() {
    const { redux } = this.getProperties('redux');
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
    onAuthStateChanged(redux.dispatch, this);
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
    return watch(this, get(this, 'redux'));
  },

  onLogin(fn) {
    return this.watch().onLogin(fn);
  },

  unwatch() {
    return unwatch(this, get(this, 'redux'));
  },

  onLogout(fn) {
    return this.unwatch().onLogout(fn);
  },

  watching() {
    return watchers;
  },

  /**
   * Allows the container to resolve the app-specific "user-profile"
   * as a promise based function based on an authenticated firebase user;
   * this function will be executed on the LOGGED_IN lifecycle event
   * 
   * @param {Function(user):Promise<object>} fn 
   */
  findUserProfile(fn) {
    this._findUserProfile = fn;
    return this;
  },

  /**
   * Allows the container to resolve the app-specific "organisation"
   * as a promise based function based on an authenticated firebase user;
   * this function will be executed on the LOGGED_IN lifecycle event
   * 
   * @param {Function(user, userProfile):Promise<object>} fn 
   */
  findUserOrganization(fn) {
    this._findUserOrganization = fn;
    return this;
  },

  isAuthenticated: false,
  currentUser: {},

  addWatcher(watcher) {
    Ember.debug(`adding db watcher:\n${JSON.stringify(watcher, null, 2)}`);
    watchers.push(watcher);
  },
  getWatchers() {
    return watchers.slice(0);
  },
  setWatchers(w) {
    if (Ember.typeOf(w) === 'array') {
      watchers = w.slice(0);
    }
  },
  listWatchers() {
    return watchers.map(w => `${w.event}: ${w.path} ${JSON.stringify(w.actionCreators.map(ac => typeof ac === 'function' ? 'actionCreator()' : ac))}`);
  }

});

fb[Ember.NAME_KEY] = 'firebase-redux';
export default fb;