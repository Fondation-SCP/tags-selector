import { showPopup } from "./popup.js";

export class LoadError extends Error
{
    constructor(title, message, cause)
    {
        super(message.map(part => typeof part == "string" ? part : part.italic).join(""), { cause: cause });

        this.name = "LoadError";
        this.title = title;
        this.popup = message;
    }
}

export function checkLibrary(name, loaded)
{
    if (!loaded)
        throw new LoadError("Bibliothèque manquante", ["La bibliothèque ", { italic: name }, " n'a pas pu être chargée depuis son CDN.\n\nVérifiez votre connexion ou un éventuel bloqueur de contenu, puis rechargez la page."]);
}

// Affiche l'écran de chargement
export function showLoading()
{
    document.getElementById("loading-spinner").classList.remove("hidden");
    document.getElementById("loading-text").textContent = "Chargement de l'ontologie...";
    document.getElementById("loading-overlay").classList.remove("hidden");
}

// Cache l'écran de chargement
export function hideLoading()
{
    document.getElementById("loading-overlay").classList.add("hidden");
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
    document.getElementById("loading-spinner").classList.add("hidden");
    document.getElementById("loading-text").textContent = "Échec du chargement de l'ontologie.";

    showLoadError(error);
}
