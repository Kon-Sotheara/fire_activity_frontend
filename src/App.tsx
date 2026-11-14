import { useEffect, useState } from "react";

import { DashboardPage } from "./dashboard/DashboardPage";
import { AboutUs } from "./pages/AboutUs";
import { GeneralPage } from "./pages/GeneralPage";
import { MethodOverview } from "./pages/MethodOverview";

type Page = "home" | "explorer" | "about" | "methods";

function currentPage(): Page {
  const page = window.location.hash.replace("#/", "") as Page;
  return ["explorer", "about", "methods"].includes(page) ? page : "home";
}

export function App() {
  const [page, setPage] = useState<Page>(currentPage);

  useEffect(() => {
    const updatePage = () => setPage(currentPage());
    window.addEventListener("hashchange", updatePage);
    return () => window.removeEventListener("hashchange", updatePage);
  }, []);

  if (page === "explorer") return <DashboardPage />;
  if (page === "about") return <AboutUs />;
  if (page === "methods") return <MethodOverview />;
  return <GeneralPage />;
}
