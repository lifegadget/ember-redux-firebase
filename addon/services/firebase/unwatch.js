const unwatch = (app) => {
  return {
    node(ref) {
      const reference = typeof ref === 'string' ? app.ref(ref) : ref;
      reference.off("value");
    },

    list(ref) {
      const reference = typeof ref === 'string' ? app.ref(ref) : ref;
      reference.off('added');
      reference.off('changed');
      reference.off('removed');
    }
  };
};

export default unwatch;