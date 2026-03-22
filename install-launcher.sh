#!/bin/bash

# Détection du chemin absolu du projet
PROJECT_PATH=$(pwd)
DESKTOP_FILE="gemini-compagnon.desktop"
USER_APPS_DIR="$HOME/.local/share/applications"

echo "📂 Chemin du projet détecté : $PROJECT_PATH"

# Vérification du fichier .desktop
if [ ! -f "$DESKTOP_FILE" ]; then
    echo "❌ Erreur : $DESKTOP_FILE non trouvé à la racine."
    exit 1
fi

# Mise à jour des chemins dans le fichier .desktop (création d'une copie temporaire)
sed -e "s|^Exec=.*|Exec=$PROJECT_PATH/start-dev.sh|" \
    -e "s|^Icon=.*|Icon=$PROJECT_PATH/logo.png|" \
    -e "s|^Path=.*|Path=$PROJECT_PATH|" \
    "$DESKTOP_FILE" > "$DESKTOP_FILE.tmp"

# Installation du fichier dans le lanceur
mkdir -p "$USER_APPS_DIR"
mv "$DESKTOP_FILE.tmp" "$USER_APPS_DIR/$DESKTOP_FILE"
chmod +x "$USER_APPS_DIR/$DESKTOP_FILE"

echo "✅ Le raccourci a été installé dans : $USER_APPS_DIR"
echo "🚀 Vous devriez maintenant voir 'Gemini Compagnon' dans votre menu d'applications."
