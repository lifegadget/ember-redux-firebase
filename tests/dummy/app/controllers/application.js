import Ember from 'ember';

export default Ember.Controller.extend({
  firebase: Ember.inject.service(),
  redux: Ember.inject.service(),

  actions: {
    login(username, password) {
      const {firebase, redux} = this.getProperties('firebase', 'redux');
      console.log('login: ', username, password);
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
    }
  }
});
