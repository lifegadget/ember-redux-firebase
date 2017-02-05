import Ember from 'ember';
const { inject: { service }} = Ember;

export default Ember.Controller.extend({
  firebase: service(),
  redux: service(),

  actions: {
    login(username, password) {
      const {firebase, redux} = this.getProperties('firebase', 'redux');
      firebase.auth().emailAndPassword(username, password, redux.dispatch);
    },
    loadService() {
      this.get('firebase'); 
    },
    referenceCheck() {
      this.get('firebase').ref('hello').once('value', (snapshot) => {
        console.log(snapshot.val());
      });
    },
    signOut() {
      this.get('firebase').auth().signOut();
    },
    getUserProfileForCurrentUser() {
      const cb = (dispatch) => (snap) => { 
        dispatch({
          type: 'USER_PROFILE_UPDATED',
          key: snap.key,
          data: snap.val()
        });
      };
      this.get('firebase').currentUserProfile('/users', cb(this.get('redux').dispatch));
    },
    checkAuthenticated() {
      if(this.get('firebase').isAuthenticated) {
        window.alert('You ARE authenticated');
      } else {
        window.alert('You are not authenticated');
      }
    }
  }
});
