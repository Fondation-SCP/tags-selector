# tags-selector

Outil de navigation et de sélection dans l'ontologie des tags de la [Fondation SCP](https://fondationscp.wikidot.com/), conçu pour accompagner la mise en place de son nouveau système d'étiquettes.

L'ontologie est interrogée en `SPARQL` et affichée sous forme de graphe interactif : on y parcourt la hiérarchie des tags, on les recherche et on les sélectionne. Les tags parents sont ajoutés automatiquement à la sélection, et les tags incompatibles (disjoints) sont bloqués.

La sélection se copie au format Wikidot et s'annule (`Ctrl+Z` / `Ctrl+Y`). Le survol d'un tag affiche sa définition (`rdfs:comment`). Une autre ontologie peut être chargée depuis un fichier local (bouton « Charger un .rdf ») ou une URL (`?rdf=…`). Un clic sur le logo ou le titre recharge la page, après confirmation. Un mode sombre s'active depuis le bouton en bas à droite, et le choix est mémorisé par le navigateur.

L'application tourne entièrement dans le navigateur, sans étape de compilation (`Comunica`, `Cytoscape.js`).

## Hiérarchie

– `src/database/` : interaction avec la base de données (en `SPARQL`), chargement d'une ontologie depuis un fichier local  
– `src/graph/branches/` : initialisation et interaction avec le graphe en branches (style, construction et placement des branches, événements, zones colorées, déploiement et repli complets, affichage d'un tag recherché, ajout automatique des tags parents, blocage des tags disjoints de la sélection, application d'une sélection complète, panneau de définition d'un tag)  
– `src/selection/` : interaction avec la liste de tags sélectionnés (encart interactif, copie au format Wikidot, désélection complète sans repli du graphe, historique annuler / rétablir)  
– `src/search/` : champ de recherche de tags et menu déroulant des tags les plus proches  
– `src/views/` : construction de l'affichage (et reconstruction après chargement d'une ontologie locale), boutons de déploiement et de repli du graphe  

– `src/loading.js` : affichage, masquage et mise en erreur de l'écran de chargement  
– `src/popup.js` : pop up avec bouton OK (raison du blocage d'un tag disjoint, tags non rattachés) ou de confirmation, affichées l'une après l'autre si plusieurs arrivent en même temps  
– `src/refresh.js` : rechargement de la page au clic sur le logo ou le titre, après confirmation  
– `src/theme.js` : bascule entre mode clair et mode sombre (choix sauvegardé dans le `localStorage`, couleurs du graphe et des zones adaptées)  
– `src/main.js` : définition de la variable globale `app`, création de la base de données et du moteur `Comunica` (pour interagir avec), de l'affichage, de la recherche, des boutons de déploiement, de la boite des tags sélectionnés, de l'historique, du rafraîchissement, du thème et du chargement d'une ontologie locale  

– `resources/ontology/structure-tags.rdf` : ontologie des tags (servie via `Github Pages`)  
– `resources/scp-logo.svg` : logo affiché dans l'en-tête et sur l'écran de chargement  
– `resources/besace-malicieuse.txt` : mises à jour qui devront être effectuées pendant l'implémentation finale du nouveau système d'étiquettes (encore en vrac, sera mis au propre plus tard)  
