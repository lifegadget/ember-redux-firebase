import Immutable from 'npm:immutable';
/**
 * counterparties Reducer
 */
const defaultState = Immutable.OrderedMap();
const reducer = (state, action) => {

  switch(action.type) {
    case 'FIREBASE/AUTH/CURRENT_USER_CHANGED':
      return state.merge({currentUser: action.user});
      
    case 'FIREBASE/AUTH/SUCCESS':
      return state
        .merge({
          isAuthenticated: true,
          currentUser: action.user,
        })
        .delete('code')
        .delete('message');

    case 'FIREBASE/AUTH/SIGN_OUT':
    case 'FIREBASE/AUTH/FAILURE':
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
