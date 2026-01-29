import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Header() {
  const { t } = useTranslation();

  return (
    <header className="bg-panel sticky top-0 left-0 z-50 shadow-lg">
      <div className="flex items-center justify-between p-4">
        <p className="text-sm">
          {t("common.siteName")}
        </p>
        <LanguageSwitcher />
      </div>
    </header>
  );
}
