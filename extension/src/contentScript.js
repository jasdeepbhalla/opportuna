// Utility: extract first matching text from selectors
function getFirstText(selectors) {
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el && el.innerText.trim()) {
        return el.innerText.trim();
      }
    }
    return null;
  }
  
  // Simple date extraction (very naive, but works for many CFPs)
  function extractPossibleDates(text) {
    const datePattern =
      /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4}\b/g;
    const matches = text.match(datePattern);
    if (!matches) return null;
    return [...new Set(matches)].slice(0, 4);
  }
  
  // Try to detect conference title / acronym
  function guessConferenceTitle() {
    const h1 = getFirstText(["h1"]);
    if (h1) return h1;
  
    const metaOgTitle = document.querySelector('meta[property="og:title"]');
    if (metaOgTitle?.content) return metaOgTitle.content.trim();
  
    return document.title;
  }
  
  function guessLocationAndDates(text) {
    const dates = extractPossibleDates(text) || [];
    let location = null;
  
    // Very naive heuristic: after "Location:" or "Venue:"
    const locationMatch = text.match(/(?:Location|Venue)\s*:\s*([^\n]+)/i);
    if (locationMatch) {
      location = locationMatch[1].trim();
    }
  
    return {
      dates,
      location
    };
  }
  
  function findChairCandidates() {
    const anchors = Array.from(document.querySelectorAll("a[href^='mailto:']"));
    const chairs = [];
  
    anchors.forEach((a) => {
      const email = a.getAttribute("href").replace("mailto:", "").trim();
      const name = a.innerText.trim() || email.split("@")[0];
  
      const surroundingText = (a.closest("tr") || a.closest("li") || a.parentElement || document.body)
        .innerText.toLowerCase();
  
      if (
        surroundingText.includes("chair") ||
        surroundingText.includes("pc chair") ||
        surroundingText.includes("program chair") ||
        surroundingText.includes("track chair") ||
        surroundingText.includes("committee")
      ) {
        chairs.push({
          name,
          email,
          role: "chair"
        });
      }
    });
  
    // Deduplicate by email
    const unique = {};
    chairs.forEach((c) => {
      unique[c.email] = c;
    });
    return Object.values(unique);
  }
  
  function scrapeConferenceInfo() {
    const title = guessConferenceTitle();
    const bodyText = document.body.innerText || "";
    const { dates, location } = guessLocationAndDates(bodyText);
    const chairs = findChairCandidates();
  
    return {
      url: window.location.href,
      title,
      dates,
      location,
      chairs,
      // Truncate body text to avoid huge payloads
      pageSummary: bodyText.slice(0, 8000)
    };
  }
  
  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "SCRAPE_CONFERENCE_INFO") {
      const info = scrapeConferenceInfo();
      sendResponse({ ok: true, data: info });
      return true;
    }
    return false;
  });
  