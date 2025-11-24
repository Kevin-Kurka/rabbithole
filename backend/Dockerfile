FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./
COPY tsconfig.json ./

RUN npm install
RUN npm install @types/uuid

# Install RabbitMQ client for vectorization worker
RUN npm install amqplib @types/amqplib

COPY src ./src

# Don't build, use ts-node directly
# RUN npm run build

CMD ["npm", "start"]