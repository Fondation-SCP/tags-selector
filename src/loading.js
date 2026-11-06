import { app } from "./state.js";
import { showPopup, updateInert } from "./popup.js";
import { LoadError } from "./errors.js";

export function checkLibrary(name, loaded)
{
    if (!loaded)
        throw new LoadError("Bibliothèque manquante", ["La bibliothèque ", { italic: name }, " n'a pas pu être chargée depuis son CDN.\n\nVérifiez votre connexion ou un éventuel bloqueur de contenu, puis rechargez la page."]);
}

export function isLoading()
{
    return !document.getElementById("loading-overlay").classList.contains("hidden");
}

// Affiche l'écran de chargement
export function showLoading()
{
    document.getElementById("loading-spinner").classList.remove("hidden");
    document.getElementById("loading-local").classList.add("hidden");
    document.getElementById("loading-text").textContent = "Chargement de l'ontologie...";
    document.getElementById("loading-overlay").classList.remove("hidden");

    updateInert();
}

// Cache l'écran de chargement
export function hideLoading()
{
    document.getElementById("loading-overlay").classList.add("hidden");

    updateInert();
}

export function showLoadError(error)
{
    console.error(error);

    if (error instanceof LoadError)
        showPopup(error.title, error.popup);
    else
        showPopup("Erreur inattendue", ["Le chargement a été interrompu par une erreur imprévue :\n\n", { italic: String(error) }]);
}

// Remplace l'écran de chargement par un message d'erreur
export function failLoading(error)
{
    const   local = document.getElementById("loading-local");

    document.getElementById("loading-spinner").classList.add("hidden");
    local.classList.toggle("hidden", app.engine == null);
    document.getElementById("loading-text").textContent = "Échec du chargement de l'ontologie.";
    document.getElementById("loading-overlay").classList.remove("hidden");

    updateInert();

    if (app.engine != null)
        local.focus();

    showLoadError(error);
}
