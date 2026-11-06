import { updateGraphStyle } from "./graph/init.js";

const   THEME_KEY = "tags-selector-theme";

export function isDarkTheme()
{
    return document.documentElement.dataset.theme == "dark";
}

function saveTheme(theme)
{
    try
    {
        localStorage.setItem(THEME_KEY, theme);
    }
    catch
    {
        return;
    }
}

function updateThemeButton()
{
    const   button = document.getElementById("theme-toggle");
    const   dark = isDarkTheme();

    button.textContent = dark ? "☀\uFE0E" : "☾";
    button.title = dark ? "Passer en mode clair" : "Passer en mode sombre";
    button.setAttribute("aria-label", button.title);
}

function toggleTheme()
{
    const   theme = isDarkTheme() ? "light" : "dark";

    document.documentElement.dataset.theme = theme;

    saveTheme(theme);

    updateThemeButton();
    updateGraphStyle();
}

export function initTheme()
{
    updateThemeButton();

    document.getElementById("theme-toggle").addEventListener("click", toggleTheme);
}
