# Étape 1 : Construction de l'application
FROM node:20-slim AS build-stage

WORKDIR /app

# Copie des fichiers de configuration pour le cache des dépendances
COPY package*.json ./
RUN npm install

# Copie du reste des fichiers source
COPY . .

# Construction du projet (Vite génère le dossier /dist)
RUN npm run build

# Étape 2 : Serveur de production Nginx
FROM nginx:stable-alpine

# Copie du build vers le dossier que Nginx sert par défaut
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Copie du logo ou des assets spécifiques si nécessaire (optionnel car déjà dans dist)
# COPY --from=build-stage /app/kibali_logo.svg /usr/share/nginx/html/

# Configuration Nginx pour gérer le routage Single Page Application (SPA)
# HF Spaces utilise souvent le port 7860
RUN printf 'server {\n\
    listen 7860;\n\
    location / {\n\
        root /usr/share/nginx/html;\n\
        index index.html;\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
}' > /etc/nginx/conf.d/default.conf

# Exposition du port requis par Hugging Face
EXPOSE 7860

CMD ["nginx", "-g", "daemon off;"]