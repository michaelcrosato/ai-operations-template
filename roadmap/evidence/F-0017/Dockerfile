FROM node:20-alpine
WORKDIR /app
COPY graph.json .
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD node -e "process.exit(0)" || exit 1
