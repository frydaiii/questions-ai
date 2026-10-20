import { HashRouter, Route, Routes } from "react-router-dom";
import type { Bank } from "./types";
import { BankProvider } from "./data/BankProvider";
import { BankGate } from "./data/BankGate";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { ExamPage } from "./pages/ExamPage";
import { ResultsPage } from "./pages/ResultsPage";
import { ReviewPage } from "./pages/ReviewPage";
import { HistoryPage } from "./pages/HistoryPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { PreviewPage } from "./pages/PreviewPage";

export function AppRoutes() {
  return (
    <Layout>
      <BankGate>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/exam" element={<ExamPage />} />
          <Route path="/results/:attemptId" element={<ResultsPage />} />
          <Route path="/review/:attemptId" element={<ReviewPage />} />
          <Route path="/history" element={<HistoryPage />} />
          {import.meta.env.DEV && <Route path="/preview" element={<PreviewPage />} />}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BankGate>
    </Layout>
  );
}

export default function App({ bank }: { bank?: Bank }) {
  return (
    <BankProvider bank={bank}>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </BankProvider>
  );
}
