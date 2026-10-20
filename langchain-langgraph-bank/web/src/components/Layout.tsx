import { useEffect, useRef, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useTheme } from "../hooks/useTheme";
import { LogoMark, MoonIcon, SunIcon } from "./Icons";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      className="icon-btn"
      onClick={toggle}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
    >
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);

  // On route change, move focus to <main> so screen-reader and keyboard users start
  // at the new page's content (skipped on first load to keep the browser default).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo({ top: 0 });
    mainRef.current?.focus({ preventScroll: true });
  }, [location.pathname]);

  return (
    <div className="app">
      <a href="#main" className="skip-link" onClick={(e) => {
        e.preventDefault();
        mainRef.current?.focus();
      }}>
        Skip to content
      </a>
      <header className="app-header">
        <div className="app-header__inner">
          <Link to="/" className="brand">
            <LogoMark />
            <span className="brand__name">
              Agent Theory <span className="brand__accent">Practice</span>
            </span>
          </Link>
          <nav aria-label="Main" className="app-nav">
            <NavLink to="/" end className="app-nav__link">
              Practice
            </NavLink>
            <NavLink to="/history" className="app-nav__link">
              History
            </NavLink>
          </nav>
          <ThemeToggle />
        </div>
      </header>
      <main id="main" ref={mainRef} tabIndex={-1} className="app-main">
        {children}
      </main>
      <footer className="app-footer">
        <p>
          Independent, original study material on framework-agnostic AI agent theory. Not affiliated with any AI
          vendor or framework.
        </p>
      </footer>
    </div>
  );
}
