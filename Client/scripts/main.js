// Create Socket.IO connection
const socket = io();

// Listen for image updates from server
socket.on('imageUpdate', (data) => {
    const img = document.getElementById('currentImage');
    img.src = data.url;
});