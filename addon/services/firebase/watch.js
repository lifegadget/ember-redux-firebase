import Ember from 'ember';
const { get } = Ember;

/**
 * nodeWatcher
 * 
 * Watches for "value" events at a particular path in the database. Is meant for leaf nodes
 * in the database or non-list based paths.
 * 
 * @param {Function} dispatch the redux dispatch function   
 * @param {mixed} actionCreator either a string which names the action type or an action creator function
 */
const nodeWatcher = (dispatch, getActionCreators) => function nodeWatcher(snap) {

  getActionCreators().map(ac => {
    if (typeof ac === 'string') {
      dispatch({
        type: ac,
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

const addWatcher = (dispatch, actionCreator, options = {}) => function addWatcher(snap, prevKey) {
  const payload = Ember.assign(options, {
    type: `${actionCreator}_ADDED`,
    operation: 'added',
    path: snap.key,
    value: snap.val(),
    prevKey
  });
  if (options.cb) {
    options.cb(dispatch, payload);
  }  

  if (typeof actionCreator === 'string') {
    dispatch(payload);
  } else {
    actionCreator(payload);
  }
};

const listWatcher = (operation, dispatch, actionCreator, options = {}) => function listWatcher(snap) {
  const payload = Ember.assign(options, {
    type: `${actionCreator}_${operation.toUpperCase()}`,
    operation,
    path: snap.key,
    value: snap.val(),
  });
  if (options.cb) {
    options.cb(dispatch, Ember.assign(options, payload));
  }

  if (typeof actionCreator === 'string') {
    dispatch(payload);
  } else if (typeof actionCreator === 'function') {
    actionCreator(snap);
  } else {
    Ember.debug(`action type for list watcher on "${snap.key}" was invalid: ${payload.type}`);
  }
};

const watch = (context) => {
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
      type: '@firebase/WATCHER_CALLBACK_ADDED', 
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
          type: '@firebase/WATCHER_ACTION_CREATOR_ADDED',
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

  const dispatch = get(context, 'redux').dispatch;
  return {
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
      console.info(`Node watcher being considered for ${path}`);
      // If event/path already exist, then only thing to try 
      // is add a callback or new actionType
      if(findWatcher('value', pathOrRef)) {
        Ember.debug(`Duplicate watcher being considered: ['value', ${path}]`);
        console.info(findWatcher('value', pathOrRef));
        if (options.callback) {
          console.info(`An additional callback being added for ${path}`);
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
          fn: nodeWatcher(dispatch, getActionCreators('value', path).bind(this), options.callback) 
        };
        dispatch({
          type: '@firebase/WATCHER_ADD', 
          watcher, 
          existing: context.listWatchers(), options
        });
        context.addWatcher(watcher);
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