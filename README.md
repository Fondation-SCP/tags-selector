# tags-selector

## Hiérarchie

– `src/database/` : interaction avec la base de données (via `SPARQL`)  
– `src/graph/` : initialisation et interaction avec le graphe  
– `src/selection/` : interaction avec la liste de tags sélectionnés  

– `src/events.js` : écoute des événements d'interaction avec le graphe  
– `src/main.js` : définition de la variable globale `app`, création de la base de données et du moteur `Comunica` (pour interagir avec), du graphe et de la boite des tags sélectionnés  

– `resources/ontology/structure-tags.rdf` : ontologie des tags (servie via `Github Pages`)  
– `resources/besace-malicieuse.txt` : mises à jour qui devront être effectuées pendant l'implémentation finale du nouveau système d'étiquettes (encore en vrac, sera mis au propre plus tard)  
