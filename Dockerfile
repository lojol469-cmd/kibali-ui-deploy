# Étape 1 : Build de l'application React
FROM node:18-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Étape 2 : Serveur de production léger (Nginx)
FROM nginx:stable-alpine
# Copier les fichiers buildés de l'étape précédente vers Nginx
COPY --from=build /app/dist /usr/share/nginx/html
# Exposer le port 80 pour Render
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]