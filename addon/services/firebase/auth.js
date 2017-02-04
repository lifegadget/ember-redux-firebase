import Ember from 'ember';
const { RSVP } = Ember;
let loggedInUser = null;

const auth = (context, app) => {
  return {
    // AUTH
    emailAndPassword(email, password) {
      const { redux, firebase } = context.getProperties('redux', 'firebase');
      return new RSVP.Promise((resolve, reject) => {

        redux.dispatch({
          type: 'AUTH_REQUEST',
          kind: 'emailAndPassword',
          email
        });
        app.auth().signInWithEmailAndPassword(email, password)
          .then(user => {
            loggedInUser = user.uid;
            redux.dispatch({
              type: 'AUTH_SUCCESS',
              user
            });
            if(context._currentUserProfile) {
              firebase.watch.node(`${context._currentUserProfile}.${user.uid}`, 'USER_PROFILE_UPDATED');
            }
            resolve();
          })
          .catch(e => {
            redux.dispatch({
              type: 'AUTH_FAILURE',
              code: e.code,
              message: e.message,
              email
            });
            reject(e);
          });

      }); // end PROMISE
    }, // end emailAndPassword
    signOut() {
      const { redux } = context.getProperties('redux');
      app.auth().signOut();
      redux.dispatch({
        type: 'AUTH_LOG_OFF',
        uid: loggedInUser
      });
      loggedInUser = null;
    },

  };
};

export default auth;