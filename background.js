// ============================================================
// background.js — Background Script
// ============================================================

const tabData = {};

function initTab(tabId) {
  tabData[tabId] = {
    thirdParty:   [],
    cookies:      [],
    fingerprints: [],
    storage:      { localStorage: [], sessionStorage: [], indexedDB: [] },
    hijacks:      [],
    supercookies: []
  };
}

// ---------- 1. DOMÍNIOS DE TERCEIRA PARTE ----------
browser.webRequest.onBeforeRequest.addListener(
  (details) => {
    const { tabId, url, type, originUrl } = details;
    if (tabId < 0 || !originUrl) return;

    let reqHost, originHost;
    try {
      reqHost    = new URL(url).hostname;
      originHost = new URL(originUrl).hostname;
    } catch (e) { return; }

    const isThirdParty =
      reqHost !== originHost &&
      !reqHost.endsWith("."    + originHost) &&
      !originHost.endsWith("." + reqHost);

    if (!tabData[tabId]) initTab(tabId);

    if (isThirdParty) {
      // Evita duplicatas do mesmo domínio+tipo
      const already = tabData[tabId].thirdParty.some(
        r => r.domain === reqHost && r.type === type
      );
      if (!already) {
        tabData[tabId].thirdParty.push({ domain: reqHost, type });
      }
    }
  },
  { urls: ["<all_urls>"] }
);

// ---------- 2. SUPERCOOKIES — ETags e HSTS ----------
browser.webRequest.onHeadersReceived.addListener(
  (details) => {
    if (!tabData[details.tabId]) return;

    const headers = details.responseHeaders || [];

    const etag = headers.find(h => h.name.toLowerCase() === "etag");
    const hsts = headers.find(h => h.name.toLowerCase() === "strict-transport-security");

    // ETag usado repetidamente = supercookie potencial
    if (etag) {
      const already = tabData[details.tabId].supercookies.some(
        s => s.type === "ETag" && s.url === details.url
      );
      if (!already) {
        tabData[details.tabId].supercookies.push({
          type: "ETag",
          url: details.url,
          value: etag.value ? etag.value.substring(0, 40) : ""
        });
      }
    }

    if (hsts) {
      const already = tabData[details.tabId].supercookies.some(
        s => s.type === "HSTS" && s.url === details.url
      );
      if (!already) {
        tabData[details.tabId].supercookies.push({
          type: "HSTS",
          url: details.url
        });
      }
    }
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
);

// ---------- 3. REDIRECIONAMENTOS SUSPEITOS ----------
browser.webRequest.onBeforeRedirect.addListener(
  (details) => {
    if (!tabData[details.tabId]) return;
    if (details.statusCode >= 300 && details.statusCode < 400) {
      tabData[details.tabId].hijacks.push({
        from:   details.url,
        to:     details.redirectUrl,
        reason: "http-redirect"
      });
    }
  },
  { urls: ["<all_urls>"] }
);

// ---------- 4. COOKIES ----------
browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Limpa ao iniciar navegação
  if (changeInfo.status === "loading") {
    initTab(tabId);
  }

  // Busca cookies quando página termina de carregar
  if (changeInfo.status === "complete" && tab.url) {
    try {
      const origin     = new URL(tab.url).hostname;
      const allCookies = await browser.cookies.getAll({ url: tab.url });

      if (!tabData[tabId]) initTab(tabId);

      tabData[tabId].cookies = allCookies.map(c => ({
        name:       c.name,
        domain:     c.domain,
        firstParty: c.domain.includes(origin) ||
                    origin.includes(c.domain.replace(/^\./, "")),
        session:    !c.expirationDate,
        persistent: !!c.expirationDate,
        httpOnly:   c.httpOnly,
        secure:     c.secure
      }));
    } catch (e) {}
  }
});

// Limpa quando fecha a aba
browser.tabs.onRemoved.addListener((tabId) => {
  delete tabData[tabId];
});

// ---------- 5. MENSAGENS do content script e popup ----------
browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  // Popup pedindo dados da aba
  if (msg.type === "getTabData") {
    sendResponse(tabData[msg.tabId] || null);
    return true;
  }

  const tabId = sender.tab?.id;
  if (!tabId) return;
  if (!tabData[tabId]) initTab(tabId);

  // Storage + IndexedDB vindos do content script
  if (msg.type === "storage") {
    tabData[tabId].storage = msg.data;
  }

  // Fingerprinting detectado
  if (msg.type === "fingerprint") {
    if (!tabData[tabId].fingerprints.includes(msg.method)) {
      tabData[tabId].fingerprints.push(msg.method);
    }
  }

  // Hijacking detectado pelo content script
  if (msg.type === "hijack") {
    tabData[tabId].hijacks.push({ src: msg.src, reason: msg.reason });
  }
});