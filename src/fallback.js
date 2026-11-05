function failScripts()
{
    const   overlay = document.getElementById("popup-overlay");
    const   button = document.getElementById("popup-ok");

    document.getElementById("loading-spinner").classList.add("hidden");
    document.getElementById("loading-text").textContent = "Échec du chargement de l'ontologie.";

    document.getElementById("popup-title").textContent = "Scripts non chargés";
    document.getElementById("popup-text").textContent = "Les scripts de l'application n'ont pas pu être chargés.\n\nSi la page est ouverte comme fichier local, servez-la plutôt via un serveur HTTP.";

    button.addEventListener("click", () => overlay.classList.add("hidden"));

    overlay.classList.remove("hidden");
    button.focus();
}
