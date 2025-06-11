// Options script for STOMP WebSocket Client extension

document.addEventListener('DOMContentLoaded', function() {
  // Load current settings
  loadSettings();

  // Set up event listeners
  document.getElementById('saveBtn').addEventListener('click', saveSettings);
  document.getElementById('clearHistoryBtn').addEventListener('click', clearAllHistory);
});

// Load settings from storage
function loadSettings() {
  chrome.storage.sync.get([
    'defaultUrl',
    'defaultUsername',
    'defaultPassword',
    'enableHistoryByDefault',
    'historyLimit',
    'enableReconnectByDefault',
    'defaultMaxRetries',
    'defaultInitialDelay'
  ], function(items) {
    // Populate the form with current settings
    document.getElementById('defaultUrl').value = items.defaultUrl || 'http://localhost:8080/ws';
    document.getElementById('defaultUsername').value = items.defaultUsername || '';
    document.getElementById('defaultPassword').value = items.defaultPassword || '';
    document.getElementById('enableHistoryByDefault').checked = items.enableHistoryByDefault !== false;
    document.getElementById('historyLimit').value = items.historyLimit || 100;
    document.getElementById('enableReconnectByDefault').checked = items.enableReconnectByDefault !== false;
    document.getElementById('defaultMaxRetries').value = items.defaultMaxRetries || 10;
    document.getElementById('defaultInitialDelay').value = items.defaultInitialDelay || 1000;
  });
}

// Save settings to storage
function saveSettings() {
  const settings = {
    defaultUrl: document.getElementById('defaultUrl').value,
    defaultUsername: document.getElementById('defaultUsername').value,
    defaultPassword: document.getElementById('defaultPassword').value,
    enableHistoryByDefault: document.getElementById('enableHistoryByDefault').checked,
    historyLimit: parseInt(document.getElementById('historyLimit').value, 10),
    enableReconnectByDefault: document.getElementById('enableReconnectByDefault').checked,
    defaultMaxRetries: parseInt(document.getElementById('defaultMaxRetries').value, 10),
    defaultInitialDelay: parseInt(document.getElementById('defaultInitialDelay').value, 10)
  };

  chrome.storage.sync.set(settings, function() {
    const saveMessage = document.getElementById('saveMessage');
    saveMessage.textContent = 'Settings saved successfully!';
    saveMessage.style.color = '#28a745';

    // Clear the message after 3 seconds
    setTimeout(function() {
      saveMessage.textContent = '';
    }, 3000);
  });
}

// Clear all history data
function clearAllHistory() {
  if (confirm('Are you sure you want to clear all message history? This cannot be undone.')) {
    chrome.storage.local.remove(['messageHistory'], function() {
      const saveMessage = document.getElementById('saveMessage');
      saveMessage.textContent = 'Message history cleared successfully!';
      saveMessage.style.color = '#28a745';

      // Clear the message after 3 seconds
      setTimeout(function() {
        saveMessage.textContent = '';
      }, 3000);
    });
  }
}
