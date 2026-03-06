import { useEffect } from "react";

const APP_NAME = "Taskboard";

/**
 * Sets the browser tab title and restores it when the component unmounts.
 * @param {string} title - The page-specific title to show before the app name.
 *                         Pass null/undefined to show just the app name.
 */
export function usePageTitle(title) {
    useEffect(() => {
        const prev = document.title;
        document.title = title ? `${title} — ${APP_NAME}` : APP_NAME;
        return () => { document.title = prev; };
    }, [title]);
}
