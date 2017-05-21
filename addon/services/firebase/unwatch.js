import Ember from 'ember';
const { get } = Ember;

const unwatch = (context) => {
  const dispatch = get(context, 'redux.dispatch');
  let logoutCallbacks = [];

  return {
    all() {
      context.getWatchers().forEach(watcher => {
        context.ref(watcher.path).off(watcher.event);
      });
      context.setWatchers([]);
    },

    /**
     * Allows containers to state which watchers should be removed
     * at the LOG_OUT lifecycle event.
     * 
     * @param {Function} cb callback function to be executed at logout
     */
    onLogout(cb) {
      const higherOrder = () => cb(this, context);
      logoutCallbacks = logoutCallbacks.concat(higherOrder);
      return context;
    },

    /**
     * Executed by addon's AUTH reducer when a user logs out
     */
    loggedOut: () => {
      if (logoutCallbacks.length > 0) {
        dispatch({
          type: '@firebase/auth/LOGOUT_CALLBACKS@attempt`',
          registeredCallbacks: logoutCallbacks.length
        });
      }
      logoutCallbacks.forEach(cb => cb());
    },

    /**
     * removes the "value" event associated with a node listener
     */
    node(path) {
      context.ref(path).off('value');
    },

    /**
     * removes all events associated with a list of elements at a given path
     */
    list(path) {
      const ops = ['child_added', 'child_removed', 'child_removed'];
      ops.forEach(op => {
        context.ref(path).off(op);
        context.setWatcher(
          context.getWatchers().filter(w => !(w.event === op && op.path === w.path))
        );
      });
    },

    /**
     * removes all events associated with a given path, you 
     * may use a wildcard character at the end to remove all paths
     * beyond a certain point
     */
    byPath(path) {
      const filtered = (w) => w.path.indexOf(/\*$/) === -1
        ? w.path === path
        : w.replace('*', '').indexOf(path) !== -1;
      const not = (fn) => !fn();
      const removing = context.getWatchers().filter(filtered);
      const remaining = context.getWatchers().filter(not(filtered));

      removing.forEach(r => {
        context.ref(r.path).off(r.event)
        dispatch({
          type: '@firebase/WATCHER_REMOVE'
        })
      }
      );

      toBeRemoved.forEach(watcher => context.ref(path).off(
        null,
        removed(watcher.path, 'byPath'), 
        watcher.eventContext 
      ));
    },
  };
};

export default unwatch;