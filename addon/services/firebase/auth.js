import Ember from 'ember';
const { RSVP: {Promise} } = Ember;
let loggedInUser = null;

const auth = (context, app) => {
  const { redux } = context.getProperties('redux');
  const dispatch = redux.dispatch;

  const handleSuccess = (resolve, type, params = {}) => {
    const payload = Ember.assign({}, params, {
      type: `${type}_SUCCESS`, 
      firebase: context
    });
    dispatch(payload);
    resolve(payload);
  };
  const handleError = (err, reject, type, params = {}) => {
    dispatch(Ember.assign({}, params, {
      type: `${type}_FAILURE`, 
      code: err.code || 'not-specified', 
      firebase: context,
      message: err.message || err
    }));
    reject(err);
  };

  const getCredential = (provider, ...args) => {
    switch(provider) {
      case 'email':
      case 'emailAndPassword':
      const [email, password] = args;
        return window.firebase.auth.EmailAuthProvider.credential(email, password);
      case 'google':
        return window.firebase.auth.GoogleAuthProvider.credential('googleUser.getAuthResponse().id_token');
      case 'facebook':
        return window.firebase.auth.FacebookAuthProvider.credential('response.authResponse.accessToken');
    }
  }; 

  return {
    // AUTH
    emailAndPassword(email, password) {
      return new Promise((resolve, reject) => {

        dispatch({
          type: '@firebase/auth/REQUEST',
          kind: 'emailAndPassword',
          email
        });
        app.auth().signInWithEmailAndPassword(email, password)
          .then(user => {
            loggedInUser = user.uid;
            redux.dispatch({
              type: '@firebase/auth/SUCCESS',
              firebase: context,
              user
            });
            resolve(user);
          })
          .catch(e => {
            dispatch({
              type: '@firebase/auth/FAILURE',
              code: e.code,
              message: e.message,
              firebase: context,
              email
            });
            reject(e);
          });

      }); // end PROMISE
    }, // end emailAndPassword
    signInAnonymously() {
      return new Promise((resolve, reject) => {
        const action = '@firebase/auth';

        dispatch({
          type: `${action}_ATTEMPT`,
          kind: 'anonymous'
        });
        app.auth().signInAnonymously()
          .then(user => Promise.resolve( loggedInUser = user.uid ))
          .then( ( ) => handleSuccess(resolve, action, {uid: loggedInUser}) )
          .catch((e) => handleError(e, reject, action, {}) );

      }); // end Promise
    },
    
    updateProfileEmail(email) {
      return new Promise((resolve, reject) => {
        const action = '@firebase/auth/PROFILE_EMAIL';
        dispatch({type: `${action}_ATTEMPT`, email});
        if(app.auth().currentUser) {
          app.auth().currentUser.updateEmail(email)
            .then( ( ) => handleSuccess(resolve, action, {email}) )
            .catch((e) => handleError(e, reject, action, {email}) );
        } else {
          handleError(
            new Error('Attempt to update profile email when not logged in'),
            reject, action, {email} 
          );
        }
      });
    },

    updateProfile(props) {
      return new Promise((resolve, reject) => {

        let action = '@firebase/auth/PROFILE_EMAIL';
        if(props.email) {
          Ember.debug('ember-redux-firebase: do not include email updates in updateProfile(), use updateProfileEmail() instead.');
          delete props.email;
        }

        if (Object.keys(props).length > 0) {
          action = '@firebase/auth/PROFILE_UPDATE';
          dispatch({type: `${action}_ATTEMPT`, props});
          app.auth().currentUser.updateProfile(props) 
              .then( ( ) => handleSuccess(resolve, action, props) )
              .catch((e) => handleError(e, reject, action, props) );
        } else {
          resolve();
        }

      });
    },
    signOut() {
      loggedInUser = null;
      // this will trigger dispatch of LOGGED_OUT
      return app.auth().signOut();
    },
    /**
     * Send an email to logged in user to verfy their account
     */
    sendEmailVerification() {
      // debugger;
      const email = app.auth().currentUser.email;
      const action = '@firebase/auth/EMAIL_VERIFICATION';
      dispatch({type: `${action}_ATTEMPT`, email});
      return new Promise((resolve, reject) => {
        app.auth().currentUser.sendEmailVerification()
          .then( ( ) => handleSuccess(resolve, action, {email}) )
          .catch((e) => handleError(e, reject, action, {email}) );
      });
    },

    sendPasswordResetEmail(newPassword) {
      const action = '@firebase/auth/PASSWORD_RESET';
      dispatch({type: `${action}_ATTEMPT`, newPassword});
      return new Promise((resolve, reject) => {
        app.auth().currentUser.sendPasswordResetEmail(newPassword)
          .then( ( ) => handleSuccess(resolve, action, {}) )
          .catch((e) => handleError(e, reject, action, {}) );
      });
    },

    updatePassword(newPassword) {
      const action = '@firebase/auth/UPDATE_PASSWORD';
      dispatch({type: `${action}_ATTEMPT`});
      return new Promise((resolve, reject) => {
        app.auth().currentUser.updatePassword(newPassword)
          .then( ( ) => handleSuccess(resolve, action, {}) )
          .catch((e) => handleError(e, reject, action, {}) );
      });
    },

    /**
     * Upgrades an anonymous account to a Email and Password account
     */
    upgradeToEmailAndPassword(username, password) {
      const action = '@firebase/auth/UPGRADE_ACCOUNT';
      dispatch({
        type: `${action}_ATTEMPT`, 
        target: 'email/password', 
        message: 'upgrading from anonymous account to email/password'
      });
      const credential = getCredential('emailAndPassword', username, password);
      return new Promise((resolve, reject) => {
        
        app.auth().currentUser.link(credential)
          .then( (user) => handleSuccess(resolve, action, {user}) )
          .catch((e) => handleError(e, reject, action, {}) );
      });

    },

  };
};

export default auth;