# Use the official Node.js runtime as the base image
FROM node:16

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the container
COPY package*.json ./

RUN dir

RUN npm install @nestjs/cli --global --force

RUN npm i @node-rs/argon2-linux-arm64-gnu --global --force

RUN npm install --save-dev --force

# Copy the rest of the application code to the container
COPY . .

# Build the application
RUN npm run build

# Expose a port (replace 3000 with your application's port)
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
