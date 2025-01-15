# Server Requirements

## Introduction

This project will display a series of images with or without text one after the other. The images will be retrieved from a CDN based on a json list in the data folder. All users will see the same image at the same time. The text needs to be able to be associated with multiple images. There will no user interaction; the display will be automatic.
There will need to be an admin interface to add, edit, and remove images and text.

## Individual Requirements

- [ ] Define the data model for the images and text including the uris of the images associated with the text, the text and which side of the image it is on, and the order of the images.


Useful Commands:
pm2:
pm2 status          # Check application status
pm2 logs            # View logs
pm2 restart all     # Restart all applications
pm2 stop all       # Stop all applications
pm2 start server.js --name "server" --watch --cwd ./Server

Common locations for Nginx files:
Main config: /etc/nginx/nginx.conf
Site configs: /etc/nginx/conf.d/*.conf
Logs: /var/log/nginx/
SSL certificates: /etc/letsencrypt/live/yourdomain.com/
