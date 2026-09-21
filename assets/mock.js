/* Local self-test only: in-memory stand-in for Firebase (loaded solely on file:// with ?mock) */
(function () {
  "use strict";
  var store = {};       // "collection/id" -> data
  var listeners = [];   // functions re-run after every write
  function clone(x) { return x === undefined ? undefined : JSON.parse(JSON.stringify(x)); }
  function isObj(x) { return x && typeof x === "object" && !Array.isArray(x); }
  function merge(target, src) {
    var out = Object.assign({}, target);
    Object.keys(src).forEach(function (k) { out[k] = (isObj(src[k]) && isObj(out[k])) ? merge(out[k], src[k]) : clone(src[k]); });
    return out;
  }
  function notify() { Promise.resolve().then(function () { listeners.slice().forEach(function (fn) { fn(); }); }); }
  var seq = 0;

  function docSnap(id, data) { return { id: id, exists: data !== undefined, data: function () { return clone(data); } }; }
  function docRef(col, id) {
    var path = col + "/" + id;
    return {
      id: id, path: path,
      get: function () { return Promise.resolve(docSnap(id, store[path])); },
      set: function (data, opts) { store[path] = (opts && opts.merge && store[path]) ? merge(store[path], data) : clone(data); notify(); return Promise.resolve(); },
      update: function (data) { if (store[path] === undefined) { return Promise.reject(new Error("no doc")); } store[path] = Object.assign({}, store[path], clone(data)); notify(); return Promise.resolve(); },
      delete: function () { delete store[path]; notify(); return Promise.resolve(); },
      onSnapshot: function (cb) {
        var last = "";
        function fire() { var cur = JSON.stringify(store[path]); if (cur === last) { return; } last = cur; cb(docSnap(id, store[path])); }
        listeners.push(fire); Promise.resolve().then(fire);
        return function () { listeners = listeners.filter(function (f) { return f !== fire; }); };
      }
    };
  }
  function docsOf(col, order, dir) {
    var out = [];
    Object.keys(store).forEach(function (p) { var i = p.indexOf("/"); if (p.slice(0, i) === col) { out.push({ id: p.slice(i + 1), data: store[p] }); } });
    if (order) { out.sort(function (a, b) { var x = a.data[order] || "", y = b.data[order] || ""; return (x < y ? -1 : x > y ? 1 : 0) * (dir === "desc" ? -1 : 1); }); }
    return out.map(function (d) { return { id: d.id, data: function () { return clone(d.data); } }; });
  }
  function query(col, order, dir) {
    return {
      get: function () { var docs = docsOf(col, order, dir); return Promise.resolve({ docs: docs, size: docs.length, empty: !docs.length }); },
      onSnapshot: function (cb) {
        var last = "";
        function fire() { var docs = docsOf(col, order, dir); var cur = JSON.stringify(docs.map(function (d) { return [d.id, d.data()]; })); if (cur === last) { return; } last = cur; cb({ docs: docs, size: docs.length, empty: !docs.length }); }
        listeners.push(fire); Promise.resolve().then(fire);
        return function () { listeners = listeners.filter(function (f) { return f !== fire; }); };
      }
    };
  }
  function collection(col) {
    var q = query(col);
    return Object.assign({}, q, {
      doc: function (id) { return docRef(col, id || ("m" + (++seq))); },
      add: function (data) { var id = "m" + (++seq); store[col + "/" + id] = clone(data); notify(); return Promise.resolve(docRef(col, id)); },
      orderBy: function (f, dir) { return query(col, f, dir); }
    });
  }
  var db = {
    collection: collection,
    batch: function () {
      var ops = [];
      return { delete: function (ref) { ops.push(ref); }, commit: function () { ops.forEach(function (r) { delete store[r.path]; }); notify(); return Promise.resolve(); } };
    }
  };
  var user = { email: "qkrtjsdud26085@gmail.com", displayName: "테스트", photoURL: "" };
  var authObj = {
    currentUser: user,
    setPersistence: function () { return Promise.resolve(); },
    onAuthStateChanged: function (cb) { setTimeout(function () { cb(user); }, 0); return function () {}; },
    signOut: function () { return Promise.resolve(); },
    signInWithPopup: function () { return Promise.resolve(); }
  };
  var authFn = function () { return authObj; };
  authFn.GoogleAuthProvider = function () {};
  authFn.Auth = { Persistence: { LOCAL: "local" } };
  window.firebase = { initializeApp: function () {}, auth: authFn, firestore: function () { return db; } };
  window.__MOCK_STORE = store;
})();
