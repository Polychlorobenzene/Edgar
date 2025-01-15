const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const xml2js = require('xml2js');
const { Server } = require('socket.io');
const http = require('http');
const AWS = require('aws-sdk');
require('dotenv').config();

// Configure AWS SDK for DO Spaces
const spacesEndpoint = new AWS.Endpoint(process.env.SPACES_ENDPOINT);
const s3 = new AWS.S3({
    endpoint: spacesEndpoint,
    accessKeyId: process.env.SPACES_KEY,
    secretAccessKey: process.env.SPACES_SECRET,
    region: process.env.SPACES_REGION
});

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["https://quince.nationofimagi.org", "http://localhost:3000"],
        methods: ["GET", "POST"],
        credentials: true
    }
});

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
    
    const images = result.ListBucketResult.Contents
        .filter(content => content.Key[0].startsWith('images/Quince/'))
        .map(content => {
            const params = {
                Bucket: process.env.SPACES_BUCKET,
                Key: content.Key[0],
                Expires: 3600 // URL expires in 1 hour
            };
            return {
                url: s3.getSignedUrl('getObject', params),
                date: new Date(content.LastModified[0]),
                filename: content.Key[0]
            };
        })
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
    res.sendFile(path.join(__dirname, '../Client', 'index.html'));
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