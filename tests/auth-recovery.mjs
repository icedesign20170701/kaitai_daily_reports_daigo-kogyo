import assert from 'node:assert/strict';
import { build } from 'esbuild';

// Run the production provider with controlled hooks, browser events, and requests.
// No credentials or network are used.
const timers = new Map();
let nextTimer = 0;
const schedule = (callback, delay) => { timers.set(++nextTimer, { callback, delay }); return nextTimer; };
const cancel = id => timers.delete(id);
const storage = () => {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key), clear: () => values.clear() };
};
globalThis.window = Object.assign(new EventTarget(), { setTimeout: schedule, clearTimeout: cancel });
globalThis.document = Object.assign(new EventTarget(), { visibilityState: 'visible' });
globalThis.localStorage = storage();
globalThis.sessionStorage = storage();
globalThis.setTimeout = schedule;
globalThis.clearTimeout = cancel;
const flush = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };
const fire = async delay => {
  for (const [id, timer] of [...timers]) if (timer.delay === delay) { timers.delete(id); timer.callback(); }
  await flush();
};
let states = [];
let effects = [];
let callback;
let profileLoader;
let signOutLoader;
let recoveryLoader;
let signOutCalls;
let sessionCalls;
const session = id => ({ user: { id } });
globalThis.__hooks = {
  createContext: () => ({ Provider: 'provider' }),
  useState: initial => { const i = states.length; states.push(initial); return [initial, value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }]; },
  useEffect: effect => effects.push(effect),
  useCallback: fn => fn,
  useMemo: fn => fn(),
  useContext: () => null,
};
globalThis.__supabase = {
  auth: {
    onAuthStateChange: cb => { callback = cb; return { data: { subscription: { unsubscribe() {} } } }; },
    signOut: async () => { signOutCalls++; return signOutLoader(); },
    getSession: async () => { sessionCalls++; return { data: { session: session('a') }, error: null }; },
  },
  from: () => {
    const query = { select: () => query, eq: () => query, insert: () => query, maybeSingle: () => profileLoader() };
    return query;
  },
};
globalThis.__recover = () => recoveryLoader();
const result = await build({
  stdin: { contents: 'export { AuthProvider } from "./src/features/auth/auth-context"; export { withSupabaseRecovery } from "./src/lib/utils";', resolveDir: process.cwd() },
  bundle: true, write: false, format: 'esm', platform: 'node', jsx: 'automatic', tsconfig: 'tsconfig.app.json',
  plugins: [{ name: 'controlled-dependencies', setup(builder) {
    builder.onResolve({ filter: /^react(?:\/jsx-runtime)?$/ }, args => ({ path: args.path, namespace: 'mock' }));
    builder.onResolve({ filter: /^@\/lib\/supabase$/ }, () => ({ path: 'supabase', namespace: 'mock' }));
    builder.onLoad({ filter: /.*/, namespace: 'mock' }, args => ({ contents:
      args.path === 'react' ? 'export const {createContext,useState,useEffect,useCallback,useMemo,useContext}=globalThis.__hooks;' :
      args.path === 'react/jsx-runtime' ? 'export const jsx=(type,props)=>({type,props});' :
      'export const supabase=globalThis.__supabase; export const isSupabaseConfigured=true; export const BACKGROUND_SIGN_OUT_MS=300000; export const BACKGROUND_SIGN_OUT_REQUEST_KEY="kaitai-background-signout-requested"; export const recoverSupabaseConnection=()=>globalThis.__recover();'
    }));
  } }],
});
const { AuthProvider, withSupabaseRecovery } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
const mount = (preserveStorage = false) => {
  states = []; effects = []; timers.clear();
  if (!preserveStorage) { localStorage.clear(); sessionStorage.clear(); }
  profileLoader = async () => ({ data: { user_id: 'a', is_master: true }, error: null });
  signOutLoader = async () => ({ error: null });
  recoveryLoader = async () => {};
  signOutCalls = 0; sessionCalls = 0;
  AuthProvider({ children: null });
  return effects[0]();
};
const show = () => window.dispatchEvent(new Event('pageshow'));
let cleanup = mount();
assert.equal(callback('SIGNED_IN', session('a')), undefined, 'auth callback must return synchronously');
assert.equal(states[3], true);
await fire(0);
assert.equal(states[2].user_id, 'a');
assert.equal(states[3], false);
sessionStorage.setItem('kaitai-hidden-at', String(Date.now() - 1000));
show(); show(); await flush();
assert.equal(sessionCalls, 1, 'duplicate resume events handled once');
assert.equal(signOutCalls, 0);
assert.equal(states[3], false, 'short resume keeps mounted form');
sessionStorage.setItem('kaitai-hidden-at', String(Date.now() - 300001));
show(); show(); await flush();
assert.equal(signOutCalls, 1);
assert.equal(states[1], null);
callback('SIGNED_IN', session('a')); await fire(0);
assert.equal(states[1].id, 'a', 'login after forced logout remains possible');
cleanup();

cleanup = mount();
let resolveProfile;
profileLoader = () => new Promise(resolve => { resolveProfile = resolve; });
callback('SIGNED_IN', session('a')); await fire(0);
callback('SIGNED_OUT', null);
resolveProfile({ data: { user_id: 'a', is_master: true }, error: null }); await flush();
assert.equal(states[2], null, 'late profile cannot restore signed-out user');
cleanup();

cleanup = mount();
profileLoader = () => new Promise(() => {});
callback('SIGNED_IN', session('a')); await fire(0); await fire(8000);
assert.match(states[4], /タイムアウト/);
assert.equal(states[3], false);
cleanup();

cleanup = mount();
await fire(15000);
assert.match(states[4], /タイムアウト/);
assert.equal(states[3], false, 'missing initial auth event reaches error');
cleanup();

cleanup = mount();
signOutLoader = () => new Promise(() => {});
sessionStorage.setItem('kaitai-hidden-at', String(Date.now() - 300001));
show(); await fire(5000);
assert.match(states[4], /タイムアウト/);
assert.equal(localStorage.getItem('kaitai-background-signout-requested'), '1');
callback('SIGNED_IN', session('a'));
assert.equal(states[1], null, 'failed sign-out must not restore authenticated screen');
cleanup();

// A retry remount must finish the pending logout, then allow a fresh login.
cleanup = mount(true);
await flush();
assert.equal(signOutCalls, 1);
assert.equal(localStorage.getItem('kaitai-background-signout-requested'), null);
callback('SIGNED_IN', session('a')); await fire(0);
assert.equal(states[1].id, 'a');
cleanup();

sessionStorage.setItem('kaitai-hidden-at', String(Date.now() - 300001));
cleanup = mount(true);
await flush();
assert.equal(signOutCalls, 1, 'long absence is recognized on a fresh mount');
cleanup();

recoveryLoader = () => new Promise(() => {});
let calls = 0;
const blocked = withSupabaseRecovery(() => { calls++; return new Promise(() => {}); }, 10).catch(error => error);
await fire(10); await fire(5000);
assert.match((await blocked).message, /復旧がタイムアウト/);
assert.equal(calls, 1);
recoveryLoader = async () => {};
calls = 0;
const retried = withSupabaseRecovery(() => { calls++; return calls === 1 ? Promise.reject(new Error('network')) : Promise.resolve('ok'); }, 10);
await flush(); await fire(250);
assert.equal(await retried, 'ok');
assert.equal(calls, 2);
console.log('PASS: synchronous auth notification, profile loading, short/long resume, duplicate events, re-login, stale response, auth/profile/sign-out/recovery timeouts, retry');
