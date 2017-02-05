import Ember from 'ember';
const { RSVP } = Ember;
let loggedInUser = null;

const auth = (context, app) => {
  return {
    // AUTH
    emailAndPassword(email, password) {
      const { redux } = context.getProperties('redux');
      return new RSVP.Promise((resolve, reject) => {

        redux.dispatch({
          type: 'FIREBASE/AUTH/REQUEST',
          kind: 'emailAndPassword',
          email
        });
        app.auth().signInWithEmailAndPassword(email, password)
          .then(user => {
            loggedInUser = user.uid;
            redux.dispatch({
              type: 'FIREBASE/AUTH/SUCCESS',
              user
            });
            resolve();
          })
          .catch(e => {
            redux.dispatch({
              type: 'FIREBASE/AUTH/FAILURE',
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
        type: 'FIREBASE/AUTH/SIGN_OUT',
        uid: loggedInUser
      });
      loggedInUser = null;
    },

  };
};

export default auth;