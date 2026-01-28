import { useTranslation } from "react-i18next";

const LANGUAGES = [
  { code: "zh", label: "中文" },
  { code: "en", label: "English" },
  { code: "ja", label: "日本語" },
] as const;

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    localStorage.setItem("i18nextLng", langCode);
  };

  return (
    <div className="flex items-center gap-2">
      {LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          onClick={() => handleLanguageChange(lang.code)}
          className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
            i18n.language === lang.code
              ? "bg-white text-blue-600"
              : "text-white hover:bg-blue-700"
          }`}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}
