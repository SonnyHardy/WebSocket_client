# WebSocket_client
# Client WebSocket STOMP

Client web pour interagir avec des serveurs WebSocket utilisant le protocole STOMP (Simple Text Oriented Messaging Protocol).

## Caractéristiques

### Fonctionnalités de base

- ✅ Connexion WebSocket STOMP à n'importe quel serveur
- ✅ Souscription à des topics
- ✅ Envoi de messages vers des destinations
- ✅ Affichage des messages reçus avec formatage JSON

### Fonctionnalités avancées

- 🔒 **Authentification JWT / OAuth2**
  - Support des tokens d'authentification dans les headers
  - Persistance des tokens entre les sessions

- 🔄 **Reconnexion automatique avec backoff**
  - Tentatives de reconnexion avec délai progressif
  - Configuration du nombre maximal de tentatives

- 📊 **Historique des messages**
  - Conservation des messages dans le localStorage
  - Filtrage par topic et recherche
  - Export des messages au format JSON

- ⏱️ **Simulateur d'envoi programmé**
  - Envoi de messages à intervalle régulier
  - Support des données variables
  - Configuration du nombre d'itérations

- 🖥️ **Mode multi-clients**
  - Gestion de plusieurs clients simultanément
  - Connexions indépendantes pour chaque client
  - Souscriptions et messages séparés

## Technologies utilisées

- HTML5 / CSS3 / JavaScript (ES6+)
- STOMP.js pour la gestion du protocole STOMP
- SockJS pour le transport WebSocket
- Modules JavaScript pour une architecture modulaire

## Structure du projet

```
/
├── index.html            # Page principale
├── css/
│   ├── styles.css        # Styles principaux
│   ├── auth.css          # Styles pour l'authentification
│   ├── history.css       # Styles pour l'historique
│   ├── scheduler.css     # Styles pour le simulateur
│   └── multi-client.css  # Styles pour le mode multi-clients
├── js/
│   ├── main.js           # Point d'entrée principal
│   ├── stomp-client.js   # Client STOMP principal
│   ├── auth.js           # Gestion de l'authentification
│   ├── reconnect.js      # Gestion de la reconnexion
│   ├── storage.js        # Stockage des messages
│   ├── scheduler.js      # Envoi programmé
│   └── multi-client.js   # Gestion multi-clients
└── README.md            # Documentation
```

## Utilisation

1. Ouvrez `index.html` dans un navigateur moderne
2. Entrez l'URL du serveur WebSocket STOMP (par exemple `localhost:8080/ws`)
3. Connectez-vous au serveur
4. Souscrivez à des topics (par exemple `/topic/notifications`)
5. Envoyez des messages vers des destinations (par exemple `/app/hello`)

## Développement

Le projet est organisé de manière modulaire avec des modules JavaScript ES6 indépendants qui permettent une maintenance et une évolution faciles.

Chaque fonctionnalité est implémentée dans son propre module avec des responsabilités claires :

- `stomp-client.js` : Gestion de la connexion STOMP de base
- `auth.js` : Authentification avancée
- `reconnect.js` : Logique de reconnexion automatique
- `storage.js` : Persistance et gestion de l'historique
- `scheduler.js` : Fonctionnalités d'envoi programmé
- `multi-client.js` : Gestion de plusieurs clients
