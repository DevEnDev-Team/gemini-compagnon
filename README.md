# 🤖 Gemini Compagnon

**Gemini Compagnon** est une interface web moderne et responsive conçue pour piloter `gemini-cli` depuis n'importe quel appareil de votre réseau local. Idéal pour transformer votre PC en serveur d'IA personnel accessible depuis votre smartphone ou tablette.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?logo=react)
![Node](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-339933?logo=node.js)
![Socket.io](https://img.shields.io/badge/Realtime-Socket.io-010101?logo=socket.io)

---

## ✨ Fonctionnalités

- 📱 **Interface Mobile-First** : Optimisée pour une utilisation fluide sur smartphone via navigateur.
- ⚡ **Temps Réel** : Visualisez le streaming de la réponse de l'IA et les logs du terminal en direct grâce aux WebSockets.
- 📂 **Multi-Projets** : Gérez et basculez entre différents dossiers de projets configurés sur votre PC.
- 🛠️ **Validation Interactive** : Répondez aux demandes de confirmation (`[y/N]`) de `gemini-cli` directement depuis l'interface web.
- 🎨 **Thème Dynamique** : Support des modes Clair et Sombre.
- 🚀 **Lanceur Natif** : Intégration dans le menu d'applications (Pop!_OS / GNOME) via un fichier `.desktop`.

---

## 🛠️ Prérequis

Avant de commencer, assurez-vous d'avoir installé :
1. [Node.js](https://nodejs.org/) (v18+)
2. [gemini-cli](https://github.com/google/gemini-cli) (configuré et fonctionnel sur votre système)
3. Un réseau Wi-Fi commun pour l'accès mobile.

---

## 📥 Installation

1. **Cloner le dépôt** :
   ```bash
   git clone https://github.com/votre-repo/geminiCompagnon.git
   cd geminiCompagnon
   ```

2. **Installer les dépendances** :
   ```bash
   # Backend
   cd backend && npm install
   
   # Frontend
   cd ../frontend && npm install
   ```

3. **Rendre le script de démarrage exécutable** :
   ```bash
   chmod +x start-dev.sh
   ```

---

## 🚀 Utilisation

### Lancement rapide
Utilisez le script racine pour lancer simultanément le backend et le frontend :
```bash
./start-dev.sh
```

### Accès depuis un autre appareil (Smartphone)
1. Trouvez l'adresse IP locale de votre PC : `ip addr` ou `ifconfig`.
2. Sur votre téléphone, ouvrez le navigateur à l'adresse : `http://<IP_DE_VOTRE_PC>:5173`.

---

## 🖥️ Intégration Système (Linux)

Pour ajouter **Gemini Compagnon** à votre lanceur d'applications (ex: Pop!_OS) :

1. Le fichier `gemini-compagnon.desktop` est déjà configuré à la racine.
2. Installez-le dans votre dossier local :
   ```bash
   cp gemini-compagnon.desktop ~/.local/share/applications/
   chmod +x ~/.local/share/applications/gemini-compagnon.desktop
   ```
3. L'application apparaîtra désormais dans votre menu sous le nom "Gemini Compagnon".

---

## ⚙️ Configuration Technique

### Ports par défaut
- **Frontend** : `5173` (Vite)
- **Backend** : `3001` (Express/Socket.io)

### Sécurité Locale
L'application utilise un "Shared Secret" (`default-secret`) défini dans `backend/server.ts` et `frontend/src/api.ts`. Ce secret sécurise l'accès à votre `gemini-cli` sur votre réseau local.

### Projets
Les projets accessibles sont listés dans `backend/data/projects.json`. Vous pouvez en ajouter manuellement ou via l'interface.

---

## 📝 Structure du Projet

```text
.
├── backend/            # Serveur Node.js (Gestion des sessions gemini)
├── frontend/           # Application React (Interface utilisateur)
├── logo.png            # Icône de l'application
├── start-dev.sh        # Script de lancement orchestré
└── gemini-compagnon.desktop # Raccourci pour Linux
```

---

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une *issue* ou à soumettre une *pull request*.

---

## 📄 Licence

Distribué sous la licence MIT. Voir `LICENSE` pour plus d'informations.
