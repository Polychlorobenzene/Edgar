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

  // Theme switching functionality
  const themeToggle = document.getElementById('themeToggle');
  const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

  // Set initial theme based on user's system preference
  function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeToggle(savedTheme);
    } else if (prefersDarkScheme.matches) {
        document.documentElement.setAttribute('data-theme', 'dark');
        updateThemeToggle('dark');
    }
  }

  function updateThemeToggle(theme) {
    themeToggle.textContent = theme === 'dark' ? '🌜' : '🌞';
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeToggle(newTheme);
  }

  themeToggle.addEventListener('click', toggleTheme);
  prefersDarkScheme.addEventListener('change', initializeTheme);

  // Initialize theme on page load
  initializeTheme();

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
    updateText(data.text);
  });

  function updateText(textData) {
    const textContainer = document.getElementById('textContent');
    const container = document.querySelector('.image-text-container');
    
    if (textData) {
        textContainer.textContent = textData.content;
        textContainer.style.display = 'block';
        // Handle text position
        if (textData.position === 'left') {
            textContainer.style.order = '1';
        } else {
            textContainer.style.order = '3';
        }
    } else {
        textContainer.style.display = 'none';
    }
  }

  // Handle page visibility changes
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !socket.connected) {
      socket.connect();
    }
  });