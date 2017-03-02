import Immutable from 'npm:immutable';
/**
 * counterparties Reducer
 */
const defaultState = Immutable.List();
const reducer = (state, action) => {

  switch(action.type) {

    case '@firebase/WATCHER_ADD':
      return state.push(action.watcher);

    case '@firebase/WATCHER_REMOVE':
      return defaultState;

    case '@firebase/AUTH/SIGN_OUT':
      return defaultState;


    default:
      return state || defaultState;
  } // end switch

};

export default reducer;
