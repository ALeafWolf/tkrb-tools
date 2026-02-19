import { useTranslation } from "react-i18next";
import { NavLink, Outlet } from "react-router";
import Header from "./components/Navigation/Header";

function App() {
  const { t } = useTranslation();

  return (
    <div className="bg-primary-surface relative min-h-screen">
      <Header />
      <nav className="mx-auto flex max-w-4xl justify-center gap-2 border-b border-black px-6 py-2">
        <NavLink
          to="/exp"
          className={({ isActive }) =>
            `rounded-t px-4 py-2 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none ${
              isActive
                ? "bg-container border border-b-0 border-black shadow-sm"
                : "bg-panel hover:bg-container/80"
            }`
          }
        >
          {t("calculator.title")}
        </NavLink>
        <NavLink
          to="/limited-smithing"
          className={({ isActive }) =>
            `rounded-t px-4 py-2 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none ${
              isActive
                ? "bg-container border border-b-0 border-black shadow-sm"
                : "bg-panel hover:bg-container/80"
            }`
          }
        >
          {t("limitedSmithing.title")}
        </NavLink>
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  );
}

export default App;
