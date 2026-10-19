FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY not-airbnb/package*.json ./
RUN npm ci
COPY not-airbnb/ ./
RUN npm run build

FROM nginx:stable-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
