#!/bin/bash

# Se déplacer dans le dossier du script pour garantir que les chemins relatifs fonctionnent
cd "$(dirname "$0")"

# Chargement de NVM si présent pour garantir que npm est trouvé
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# On ajoute le chemin spécifique détecté pour node/npm
export PATH="/home/mangoz404/.nvm/versions/node/v22.17.1/bin:$PATH"

# Kill all background processes when the script is stopped
trap 'kill $(jobs -p)' EXIT

echo "🚀 Starting geminiCompagnon..."
echo "📍 Working directory: $(pwd)"

# Start Backend
echo "📡 Starting Backend (http://localhost:3001)..."
(cd backend && npm run start) &

# Start Frontend
echo "💻 Starting Frontend (http://localhost:5173)..."
(cd frontend && npm run dev -- --host) &

echo "✅ App is running."
echo "Press Ctrl+C to stop the services."

# Wait for both processes
wait
