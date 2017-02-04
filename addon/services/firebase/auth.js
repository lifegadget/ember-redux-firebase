const auth = (context, app) => {
  return {
    // AUTH
    emailAndPassword: (email, password) => {
      const {redux} = context.getProperties('redux');

      redux.dispatch({
        type: 'AUTH_REQUEST',
        kind: 'emailAndPassword',
        email
      });
      app.auth().signInWithEmailAndPassword(email, password)
        .then(user => {
          redux.dispatch({
            type: 'AUTH_SUCCESS',
            user
          });
        })
        .catch(e => {
          redux.dispatch({
            type: 'AUTH_FAILURE',
            code: e.code,
            message: e.message,
            email
          });
        });
    },
    // END AUTH
  };
};

export default auth;