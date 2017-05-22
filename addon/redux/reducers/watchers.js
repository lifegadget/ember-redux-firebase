import Immutable from 'npm:immutable';
/**
 * counterparties Reducer
 */
const defaultState = Immutable.List();
const reducer = (state, action) => {

  switch(action.type) {

    case '@firebase/watch/ADD':
      action.firebase.addWatcher(action.watcher);
      return state.push(action.watcher);

    case '@firebase/watch/REMOVE':
      return defaultState;


    default:
      return state || defaultState;
  } // end switch

};

export default reducer;
