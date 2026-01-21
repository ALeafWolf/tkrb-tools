import { SITE_NAME } from "../lib/consts";

export default function Header() {
  return (
    <header className="sticky top-0 left-0 bg-blue-600 text-white px-6 py-4 shadow-lg z-50">
      <h1 className="lg:text-2xl font-bold md:text-xl text-lg">{SITE_NAME}</h1>
    </header>
  );
}
