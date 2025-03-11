const express = require("express");
const path = require("path");
const fs = require("fs").promises;
const xml2js = require("xml2js");
const { Server } = require("socket.io");
const http = require("http");
const AWS = require("aws-sdk");
require("dotenv").config();
const imageTextBlocks = require("./data/image-text.json");

// Configure AWS SDK for DO Spaces
const spacesEndpoint = new AWS.Endpoint(process.env.SPACES_ENDPOINT);
const s3 = new AWS.S3({
  endpoint: spacesEndpoint,
  accessKeyId: process.env.SPACES_KEY,
  secretAccessKey: process.env.SPACES_SECRET,
  region: process.env.SPACES_REGION,
});

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["https://quince.nationofimagi.org", "http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const port = process.env.PORT || 3000;
let currentImageIndex = 0;
let imageMetadata = []; // Store metadata separately from URLs

// Serve static files from 'public' directory
app.use(express.static("public"));

// Parse the CDN XML data and extract image information
async function getImageList() {
  const xmlData = await fs.readFile(
    path.join(__dirname, "data", "cdn-images.xml"),
    "utf8"
  );
  const parser = new xml2js.Parser();
  const result = await parser.parseStringPromise(xmlData);

  const images = result.ListBucketResult.Contents.filter((content) =>
    content.Key[0].startsWith("images/Quince/")
  )
    .map((content) => {
      const params = {
        Bucket: process.env.SPACES_BUCKET,
        Key: content.Key[0],
        Expires: 3600, // URL expires in 1 hour
      };
      return {
        url: s3.getSignedUrl("getObject", params),
        date: new Date(content.LastModified[0]),
        filename: content.Key[0],
      };
    })
    .sort((a, b) => a.date - b.date);

  return images;
}

// API endpoint to get the sorted image list
app.get("/api/images", async (req, res) => {
  try {
    const images = await getImageList();
    res.json(images);
  } catch (error) {
    console.error("Error fetching images:", error);
    res.status(500).json({ error: "Failed to fetch images" });
  }
});

// Serve the main page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../Client", "index.html"));
});

// Initialize images and start server-side slideshow
async function initializeSlideshow() {
  // Load initial image metadata
  const xmlData = await fs.readFile(
    path.join(__dirname, "data", "cdn-images.xml"),
    "utf8"
  );
  const parser = new xml2js.Parser();
  const result = await parser.parseStringPromise(xmlData);

  // Store metadata without URLs
  imageMetadata = result.ListBucketResult.Contents.filter((content) =>
    content.Key[0].startsWith("images/Quince/")
  )
    .map((content) => {
      // Find associated text for this image
      const associatedText = imageTextBlocks.textBlocks.find(
        (text) => text.imageKeys?.includes(content.Key[0])
      ) || imageTextBlocks.textBlocks.find(text => text.id === "default");

      return {
        key: content.Key[0],
        date: new Date(content.LastModified[0]),
        filename: content.Key[0],
        text: associatedText
          ? {
              content: associatedText.content,
              position: associatedText.position,
            }
          : null,
      };
    })
    .sort((a, b) => a.date - b.date);

  // Start slideshow if we have images
  if (imageMetadata.length > 0) {
    setInterval(() => {
      currentImageIndex = (currentImageIndex + 1) % imageMetadata.length;

      // Generate fresh signed URL for current image
      const params = {
        Bucket: process.env.SPACES_BUCKET,
        Key: imageMetadata[currentImageIndex].key,
        Expires: 3600, // URL expires in 1 hour
      };
      const freshUrl = s3.getSignedUrl("getObject", params);

      // Broadcast new image to all clients
      io.emit("imageUpdate", {
        url: freshUrl,
        index: currentImageIndex,
        filename: imageMetadata[currentImageIndex].filename,
        text: imageMetadata[currentImageIndex].text,
      });
    }, 6000);
  }
}

// Update socket connection handler to generate fresh URL for initial image
io.on("connection", (socket) => {
  console.log("Client connected");
  // Send current image to newly connected client with fresh URL
  if (imageMetadata.length > 0) {
    const params = {
      Bucket: process.env.SPACES_BUCKET,
      Key: imageMetadata[currentImageIndex].key,
      Expires: 3600,
    };
    const freshUrl = s3.getSignedUrl("getObject", params);

    socket.emit("imageUpdate", {
      url: freshUrl,
      index: currentImageIndex,
      filename: imageMetadata[currentImageIndex].filename,
      text: imageMetadata[currentImageIndex].text,
    });
  }
});

// Start the slideshow after loading images
initializeSlideshow().catch(console.error);

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
