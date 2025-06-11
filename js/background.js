// Background script for STOMP WebSocket Client extension

// Initialize default settings when extension is installed
chrome.runtime.onInstalled.addListener(function() {
  // Set default options
  chrome.storage.sync.set({
    defaultUrl: 'http://localhost:8080/ws',
    defaultUsername: '',
    defaultPassword: '',
    enableHistoryByDefault: true,
    historyLimit: 100,
    enableReconnectByDefault: true,
    defaultMaxRetries: 10,
    defaultInitialDelay: 1000,
    recentConnections: []
  }, function() {
    console.log('Default settings initialized');
  });
});

// Listen for connection events from the main interface
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'saveConnection') {
    // Save connection to recent connections list
    saveRecentConnection(request.connection);
    sendResponse({status: 'success'});
  }
  return true; // Keep the message channel open for async responses
});

// Save a connection to the recent connections list
function saveRecentConnection(connection) {
  chrome.storage.sync.get(['recentConnections'], function(result) {
    let recentConnections = result.recentConnections || [];

    // Check if this connection already exists
    const existingIndex = recentConnections.findIndex(conn => conn.url === connection.url);
    if (existingIndex !== -1) {
      // Remove the existing one
      recentConnections.splice(existingIndex, 1);
    }

    // Add to the beginning of the array
    recentConnections.unshift(connection);

    // Keep only the last 5 connections
    if (recentConnections.length > 5) {
      recentConnections = recentConnections.slice(0, 5);
    }

    chrome.storage.sync.set({recentConnections: recentConnections});
  });
}
