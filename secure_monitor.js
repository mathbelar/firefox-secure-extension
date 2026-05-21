

function auditStorage() {
  const ls = [], ss = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      const v = localStorage.getItem(k) || "";
      ls.push({ key: k, size: v.length });
    }
  } catch (e) {}
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      const v = sessionStorage.getItem(k) || "";
      ss.push({ key: k, size: v.length });
    }
  } catch (e) {}
  return { localStorage: ls, sessionStorage: ss, domain: location.hostname };
}

function auditIndexedDB() {
  if (!indexedDB || !indexedDB.databases) return Promise.resolve([]);
  return indexedDB.databases().then(dbs =>
    dbs.map(db => ({ name: db.name, version: db.version }))
  ).catch(() => []);
}

// Envia storage + IndexedDB após página carregar
function sendStorageData() {
  const storageData = auditStorage();
  auditIndexedDB().then(idbData => {
    browser.runtime.sendMessage({
      type: "storage",
      data: { ...storageData, indexedDB: idbData }
    }).catch(() => {});
  });
}

// Envia imediatamente e de novo após 1,5s para capturar storage gravado após o load
sendStorageData();
setTimeout(sendStorageData, 1500);

try {
  const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.toDataURL = function (...args) {
    browser.runtime.sendMessage({ type: "fingerprint", method: "Canvas.toDataURL" }).catch(() => {});
    return origToDataURL.apply(this, args);
  };

  const origGetImageData = CanvasRenderingContext2D.prototype.getImageData;
  CanvasRenderingContext2D.prototype.getImageData = function (...args) {
    browser.runtime.sendMessage({ type: "fingerprint", method: "Canvas.getImageData" }).catch(() => {});
    return origGetImageData.apply(this, args);
  };
} catch (e) {}

try {
  const origGetParam = WebGLRenderingContext.prototype.getParameter;
  WebGLRenderingContext.prototype.getParameter = function (param) {
    // 0x9245 = UNMASKED_VENDOR_WEBGL, 0x9246 = UNMASKED_RENDERER_WEBGL
    if (param === 0x9245 || param === 0x9246) {
      browser.runtime.sendMessage({ type: "fingerprint", method: "WebGL.getParameter" }).catch(() => {});
    }
    return origGetParam.apply(this, arguments);
  };
} catch (e) {}

// ---------- 5. AUDIOCONTEXT FINGERPRINTING ----------
try {
  const origCreateOsc = AudioContext.prototype.createOscillator;
  AudioContext.prototype.createOscillator = function (...args) {
    browser.runtime.sendMessage({ type: "fingerprint", method: "AudioContext.createOscillator" }).catch(() => {});
    return origCreateOsc.apply(this, args);
  };

  const origCreateDyn = AudioContext.prototype.createDynamicsCompressor;
  AudioContext.prototype.createDynamicsCompressor = function (...args) {
    browser.runtime.sendMessage({ type: "fingerprint", method: "AudioContext.createDynamicsCompressor" }).catch(() => {});
    return origCreateDyn.apply(this, args);
  };
} catch (e) {}

// ---------- 6. HIJACKING — scripts externos injetados dinamicamente ----------
try {
  const observer = new MutationObserver(mutations => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (
          node.tagName === "SCRIPT" &&
          node.src &&
          !node.src.startsWith(location.origin) &&
          !node.src.startsWith("moz-extension://")
        ) {
          browser.runtime.sendMessage({
            type: "hijack",
            src: node.src,
            reason: "dynamic-script"
          }).catch(() => {});
        }
      }
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
} catch (e) {}

// ---------- 7. HIJACKING — redirecionamentos via JS ----------
try {
  const origAssign   = location.assign.bind(location);
  const origReplace  = location.replace.bind(location);

  Object.defineProperty(location, "href", {
    set(val) {
      if (!val.startsWith(location.origin)) {
        browser.runtime.sendMessage({
          type: "hijack",
          src: val,
          reason: "location-redirect"
        }).catch(() => {});
      }
      origAssign(val);
    }
  });
} catch (e) {}