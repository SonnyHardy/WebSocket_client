# WebSocket_client
# STOMP WebSocket Client

Web client for interacting with WebSocket servers using the STOMP protocol (Simple Text Oriented Messaging Protocol).

## Features

### Basic Features

- ✅ STOMP WebSocket connection to any server
- ✅ Topic subscription
- ✅ Message sending to destinations
- ✅ Display of received messages with JSON formatting

### Advanced Features

- 🔒 **JWT / OAuth2 Authentication**
  - Authentication token support in headers
  - Token persistence between sessions

- 🔄 **Automatic reconnection with backoff**
  - Reconnection attempts with progressive delay
  - Configuration of maximum number of attempts

- 📊 **Message History**
  - Message storage in localStorage
  - Filtering by topic and search
  - Export messages in JSON format

- ⏱️ **Scheduled Message Simulator**
  - Regular interval message sending
  - Variable data support
  - Configuration of number of iterations

## Technologies Used

- HTML5 / CSS3 / JavaScript (ES6+)
- STOMP.js for STOMP protocol management
- SockJS for WebSocket transport
- JavaScript modules for a modular architecture

## Project Structure

```
/
├── index.html            # Main page
├── css/
│   ├── styles.css        # Main styles
│   ├── auth.css          # Authentication styles
│   ├── history.css       # History styles
│   └── scheduler.css     # Simulator styles
├── js/
│   ├── main.js           # Main entry point
│   ├── stomp-client.js   # Main STOMP client
│   ├── auth.js           # Authentication management
│   ├── reconnect.js      # Reconnection management
│   ├── storage.js        # Message storage
│   └── scheduler.js      # Scheduled sending
└── README.md            # Documentation
```

## Usage

1. Open `index.html` in a modern browser
2. Enter the STOMP WebSocket server URL (for example `localhost:8080/ws`)
3. Connect to the server
4. Subscribe to topics (for example `/topic/notifications`)
5. Send messages to destinations (for example `/app/hello`)

## Development

The project is organized in a modular way with independent ES6 JavaScript modules that allow for easy maintenance and evolution.

Each feature is implemented in its own module with clear responsibilities:

- `stomp-client.js`: Basic STOMP connection management
- `auth.js`: Advanced authentication
- `reconnect.js`: Automatic reconnection logic
- `storage.js`: History persistence and management
- `scheduler.js`: Scheduled sending features
