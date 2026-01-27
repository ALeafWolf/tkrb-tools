import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Header() {
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 left-0 bg-blue-600 text-white px-6 py-4 shadow-lg z-50">
      <div className="flex items-center justify-between">
        <h1 className="lg:text-2xl font-bold md:text-xl text-lg">
          {t("common.siteName")}
        </h1>
        <LanguageSwitcher />
      </div>
    </header>
  );
}
