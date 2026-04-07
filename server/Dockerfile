# Use the official Node.js 18 Alpine image for a thin, fast build
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

RUN npm install --production

# Bundle app source code
COPY . .

# Expose the API port
EXPOSE 5000

# Start the application
CMD [ "npm", "start" ]
