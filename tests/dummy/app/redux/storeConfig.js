import redux from 'npm:redux';
import { combineReducers } from 'npm:redux-immutable';
import Immutable from 'npm:immutable';

import reducers from './reducers/index';
import enhancers from './enhancers/index';
import middleware from './middleware/index';
import initialState from './state-initializers/index';
import config from 'ember-get-config';

const { createStore, applyMiddleware, compose } = redux;
const devTools = window.devToolsExtension ? window.devToolsExtension({serialize: true}) : f => f;
const createStoreWithMiddleware = compose(applyMiddleware(...middleware), devTools, enhancers)(createStore);
const initialize = (c) => {
  const raw = Object.keys(initialState)
    .map(i => {
      return { [i]: initialState[i].loadState(c) };
    })
    .reduce( (prev, current) => Object.assign({}, prev, {[current.key]: current.value}) );
  return Immutable.Map(raw);
};

export default function(addonReducers) {
  const combinedReducers = typeof reducers === 'function'
    ? reducers
    : combineReducers(Object.assign({}, reducers, addonReducers));

  return createStoreWithMiddleware(combinedReducers, initialize(config));
}
