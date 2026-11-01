FROM node:22-alpine
WORKDIR /app
COPY server.mjs .
USER node
ENV NODE_ENV=production PORT=8080
EXPOSE 8080
CMD ["node", "server.mjs"]
