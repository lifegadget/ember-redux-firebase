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
const nodeWatcher = (dispatch, actionCreator) => function nodeWatcher(snap) {

  if (typeof actionCreator === 'string') {
    dispatch({
      type: actionCreator,
      path: snap.key,
      value: snap.val()
    });
  } else if (typeof actionCreator === 'function') {
    actionCreator(snap);
  } else {
    Ember.debug(`action type for node-watcher on "${snap.key}" was invalid: ${actionCreator}`);
  }
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

const addOptionsToReference = function(reference, options) {
  if (options.limitToFirst) {
    reference = reference.limitToFirst(options.limitToFirst);
  }
  if (options.limitToLast) {
    reference = reference.limitToLast(options.limitToLast);
  }
  if (options.orderByChild) {
    reference = reference.orderByChild(options.orderByChild);
  }
  if (options.orderByKey) {
    reference = reference.orderByKey(options.orderByKey);
  }
  if (options.orderByValue) {
    reference = reference.orderByValue(options.orderByValue);
  }
  
  return reference;
};

const watch = (context) => {
  const dispatch = get(context, 'redux').dispatch;
  return {
    /**
     * node
     * 
     * Allows containers to add a watcher to a DB ref which will listen to Firebase "value events"
     * 
     * @param {string} path the path reference to state in Firebase
     * @param {mixed} actionCreator either a string "type" for the action or a action-creator function
     * @param {Object} options query modifiers to the path can optionally be added; also can pass additional name/value pairs that will be sent at "event time"
     */
    node(path, actionCreator, options = {}) {
      let reference = addOptionsToReference(context.ref(path), options);

      reference.on('value', nodeWatcher(dispatch, actionCreator, options.callback));

      const watcher = { path, event: 'value', fn: nodeWatcher(dispatch, actionCreator, options.callback) };
      dispatch({type: '@firebase/WATCHER_ADD', watcher, existing: context.listWatchers(), options});
      context.addWatcher(watcher);
    },

    list(path, actionCreator, options = {}) {
      let reference = addOptionsToReference(context.ref(path), options);

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