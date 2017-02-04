import Ember from 'ember';
const { get } = Ember;

const watch = (context) => {
  const dispatch = get(context, 'redux').dispatch;
  return {
    node(ref, actionCreator) {
      const reference = typeof ref === 'string'
        ? context.ref(ref)
        : ref;
      reference.on('value', snap => {
        if (typeof actionCreator === 'string') {
          dispatch({
            type: actionCreator,
            changed: snap.val()
          });
        } else {
          actionCreator(snap.val());
        }
      });
    },

    list(ref, actionCreator) {
      const reference = typeof ref === 'string'
        ? context.ref(ref)
        : ref;
      reference.on('child_added', (snap, prevKey) => {
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
      });
      reference.on('child_removed', (snap) => {
        if (typeof actionCreator === 'string') {
          dispatch({
            type: `${actionCreator}_REMOVED`,
            operation: 'removed',
            data: snap.val(),
            key: snap.key
          });
        } else {
          actionCreator(snap.val());
        }
      });
      reference.on('child_changed', (snap) => {
        if (typeof actionCreator === 'string') {
          dispatch({
            type: `${actionCreator}_CHANGED`,
            operation: 'changed',
            data: snap.val(),
            key: snap.key
          });
        } else {
          actionCreator(snap.val());
        }
      });
      
    }
  };
};

export default watch;