const fields = [
    "fullName",
    "title",
    "affiliation",
    "shortBio",
    "keywords",
    "email",
    "backendUrl"
  ];
  
  function restoreOptions() {
    chrome.storage.sync.get(fields, (result) => {
      fields.forEach((field) => {
        const el = document.getElementById(field);
        if (el && result[field]) {
          el.value = result[field];
        }
      });
    });
  }
  
  function saveOptions() {
    const data = {};
    fields.forEach((field) => {
      const el = document.getElementById(field);
      data[field] = el.value.trim();
    });
  
    chrome.storage.sync.set(data, () => {
      const status = document.getElementById("status");
      status.textContent = "Settings saved ✔";
      setTimeout(() => (status.textContent = ""), 2000);
    });
  }
  
  function resetOptions() {
    chrome.storage.sync.clear(() => {
      fields.forEach((field) => {
        const el = document.getElementById(field);
        if (el) el.value = "";
      });
      const status = document.getElementById("status");
      status.textContent = "Settings cleared.";
      setTimeout(() => (status.textContent = ""), 2000);
    });
  }
  
  document.getElementById("save").addEventListener("click", saveOptions);
  document.getElementById("reset").addEventListener("click", resetOptions);
  
  document.addEventListener("DOMContentLoaded", restoreOptions);
  