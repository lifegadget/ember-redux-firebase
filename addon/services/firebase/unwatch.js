const unwatch = (context , watchers) => {

  return {
    all() {
      watchers.forEach(watcher => {
        context.ref(watcher.path).off(watcher.event);
      });
      watchers = [];
    },

    node(path) {
      context.ref(path).off('value');
    },

    list(path) {
      const ops = ['child_added', 'child_removed', 'child_removed'];
      ops.forEach(op => {
        context.ref(path).off(op);
        watchers = watchers.filter(w => !(w.event === op && op.path === w.path));
      });
    }
  };
};

export default unwatch;