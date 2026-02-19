import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import "./assets/styles/index.css";
import "./lib/i18n/config";
import App from "./App.tsx";
import WelcomeMessage from "./components/Navigation/WelcomeMessage";
import ExpCalculator from "./components/Calculator/ExpCalculator";
import LimitedTimeSmithingCalculator from "./components/Calculator/LimitedTimeSmithingCalculator";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <WelcomeMessage /> },
      { path: "exp", element: <ExpCalculator /> },
      { path: "limited-smithing", element: <LimitedTimeSmithingCalculator /> },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
