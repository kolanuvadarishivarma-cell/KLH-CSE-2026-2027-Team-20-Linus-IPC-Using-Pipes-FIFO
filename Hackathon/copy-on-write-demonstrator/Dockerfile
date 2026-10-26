# Multi-stage Dockerfile for native Ubuntu Linux execution
FROM ubuntu:22.04 AS linux-host

# Avoid interactive tzdata prompts
ENV DEBIAN_FRONTEND=noninteractive

# Install GCC, Make, build tools, curl, and Node.js
RUN apt-get update && apt-get install -y \
    gcc \
    make \
    build-essential \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy backend and linux source
COPY backend/package*.json ./backend/
RUN cd backend && npm install

COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

COPY . .

# Compile the C program on Ubuntu Linux with GCC
RUN cd backend/linux && make clean && make

# Build the frontend
RUN cd frontend && npm run build

EXPOSE 5001 5173

# Start script
CMD ["sh", "-c", "cd backend && npm start & cd frontend && npm run preview -- --host 0.0.0.0 --port 5173"]
