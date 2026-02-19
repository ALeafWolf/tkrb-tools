import { useTranslation } from "react-i18next";
import { Link } from "react-router";

export default function WelcomeMessage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="text-2xl font-semibold text-fg">
        {t("welcome.title")}
      </h1>
      <p className="mt-2 text-muted">{t("welcome.subtitle")}</p>
      <nav className="mt-6 flex flex-wrap gap-3" aria-label={t("welcome.navLabel")}>
        <Link
          to="/exp"
          className="rounded bg-container px-4 py-2 font-medium text-fg shadow-sm ring-1 ring-black hover:bg-container/90 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          {t("calculator.title")}
        </Link>
        <Link
          to="/limited-smithing"
          className="rounded bg-container px-4 py-2 font-medium text-fg shadow-sm ring-1 ring-black hover:bg-container/90 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          {t("limitedSmithing.title")}
        </Link>
      </nav>
    </div>
  );
}
