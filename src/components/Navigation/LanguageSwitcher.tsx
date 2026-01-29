import { useTranslation } from "react-i18next";
import { useState, useEffect, useRef } from "react";
import { Button } from "../Shared/Button";
import { ContentContainer } from "../Shared/ContentContainer";
import { cn } from "../../lib/helpers";

const LANGUAGES = [
  { code: "zh", label: "中文" },
  { code: "en", label: "English" },
  { code: "ja", label: "日本語" },
] as const;

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    localStorage.setItem("i18nextLng", langCode);
    setIsOpen(false);
  };

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="absolute top-2 right-3">
      <Button
        onClick={handleToggle}
        className="bg-positive p-6"
        cornerClassName="border-b-positive-accent border-b-24 border-l-24"
      >
        {t("common.language")}
      </Button>
      {isOpen && (
        <ContentContainer className="p-0 shadow-md flex flex-col border-none">
          {LANGUAGES.map((lang, index) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={cn("relative text-sm font-medium border border-black py-2",
                "hover:bg-danger-soft hover:cursor-pointer hover:after:content-['✓']",
                "after:absolute after:right-2 after:top-1/2 after:-translate-y-1/2 after:text-danger after:font-semibold",
                index !== LANGUAGES.length - 1 && "border-b-0",
                i18n.language === lang.code
                && "bg-danger-soft after:content-['✓']")}
            >
              {lang.label}
            </button>
          ))}
        </ContentContainer>
      )}
    </div>
  );
}
