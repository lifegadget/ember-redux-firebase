const unwatch = (context, watchers) => {
const removed = (path, type) => () => {
  context.dispatch({

  });
};

  return {
    all() {
      watchers.forEach(watcher => {
        context.ref(watcher.path).off(watcher.event);
      });
      watchers = [];
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
        watchers = watchers.filter(w => !(w.event === op && op.path === w.path));
      });
    },

    /**
     * removes all events associated with a given path
     */
    byPath(path) {
      const toBeRemoved = watchers.filter()
      toBeRemoved.forEach(watcher => context.ref(path).off(
        null,
        removed(watcher.path, 'byPath'), 
        watcher.eventContext 
      ));
    },
  };
};

export default unwatch;