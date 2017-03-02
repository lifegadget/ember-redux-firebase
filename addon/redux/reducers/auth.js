import Immutable from 'npm:immutable';
/**
 * counterparties Reducer
 */
const defaultState = Immutable.OrderedMap();
const reducer = (state, action) => {

  switch(action.type) {
    case '@firebase/AUTH/CURRENT_USER_CHANGED':
      return state.merge({currentUser: action.user});
      
    case '@firebase/AUTH/SUCCESS':
      return state
        .merge({
          isAuthenticated: true,
          currentUser: action.user,
        })
        .delete('code')
        .delete('message');

    case '@firebase/AUTH/SIGN_OUT':
    case '@firebase/AUTH/FAILURE':
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
