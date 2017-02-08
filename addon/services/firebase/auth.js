import Ember from 'ember';
const { debug, RSVP } = Ember;
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
            resolve(user);
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
    signInAnonymously() {
      const { redux } = context.getProperties('redux');
      return new RSVP.Promise((resolve, reject) => {

        redux.dispatch({
          type: 'FIREBASE/AUTH/REQUEST',
          kind: 'anonymous'
        });
        app.auth().signInAnonymously()
          .then(user => {
            loggedInUser = user.uid;
            redux.dispatch({
              type: 'FIREBASE/AUTH/SUCCESS',
              user
            });
            resolve(user);
          })
          .catch(e => {
            redux.dispatch({
              type: 'FIREBASE/AUTH/FAILURE',
              code: e.code,
              message: e.message
            });
            reject(e);
          });

      }); // end Promise
    },
    updateProfile(props) {
      const { redux } = context.getProperties('redux');
      const dispatch = redux.dispatch;
      return new RSVP.Promise((resolve, reject) => {

      if(props.email) {
        const email = props.email;
        dispatch({type: 'FIREBASE/AUTH/PROFILE_EMAIL/SETTING', email})
        app.auth().currentUser.updateEmail(props.email)
          .then(() => dispatch({type: 'FIREBASE/AUTH/PROFILE_EMAIL/SUCCESS', email}))
          .catch((e) => dispatch({
            type: 'FIREBASE/AUTH/PROFILE_EMAIL/FAILED', 
            email, 
            code: e.code,
            message: e.message
          }));
        delete props.email;
      }

      dispatch({type: 'FIREBASE/AUTH/PROFILE/SETTING', props})
      app.auth().currentUser.updateProfile(props) 
          .then(() => dispatch({type: 'FIREBASE/AUTH/PROFILE/SUCCESS', props}))
          .then(resolve)
          .catch(reject);

      });
    },
    signOut() {
      const { redux } = context.getProperties('redux');
      redux.dispatch({
        type: 'FIREBASE/AUTH/SIGN_OUT',
        uid: loggedInUser
      });
      loggedInUser = null;
      return app.auth().signOut();
    },

    getCredential(provider, ...args) {
      switch(provider) {
        case 'email':
        case 'emailAndPassword':
          return window.firebase.auth.EmailAuthProvider(...args);
        case 'google':
          return window.firebase.auth.GoogleAuthProvider('googleUser.getAuthResponse().id_token');
        case 'facebook':
          return window.firebase.auth.FacebookAuthProvider('response.authResponse.accessToken');
      }
    } 

  };
};

export default auth;