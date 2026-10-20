import { useEffect } from "react";

const APP_NAME = "Agent Theory Practice";

/** Sets document.title for the current page ("Page · App"). */
export function usePageTitle(title: string | undefined) {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_NAME}` : APP_NAME;
  }, [title]);
}
