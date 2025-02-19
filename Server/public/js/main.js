 // Create Socket.IO connection with options
 const socket = io({
    withCredentials: true,
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
  });

  const img = document.getElementById('currentImage');
  const errorMessage = document.getElementById('errorMessage');
  const connectionStatus = document.getElementById('connectionStatus');
  let reconnectAttempts = 0;

  // Image loading handler
  function handleImageLoad(url) {
    img.classList.add('loading');
    
    const newImage = new Image();
    newImage.onload = () => {
      img.src = url;
      img.classList.remove('loading');
    };
    newImage.onerror = () => {
      showError('Failed to load image. Please try refreshing the page.');
      img.classList.remove('loading');
    };
    newImage.src = url;
  }

  // Error handling functions
  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
  }

  function hideError() {
    errorMessage.style.display = 'none';
  }

  function updateConnectionStatus(status, message) {
    connectionStatus.textContent = message;
    connectionStatus.className = `connection-status ${status}`;
  }

  // Socket event handlers
  socket.on('connect', () => {
    console.log('Connected to server');
    hideError();
    updateConnectionStatus('connected', 'Connected');
    reconnectAttempts = 0;
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from server');
    updateConnectionStatus('disconnected', 'Disconnected');
  });

  socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
    reconnectAttempts++;
    updateConnectionStatus('disconnected', 'Connection error');
    
    if (reconnectAttempts >= 5) {
      showError('Unable to connect to server. Please check your internet connection and refresh the page.');
    } else {
      showError('Connection lost. Attempting to reconnect...');
    }
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log('Reconnected to server after', attemptNumber, 'attempts');
    hideError();
    updateConnectionStatus('connected', 'Connected');
  });

  socket.on('reconnect_failed', () => {
    showError('Failed to reconnect. Please refresh the page.');
    updateConnectionStatus('disconnected', 'Connection failed');
  });

  // Image update handler
  socket.on('imageUpdate', (data) => {
    hideError();
    handleImageLoad(data.url);
  });

  // Handle page visibility changes
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !socket.connected) {
      socket.connect();
    }
  });