export const AUTH_STATE_EVENT = 'hydrosafe:auth-state-changed';

export const broadcastAuthStateChange = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_STATE_EVENT));
  }
};
