# Use lightweight Node alpine image
FROM node:20-alpine

# Install system dependencies including ffmpeg
RUN apk update && apk add --no-cache ffmpeg

# Create app directory
WORKDIR /usr/src/app

# Copy dependency manifests
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Expose microservice port
EXPOSE 5001

# Run the server
CMD ["node", "server.js"]
