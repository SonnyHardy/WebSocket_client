// Popup script for STOMP WebSocket Client extension

document.addEventListener('DOMContentLoaded', function() {
  // Load recent connections
  loadRecentConnections();
});

// Load recent connections from storage
function loadRecentConnections() {
  chrome.storage.sync.get(['recentConnections'], function(result) {
    const recentList = document.getElementById('recentList');
    const connections = result.recentConnections || [];

    if (connections.length === 0) {
      recentList.innerHTML = '<p style="color: #666; font-style: italic;">No recent connections</p>';
      return;
    }

    // Clear the list
    recentList.innerHTML = '';

    // Add each connection to the list
    connections.forEach(connection => {
      const connectionItem = document.createElement('div');
      connectionItem.className = 'recent-item';

      // Create the connection display
      connectionItem.innerHTML = `
        <a href="#" class="connection-link" data-url="${connection.url}" 
           data-username="${connection.username || ''}" 
           data-password="${connection.password || ''}">
          ${connection.url}
        </a>
        ${connection.username ? '<span class="has-auth">🔑</span>' : ''}
      `;

      recentList.appendChild(connectionItem);
    });

    // Add event listeners to connection links
    document.querySelectorAll('.connection-link').forEach(link => {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        openClientWithConnection(this.dataset.url, this.dataset.username, this.dataset.password);
      });
    });
  });
}

// Open the client interface with pre-filled connection details
function openClientWithConnection(url, username, password) {
  // Create a URL with query parameters
  let clientUrl = 'index.html?url=' + encodeURIComponent(url);

  if (username) {
    clientUrl += '&username=' + encodeURIComponent(username);
  }

  if (password) {
    clientUrl += '&password=' + encodeURIComponent(password);
  }

  // Open the client in a new tab
  chrome.tabs.create({url: clientUrl});
}
