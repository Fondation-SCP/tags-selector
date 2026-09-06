// Affiche l'écran de chargement
export function showLoading()
{
    document.getElementById("loading-overlay").classList.remove("hidden");
}

// Cache l'écran de chargement
export function hideLoading()
{
    document.getElementById("loading-overlay").classList.add("hidden");
}

// Remplace l'écran de chargement par un message d'erreur
export function failLoading()
{
    document.getElementById("loading-spinner").remove();
    document.getElementById("loading-text").textContent = "Échec du chargement de l'ontologie.";
}
