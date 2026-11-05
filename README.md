# tags-selector

Outil de navigation et de sélection dans l'ontologie des tags de la [Fondation SCP](https://fondationscp.wikidot.com/), conçu pour accompagner la mise en place de son nouveau système d'étiquettes.

L'ontologie est interrogée en `SPARQL` et affichée sous forme de graphe interactif : on y parcourt la hiérarchie des tags, on les recherche et on les sélectionne. Les tags parents sont ajoutés automatiquement à la sélection, et les tags incompatibles (disjoints) sont bloqués.

L'application tourne entièrement dans le navigateur, sans étape de compilation (`Comunica`, `Cytoscape.js`, `Dagre`).

## Hiérarchie

– `src/database/` : interaction avec la base de données (en `SPARQL`)  
– `src/graph/` : initialisation et interaction avec le graphe  
– `src/graph/branches/` : initialisation et interaction avec le graphe en branches (construction et placement des branches, événements, zones colorées, déploiement et repli complets, affichage d'un tag recherché, ajout automatique des tags parents, blocage des tags disjoints de la sélection)  
– `src/selection/` : interaction avec la liste de tags sélectionnés  
– `src/search/` : champ de recherche de tags et menu déroulant des tags les plus proches  
– `src/views/` : liste des affichages disponibles, passage de l'un à l'autre (touche `Tab`), boutons de déploiement et de repli du graphe  

– `src/events.js` : écoute des événements d'interaction avec le graphe  
– `src/loading.js` : affichage, masquage et mise en erreur de l'écran de chargement  
– `src/popup.js` : pop up avec bouton OK (raison du blocage d'un tag disjoint)  
– `src/main.js` : définition de la variable globale `app`, création de la base de données et du moteur `Comunica` (pour interagir avec), du changement d'affichage, de la recherche, des boutons de déploiement et de la boite des tags sélectionnés  

– `resources/ontology/structure-tags.rdf` : ontologie des tags (servie via `Github Pages`)  
– `resources/scp-logo.svg` : logo affiché dans l'en-tête et sur l'écran de chargement  
– `resources/besace-malicieuse.txt` : mises à jour qui devront être effectuées pendant l'implémentation finale du nouveau système d'étiquettes (encore en vrac, sera mis au propre plus tard)  
