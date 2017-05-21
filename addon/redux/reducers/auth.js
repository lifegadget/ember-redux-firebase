import Immutable from 'npm:immutable';
/**
 * counterparties Reducer
 */
const defaultState = Immutable.OrderedMap();
const reducer = (state, action) => {

  switch(action.type) {
    case '@firebase/auth/CURRENT_USER_CHANGED':
      return state.merge({currentUser: action.user});
      
    case '@firebase/auth/SUCCESS':
      // action.firebase.watch().loggedIn(action.user);
      return state
        .merge({
          isAuthenticated: true,
          currentUser: action.user,
        })
        .delete('code')
        .delete('message');

    case '@firebase/auth/LOGGED_IN':
      // action.firebase.watch().loggedIn(action.user);
      return state;

    case '@firebase/auth/LOGGED_OUT':
    case '@firebase/auth/FAILURE':
      action.firebase.unwatch().loggedOut();
      return state.merge({
        isAuthenticated: false,
        currentUser: null,
        code: action.code,
        message: action.message,
      });

    default:
      return state || defaultState;
  } // end switch

};

export default reducer;
