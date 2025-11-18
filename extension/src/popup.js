async function getActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  }
  
  async function scrapeConferenceFromActiveTab() {
    const tab = await getActiveTab();
    if (!tab?.id) throw new Error("No active tab");
  
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(
        tab.id,
        { type: "SCRAPE_CONFERENCE_INFO" },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
            return;
          }
          if (!response || !response.ok) {
            reject(new Error("No response from content script"));
            return;
          }
          resolve(response.data);
        }
      );
    });
  }
  
  function updateConferenceSummary(info) {
    const titleBadge = document.getElementById("conferenceTitleBadge");
    const meta = document.getElementById("conferenceMeta");
  
    titleBadge.textContent = info.title || "Unknown conference";
  
    const parts = [];
    if (info.location) parts.push(`Location: ${info.location}`);
    if (info.dates && info.dates.length > 0) parts.push(`Dates: ${info.dates.join(", ")}`);
    parts.push(`URL: ${info.url}`);
  
    if (info.chairs && info.chairs.length > 0) {
      const chairStr = info.chairs
        .map((c) => `${c.name} <${c.email}>`)
        .join("; ");
      parts.push(`Chairs detected: ${chairStr}`);
      const toField = document.getElementById("toField");
      if (!toField.value.trim()) {
        toField.value = info.chairs.map((c) => c.email).join(", ");
      }
    }
  
    meta.textContent = parts.join("\n");
  }
  
  async function loadProfile() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(
        [
          "fullName",
          "title",
          "affiliation",
          "shortBio",
          "keywords",
          "email",
          "backendUrl"
        ],
        (result) => {
          resolve(result);
        }
      );
    });
  }
  
  async function generateEmail(info) {
    const profile = await loadProfile();
    const statusEl = document.getElementById("status");
  
    if (!profile.backendUrl) {
      throw new Error("Backend URL not configured. Open settings.");
    }
  
    const opportunityType = document.getElementById("opportunityType").value;
    const tone = document.getElementById("tone").value;
    const customNotes = document.getElementById("customNotes").value.trim();
  
    statusEl.textContent = "Generating email with Opportuna...";
    try {
      const res = await fetch(`${profile.backendUrl}/api/generate-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          profile,
          conference: info,
          opportunity_type: opportunityType,
          tone,
          custom_notes: customNotes
        })
      });
  
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Backend error: ${res.status} ${text}`);
      }
  
      const data = await res.json();
      const { subject, body } = data;
  
      document.getElementById("subjectField").value = subject || "";
      document.getElementById("bodyField").value = body || "";
  
      statusEl.textContent = "Draft generated ✔";
    } catch (err) {
      console.error(err);
      statusEl.textContent = `Error: ${err.message}`;
    }
  }
  
  function openOptionsPage() {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL("src/options.html"));
    }
  }
  
  function openGmailCompose() {
    const to = encodeURIComponent(
      document.getElementById("toField").value.trim()
    );
    const subject = encodeURIComponent(
      document.getElementById("subjectField").value.trim()
    );
    const body = encodeURIComponent(
      document.getElementById("bodyField").value.trim()
    );
  
    const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${subject}&body=${body}`;
    chrome.tabs.create({ url });
  }
  
  async function copyEmailToClipboard() {
    const subject = document.getElementById("subjectField").value.trim();
    const body = document.getElementById("bodyField").value.trim();
    const statusEl = document.getElementById("status");
  
    const combined = `Subject: ${subject}\n\n${body}`;
    try {
      await navigator.clipboard.writeText(combined);
      statusEl.textContent = "Copied to clipboard ✔";
      setTimeout(() => (statusEl.textContent = ""), 2000);
    } catch (e) {
      statusEl.textContent = "Failed to copy to clipboard.";
    }
  }
  
  document
    .getElementById("scanAndGenerate")
    .addEventListener("click", async () => {
      const statusEl = document.getElementById("status");
      statusEl.textContent = "";
      try {
        const info = await scrapeConferenceFromActiveTab();
        updateConferenceSummary(info);
        await generateEmail(info);
      } catch (err) {
        console.error(err);
        statusEl.textContent = `Error: ${err.message}`;
      }
    });
  
  document
    .getElementById("openOptions")
    .addEventListener("click", openOptionsPage);
  
  document
    .getElementById("openGmail")
    .addEventListener("click", openGmailCompose);
  
  document
    .getElementById("copyEmail")
    .addEventListener("click", copyEmailToClipboard);
  