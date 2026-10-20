import { Link } from "react-router-dom";
import { usePageTitle } from "../hooks/usePageTitle";

export function NotFoundPage() {
  usePageTitle("Page not found");
  return (
    <div className="page empty-state">
      <p className="eyebrow">404</p>
      <h1 className="page-title">Page not found</h1>
      <p className="muted">The page you’re looking for doesn’t exist.</p>
      <Link to="/" className="btn btn--primary">
        Go to practice
      </Link>
    </div>
  );
}
