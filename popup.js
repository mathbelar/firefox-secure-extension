// popup.js

browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
  const tab   = tabs[0];
  const tabId = tab.id;

  try {
    const host = new URL(tab.url).hostname;
    document.getElementById("url-label").textContent = host;
  } catch (e) {}

  browser.runtime.sendMessage({ type: "getTabData", tabId }).then(data => {

    if (!data) {
      document.getElementById("score").textContent        = "ERR";
      document.getElementById("score-grade").textContent  = "NO DATA — RELOAD PAGE";
      document.getElementById("status-prompt").textContent = "error: no data for this tab";
      return;
    }

    // ---- Terceiros ----
    const tp     = data.thirdParty || [];
    const unique = [...new Set(tp.map(r => r.domain))];
    const tpEl   = document.getElementById("third-party");
    const tpBadge = document.getElementById("tp-badge");

    tpBadge.textContent = unique.length;
    if (unique.length > 10)     { tpBadge.className = "badge badge-danger"; }
    else if (unique.length > 3) { tpBadge.className = "badge badge-warn"; }
    else                        { tpBadge.className = "badge badge-safe"; }

    if (unique.length > 0) {
      tpEl.innerHTML = unique.map(d => `<span class="tag">${d}</span>`).join("");
    }

    // ---- Cookies ----
    const cookies   = data.cookies || [];
    const thirdCk   = cookies.filter(c => !c.firstParty).length;
    const sessionCk = cookies.filter(c => c.session).length;
    const persistCk = cookies.filter(c => c.persistent).length;

    document.getElementById("c-total").textContent   = cookies.length;
    document.getElementById("c-third").textContent   = thirdCk;
    document.getElementById("c-session").textContent = sessionCk;
    document.getElementById("c-persist").textContent = persistCk;

    const ckBadge = document.getElementById("cookie-badge");
    ckBadge.textContent = cookies.length;
    if (thirdCk > 5)      ckBadge.className = "badge badge-danger";
    else if (thirdCk > 0) ckBadge.className = "badge badge-warn";

    // ---- Supercookies ----
    const sc     = data.supercookies || [];
    const scEl   = document.getElementById("supercookies");
    const scBadge = document.getElementById("sc-badge");
    scBadge.textContent = sc.length;
    if (sc.length > 0) {
      scBadge.className = "badge badge-danger";
      scEl.innerHTML = sc.slice(0, 12).map(s => {
        const host = (() => { try { return new URL(s.url).hostname; } catch { return s.url; } })();
        return `<span class="tag danger">[${s.type}] ${host}</span>`;
      }).join("");
    }

    // ---- Fingerprinting ----
    const fp     = data.fingerprints || [];
    const fpEl   = document.getElementById("fingerprint");
    const fpBadge = document.getElementById("fp-badge");
    fpBadge.textContent = fp.length;
    if (fp.length > 0) {
      fpBadge.className = "badge badge-danger";
      fpEl.innerHTML = fp.map(m => `<span class="tag fp">${m}</span>`).join("");
    }

    // ---- Storage ----
    const st = data.storage || {};
    document.getElementById("s-ls").textContent  = (st.localStorage  || []).length;
    document.getElementById("s-ss").textContent  = (st.sessionStorage || []).length;
    document.getElementById("s-idb").textContent = (st.indexedDB      || []).length;

    // ---- Hijacking ----
    const hj     = data.hijacks || [];
    const hjEl   = document.getElementById("hijack-list");
    const hjBadge = document.getElementById("hijack-badge");
    hjBadge.textContent = hj.length;
    if (hj.length > 0) {
      hjBadge.className = "badge badge-danger";
      hjEl.innerHTML = hj.slice(0, 8).map(h => {
        const label  = h.src || h.to || "unknown";
        const reason = h.reason || h.type || "?";
        return `<span class="tag danger">[${reason}] ${label.substring(0, 55)}</span>`;
      }).join("");
    }

    // ---- Privacy Score ----
    let score = 100;
    score -= Math.min(unique.length * 3, 30);
    score -= Math.min(thirdCk * 5,       20);
    score -= fp.length * 10;
    score -= Math.min(sc.length * 15,    30);
    score -= Math.min(hj.length * 10,    20);
    score  = Math.max(0, Math.round(score));

    const scoreEl  = document.getElementById("score");
    const gradeEl  = document.getElementById("score-grade");
    const barEl    = document.getElementById("score-bar");
    const promptEl = document.getElementById("status-prompt");

    scoreEl.textContent = score;
    barEl.style.width   = score + "%";

    if (score >= 80) {
      scoreEl.className    = "score-num green-col";
      gradeEl.className    = "score-grade green-col";
      gradeEl.textContent  = "SECURE";
      barEl.style.background = "var(--green)";
      barEl.style.boxShadow  = "0 0 8px var(--green)";
      promptEl.textContent   = "scan complete — no major threats detected";
    } else if (score >= 60) {
      scoreEl.className    = "score-num yellow-col";
      gradeEl.className    = "score-grade yellow-col";
      gradeEl.textContent  = "MODERATE";
      barEl.style.background = "var(--yellow)";
      barEl.style.boxShadow  = "0 0 8px var(--yellow)";
      promptEl.textContent   = "warning: tracking activity detected";
    } else if (score >= 35) {
      scoreEl.className    = "score-num orange-col";
      gradeEl.className    = "score-grade orange-col";
      gradeEl.textContent  = "COMPROMISED";
      barEl.style.background = "var(--orange)";
      barEl.style.boxShadow  = "0 0 8px var(--orange)";
      promptEl.textContent   = "alert: significant privacy violations found";
    } else {
      scoreEl.className    = "score-num red-col";
      gradeEl.className    = "score-grade red-col";
      gradeEl.textContent  = "CRITICAL";
      barEl.style.background = "var(--red)";
      barEl.style.boxShadow  = "0 0 8px var(--red)";
      promptEl.textContent   = "CRITICAL: heavy tracking — privacy severely compromised";
    }

  }).catch(() => {
    document.getElementById("score").textContent       = "ERR";
    document.getElementById("score-grade").textContent = "COMMUNICATION FAILURE";
  });
});