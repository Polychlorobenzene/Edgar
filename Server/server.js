const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const xml2js = require('xml2js');
const { Server } = require('socket.io');
const http = require('http');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const port = process.env.PORT || 3000;
let currentImageIndex = 0;
let images = [];

// Serve static files from 'public' directory
app.use(express.static('public'));

// Parse the CDN XML data and extract image information
async function getImageList() {
    const xmlData = await fs.readFile(path.join(__dirname, 'data', 'cdn-images.xml'), 'utf8');
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(xmlData);
    
    // Extract and sort images by date
    const images = result.ListBucketResult.Contents
        .filter(content => content.Key[0].startsWith('images/Quince/'))
        .map(content => ({
            url: `${process.env.CDN_URL}/${content.Key[0]}`,
            date: new Date(content.LastModified[0]),
            filename: content.Key[0]
        }))
        .sort((a, b) => a.date - b.date);

    return images;
}

// API endpoint to get the sorted image list
app.get('/api/images', async (req, res) => {
    try {
        const images = await getImageList();
        res.json(images);
    } catch (error) {
        console.error('Error fetching images:', error);
        res.status(500).json({ error: 'Failed to fetch images' });
    }
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize images and start server-side slideshow
async function initializeSlideshow() {
    images = await getImageList();
    setInterval(() => {
        currentImageIndex = (currentImageIndex + 1) % images.length;
        // Broadcast new image to all clients
        io.emit('imageUpdate', {
            url: images[currentImageIndex].url,
            index: currentImageIndex
        });
    }, 3000);
}

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('Client connected');
    // Send current image to newly connected client
    if (images.length > 0) {
        socket.emit('imageUpdate', {
            url: images[currentImageIndex].url,
            index: currentImageIndex
        });
    }
});

// Start the slideshow after loading images
initializeSlideshow().catch(console.error);

server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 