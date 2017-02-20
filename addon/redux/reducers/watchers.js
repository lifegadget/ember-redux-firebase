import Immutable from 'npm:immutable';
/**
 * counterparties Reducer
 */
const defaultState = Immutable.List();
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
