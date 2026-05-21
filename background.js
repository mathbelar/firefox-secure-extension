const tabData = {};  // { tabId: { thirdPartyDomains: [], ... } }

browser.webRequest.onBeforeRequest.addListener(
  (details) => {
    const { tabId, url, type, originUrl } = details;
    if (tabId < 0) return;

    const reqHost = new URL(url).hostname;
    const originHost = originUrl ? new URL(originUrl).hostname : null;

    const isThirdParty = originHost && !reqHost.endsWith(originHost) && !originHost.endsWith(reqHost);

    if (!tabData[tabId]) tabData[tabId] = { thirdParty: [] };

    if (isThirdParty) {
      tabData[tabId].thirdParty.push({ domain: reqHost, type });
    }
  },
  { urls: ["<all_urls>"] }
);


async function auditCookies(tabUrl) {
  const url = new URL(tabUrl);
  const allCookies = await browser.cookies.getAll({ url: tabUrl });

  return allCookies.map(c => ({
    name: c.name,
    domain: c.domain,
    firstParty: c.domain.includes(url.hostname),
    session: !c.expirationDate,
    persistent: !!c.expirationDate,
    httpOnly: c.httpOnly,
    secure: c.secure
  }));
}


browser.webRequest.onBeforeRedirect.addListener(
  (details) => {
    if (details.statusCode >= 300) {
      // Registrar redirecionamento suspeito
      tabData[details.tabId]?.hijackWarnings?.push({
        from: details.url,
        to: details.redirectUrl,
        type: "redirect"
      });
    }
  },
  { urls: ["<all_urls>"] }
);