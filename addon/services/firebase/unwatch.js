const unwatch = (app, watchers) => {

  return {
    all() {
      watchers.forEach(watcher => {
        watcher.reference.off(watcher.event, watcher.fn);
      });
      watchers = [];
    },

    node(ref) {
      const reference = typeof ref === 'string' ? app.ref(ref) : ref;
      reference.off('value');

    },

    list(ref) {
      const reference = typeof ref === 'string' ? app.ref(ref) : ref;
      const ops = ['child_added', 'child_removed', 'child_removed'];
      ops.forEach(op => {
        reference.off(op);
        watchers = watchers.filter(w => !(w.event === op && reference.path.o.join() === w.reference.join()));
      });
    }
  };
};

export default unwatch;