import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";
import type { Bank } from "../types";

/** Render the full app (HashRouter) at `route` with an injected bank. */
export function renderApp(bank: Bank, route = "/") {
  window.location.hash = `#${route}`;
  const user = userEvent.setup();
  const utils = render(<App bank={bank} />);
  return { user, ...utils };
}
