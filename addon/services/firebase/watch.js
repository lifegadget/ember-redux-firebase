import Ember from 'ember';
const { get } = Ember;

const nodeWatcher = (dispatch, actionCreator) => function nodeWatcher(snap) {
  if (typeof actionCreator === 'string') {
    dispatch({
      type: actionCreator,
      changed: snap.val()
    });
  } else {
    actionCreator(snap.val());
  }
};

const addWatcher = (dispatch, actionCreator) => function addWatcher(snap, prevKey) {
  if (typeof actionCreator === 'string') {
    dispatch({
      type: `${actionCreator}_ADDED`,
      operation: 'added',
      data: snap.val(),
      key: snap.key,
      prevKey
    });
  } else {
    actionCreator(snap.val(), prevKey);
  }
};

const listWatcher = (operation, dispatch, actionCreator) => function listWatcher(snap) {
  if (typeof actionCreator === 'string') {
    const opShortName = operation.split('_')[1];
    dispatch({
      type: `${actionCreator}_${opShortName.toUpperCase()}`,
      operation: opShortName,
      data: snap.val(),
      key: snap.key
    });
  } else {
    actionCreator(snap.val());
  }
}

const watch = (context) => {
  const dispatch = get(context, 'redux').dispatch;
  return {
    node(ref, actionCreator) {
      const reference = typeof ref === 'string'
        ? context.ref(ref)
        : ref;
      // console.log(`Reference to: `, reference.path.o);
      reference.on('value', nodeWatcher(dispatch, actionCreator));
      const watcher = {reference, path: reference.path.o, event: 'value', fn: nodeWatcher(dispatch, actionCreator)};
      dispatch({type: 'FIREBASE/WATCHER_ADD', watcher});
      context.addWatcher(watcher);
    },

    list(ref, actionCreator) {
      const reference = typeof ref === 'string'
        ? context.ref(ref)
        : ref;

      let watcher = addWatcher(dispatch, actionCreator);
      reference.on('child_added', watcher);
      context.addWatcher({reference, event: 'child_added', fn: watcher});

      watcher = listWatcher('removed', dispatch, actionCreator);
      reference.on('child_removed', watcher);
      context.addWatcher({reference, event: 'child_removed', fn: watcher});

      watcher = listWatcher('changed', dispatch, actionCreator);
      reference.on('child_changed', watcher);
      context.addWatcher({reference, event: 'child_changed', fn: watcher});
    }
  };
};

export default watch;