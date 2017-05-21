# Firebase Lifecycle Events

This addon recognizes the following lifecycle events:

- @firebase/app/CONNECTED
- @firebase/app/DISCONNECTED
- @firebase/auth/LOGGED_IN
- @firebase/auth/LOGGED_OUT
- @firebase/WATCHER_ADD
- @firebase/WATCHER_REMOVE

Each of the above events will be dispatched to **Redux** when they occur.