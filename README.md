# tags-selector

## Hiérarchie

– `src/database/` : interaction avec la base de données (en `SPARQL`)  
– `src/graph/` : initialisation et interaction avec le graphe  
– `src/graph/branches/` : initialisation et interaction avec le graphe en branches (construction et placement des branches, événements, zones colorées)  
– `src/selection/` : interaction avec la liste de tags sélectionnés  
– `src/views/` : liste des affichages disponibles, création de leurs boutons et passage de l'un à l'autre  

– `src/events.js` : écoute des événements d'interaction avec le graphe  
– `src/loading.js` : affichage, masquage et mise en erreur de l'écran de chargement  
– `src/main.js` : définition de la variable globale `app`, création de la base de données et du moteur `Comunica` (pour interagir avec), des boutons d'affichage et de la boite des tags sélectionnés  

– `resources/ontology/structure-tags.rdf` : ontologie des tags (servie via `Github Pages`)  
– `resources/ontology/structure-tags.properties` : paramètres de connexion générés à l'export de l'ontologie (inutilisés ici)  
– `resources/scp-logo.svg` : logo affiché dans l'en-tête et sur l'écran de chargement  
– `resources/besace-malicieuse.txt` : mises à jour qui devront être effectuées pendant l'implémentation finale du nouveau système d'étiquettes (encore en vrac, sera mis au propre plus tard)  
