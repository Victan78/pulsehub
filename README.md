# PulseHub

Hub de supervision temps réel d'équipements scéniques (alimentations, contrôleurs LED, amplis)
qui émettent leur télémétrie en UDP selon le protocole PulseHub v1, et simulateur de flotte pour le tester sans matériel.

> README en cours de rédaction : architecture, synthèse et choix de conception arrivent avec la suite du développement.

## Démarrage local

Prérequis : Node.js 22 ou plus récent, npm 10 ou plus récent.

```bash
npm install
npm run hub                    # hub, écoute UDP sur le port 9000
npm run sim                    # simulateur : 50 appareils × 20 Hz = 1 000 trames/s
npm run sim -- --chaos         # idem, avec tous les défauts injectés
npm run sim -- --help          # liste des options (défauts, taux, nombre d'appareils…)
npm test                       # tests unitaires
```

La configuration du hub se fait par variables d'environnement (voir [.env.example](.env.example)).
