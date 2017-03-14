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
      key: snap.key,
      data: snap.val()
    });
  } else {
    actionCreator(snap);
  }
};

const addWatcher = (dispatch, actionCreator, cb = null) => function addWatcher(snap, prevKey) {
  const payload = {
    type: `${actionCreator}_ADDED`,
    operation: 'added',
    key: snap.key,
    data: snap.val(),
    prevKey
  };
  if (cb) {
    cb(dispatch, payload);
  }  

  if (typeof actionCreator === 'string') {
    dispatch(payload);
  } else {
    actionCreator(payload);
  }
};

const listWatcher = (operation, dispatch, actionCreator, cb = null) => function listWatcher(snap) {
  const opShortName = operation.split('_')[1];
  const payload = {
    type: `${actionCreator}_${opShortName.toUpperCase()}`,
    operation: opShortName,
    key: snap.key,
    data: snap.val(),
  };
  if (cb) {
    cb(dispatch, payload);
  }

  if (typeof actionCreator === 'string') {
    dispatch(payload);
  } else {
    actionCreator(payload);
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
     * @param {Object} options query modifiers to the path can optionally be added 
     */
    node(path, actionCreator, options = {}) {
      let reference = addOptionsToReference(context.ref(path), options);

      reference.on('value', nodeWatcher(dispatch, actionCreator, options.callback));

      const watcher = { path, event: 'value', fn: nodeWatcher(dispatch, actionCreator, options.callback) };
      dispatch({type: '@firebase/WATCHER_ADD', watcher});
      context.addWatcher(watcher);
    },

    list(path, actionCreator, options = {}) {
      let reference = addOptionsToReference(context.ref(path), options);

      let fn = listWatcher('added', dispatch, actionCreator);
      let eventContext = reference.on('child_added', fn);
      let watcher = {path, event: 'child_added', fn, eventContext};
      context.addWatcher(watcher);
      dispatch({type: '@firebase/WATCHER_ADD', watcher});

      fn = listWatcher('removed', dispatch, actionCreator);
      eventContext = reference.on('child_removed', fn);
      watcher = {path, event: 'child_removed', fn, eventContext};
      context.addWatcher(watcher);
      dispatch({type: '@firebase/WATCHER_ADD', watcher});      

      fn = listWatcher('changed', dispatch, actionCreator);
      eventContext = reference.on('child_changed', fn);
      watcher = {path, event: 'child_changed', fn, eventContext};
      context.addWatcher(watcher);
      dispatch({type: '@firebase/WATCHER_ADD', watcher});
    }
  };
};

export default watch;