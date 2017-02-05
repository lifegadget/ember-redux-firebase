import Ember from 'ember';
/**
 * counterparties Reducer
 */
const defaultState = window.Immutable.List();
const reducer = (state, action) => {

  switch(action.type) {

    case 'FIREBASE/WATCHER_ADD':
      return state.push(action.watcher);

    case 'FIREBASE/WATCHER_REMOVE':
      return defaultState;

    case 'FIREBASE/AUTH/SIGN_OUT':
      return defaultState;


    default:
      return state || defaultState;
  } // end switch

};

export default reducer;
