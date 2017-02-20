import Immutable from 'npm:immutable';
/**
 * app Reducer
 */
const defaultState = Immutable.OrderedMap();
const reducer = (state, action) => {

  switch(action.type) {

    case 'FIREBASE/APP/INITIALIZED':
      return state.merge({
        initialized: true,
        appName: action.appName,
        url: action.url
      });


    default:
      return state || defaultState;
  } // end switch

};

export default reducer;
