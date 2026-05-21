function auditStorage() {
  const ls = [], ss = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    ls.push({ key: k, size: localStorage.getItem(k).length });
  }
  for (let i = 0; i < sessionStorage.length; i++) {
    const k = sessionStorage.key(i);
    ss.push({ key: k, size: sessionStorage.getItem(k).length });
  }
  return { localStorage: ls, sessionStorage: ss, domain: location.hostname };
}

browser.runtime.sendMessage({ type: "storage", data: auditStorage() });


// Canvas fingerprinting
const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
HTMLCanvasElement.prototype.toDataURL = function(...args) {
  browser.runtime.sendMessage({ type: "fingerprint", method: "Canvas.toDataURL" });
  return origToDataURL.apply(this, args);
};

// WebGL
const origGetParam = WebGLRenderingContext.prototype.getParameter;
WebGLRenderingContext.prototype.getParameter = function(param) {
  if (param === 0x9245 || param === 0x9246) { // WEBGL_debug_renderer_info
    browser.runtime.sendMessage({ type: "fingerprint", method: "WebGL.getParameter" });
  }
  return origGetParam.apply(this, arguments);
};

// AudioContext
const origCreateOsc = AudioContext.prototype.createOscillator;
AudioContext.prototype.createOscillator = function(...args) {
  browser.runtime.sendMessage({ type: "fingerprint", method: "AudioContext.createOscillator" });
  return origCreateOsc.apply(this, args);
};

const observer = new MutationObserver(mutations => {
  for (const m of mutations) {
    for (const node of m.addedNodes) {
      if (node.tagName === 'SCRIPT' && node.src && !node.src.startsWith(location.origin)) {
        browser.runtime.sendMessage({ type: "hijack", src: node.src });
      }
    }
  }
});
observer.observe(document.documentElement, { childList: true, subtree: true });