import Ember from 'ember';
const { get, RSVP: {Promise} } = Ember;

/**
 * nodeWatcher
 * 
 * Watches for "value" events at a particular path in the database. Is meant for leaf nodes
 * in the database or non-list based paths.
 * 
 * @param {function} dispatch the redux dispatch function   
 * @param {mixed} actionCreator either a string which names the action type or an action creator function
 */
const nodeWatcher = (dispatch, getActionCreators) => function nodeWatcher(snap) {
  const actions = getActionCreators() || [];
  actions.map(ac => {
    if (typeof ac === 'string') {
      dispatch({
        type: `${ac}@observed`,
        path: snap.key,
        value: snap.val()
      });
    } else if (typeof ac === 'function') {
      ac(snap);
    } else {
      Ember.debug(`action type for node-watcher on "${snap.key}" was invalid: ${ac}`);
    }
  })
};

let loginCallbacks = [];

/**
 * Watcher Interface
 * 
 * @param {object} context Firebase Service
 * @param {function} dispatch Redux dispatch
 */
const watch = (context) => {
  const dispatch = get(context, 'redux.dispatch');
  /**
   * Looks through the existing watcher for a match
   * 
   * @param {string} event the Firebase listener event type 
   * @param {string} path path in the DB that this path will be setup
   */
  const findWatcher = (event, path) => {
    const found = context.getWatchers().filter(w => w.path === path && w.event === event);
    return found.length > 0
      ? found[0]
      : false;
  };

  const addCallbackToWatcher = (event, path, cb) => {
    dispatch({
      type: '@firebase/watch/CALLBACK_ADDED', 
      event, 
      path,
      watcher: findWatcher(event, path)
    });

    context.setWatchers(context.getWatchers().map(w => w.path === path && w.event === event
      ? w.callbacks.push(cb)
      : w
    ));
  };

  const addActionCreatorToWatcher = (event, path, actionCreator) => {
    const watcher = findWatcher(event, path);
    if (watcher) {
      if(! Ember.A(getActionCreators(event, path)()).includes(actionCreator)) {
        context.setWatchers(
          context.getWatchers().map(w => w.path === path && w.event === event 
            ? Ember.assign({}, w, {actionCreators: w.actionCreators.concat(actionCreator)})
            : w
          )
        );
        dispatch({
          type: '@firebase/watch/ACTION_CREATOR_ADDED',
          path,
          event,
          actionCreator,
          watchers: context.listWatchers()
        });
      }
    }
  };

  /**
   * Gets the Action Creators that exist on a given watcher at "event time"
   * 
   * @param {string} event Firebase event name
   * @param {mixed} path database path string (or optionally FB reference)
   * @returns {array}
   */
  const getActionCreators = (event, path) => () => {
    const watcher = findWatcher(event, path);
    return watcher.actionCreators;
  }

  return {
    /**
     * Allows containers to state which watchers should be removed
     * at the LOG_OUT lifecycle event.
     * 
     * @param {Function} cb callback function to be executed at login
     */
    onLogin(cb) {
      const higherOrder = (meta) => cb(this, meta);
      loginCallbacks = loginCallbacks.concat(higherOrder);
      return context;
    },

    /**
     * Executed by addon's AUTH reducer when a user logs in,
     * does two things:
     * 
     *  a) prep userProfile and Organisation
     *  b) call registered callbacks with above context
     */
    loggedIn(user) {
      const meta = { user, userProfile: {}, organization: {} };
      const prep = context._findUserProfile 
        ? () => context._findUserProfile(user)
                  .then(userProfile => {
                    meta.userProfile = userProfile;
                    return context._findUserOrganization
                      ? context._findUserOrganization(user, userProfile)
                      : Promise.resolve({});
                  })
                  .then(organization => {
                    meta.organization = organization;
                    return Promise.resolve();
                  })
        : () => Promise.resolve();
      const processCallbacks = () => {
        loginCallbacks.forEach(cb => cb(meta));
      };
      if (loginCallbacks.length === 0) {
        return;
      }

      dispatch({
        type: '@firebase/auth/LOGIN_CALLBACKS@attempt`',
        user,
        registeredCallbacks: loginCallbacks.length
      });

      return prep()
        .then(() => processCallbacks(user, meta.userProfile, meta.organization))
        .then(() => dispatch({
          type: '@firebase/auth/LOGIN_CALLBACKS@success`',
          user,
          userProfile: meta.userProfile,
          organization: meta.organization,
          registeredCallbacks: loginCallbacks.length
        }))
        .catch((e) => {
          Ember.debug('Problem with login callbacks:\n' + JSON.stringify(e, null, 2));
          dispatch({
            type: '@firebase/auth/LOGIN_CALLBACKS@failure',
            error: e
          })
        });
    },

    /**
     * node
     * 
     * Allows containers to add a watcher to a DB ref which will listen to Firebase "value events"
     * 
     * @param {mixed} pathOrRef a string path reference in DB or a Firebase ref object
     * @param {mixed} actionCreator either a string "type" for the action or a action-creator function
     * @param {Object} options query modifiers to the path can optionally be added; also can pass additional name/value pairs that will be sent at "event time"
     */
    node(pathOrRef, actionCreator, options = {}) {
      let ref;
      let path;
      if (Ember.typeOf(pathOrRef) === 'string') {
        ref = context.ref(pathOrRef);
        path = pathOrRef;
      } else {
        ref = pathOrRef;
        path = '(reference)';
      }
      // If event/path already exist, then only thing to try 
      // is add a callback or new actionType
      if(findWatcher('value', pathOrRef)) {
        Ember.debug(`Duplicate watcher being considered: ['value', ${path}]`);
        if (options.callback) {
          addCallbackToWatcher('value', pathOrRef, options.callback);
        }
        addActionCreatorToWatcher('value', path, actionCreator);
      }
      // this is a new event
      else {
        ref.on('value', 
          nodeWatcher(dispatch, getActionCreators('value', path).bind(this), options.callback)
        );

        const watcher = { 
          path, 
          event: 'value',
          actionCreators: [actionCreator],
          callbacks: options.callback ? [options.callback] : [],
        };
        dispatch({
          type: '@firebase/watch/ADD', 
          watcher, 
          existing: context.listWatchers(), 
          options,
          firebase: context
        });
        
      }
    },

    list(path, actionCreator, options = {}) {
      // let reference = addOptionsToReference(context.ref(path), options);
      let reference = context.ref(path);

      let fn = listWatcher('added', dispatch, actionCreator, options);
      let eventContext = reference.on('child_added', fn);
      let watcher = {path, event: 'child_added', fn, eventContext};
      context.addWatcher(watcher);
      dispatch({type: '@firebase/WATCHER_ADD', watcher, existing: context.listWatchers(), options});

      fn = listWatcher('removed', dispatch, actionCreator, options);
      eventContext = reference.on('child_removed', fn);
      watcher = {path, event: 'child_removed', fn, eventContext};
      context.addWatcher(watcher);
      dispatch({type: '@firebase/WATCHER_ADD', watcher, existing: context.listWatchers()});      

      fn = listWatcher('changed', dispatch, actionCreator, options);
      eventContext = reference.on('child_changed', fn);
      watcher = {path, event: 'child_changed', fn, eventContext};
      context.addWatcher(watcher);
      dispatch({type: '@firebase/WATCHER_ADD', watcher, existing: context.listWatchers()});
    }
  };
};

export default watch;