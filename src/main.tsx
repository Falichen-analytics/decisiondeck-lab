import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DecisionDeckLab } from "./components/DecisionDeckLab";
import "./styles.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("DecisionDeck Lab root element was not found.");
}

createRoot(root).render(
  <StrictMode>
    <DecisionDeckLab />
  </StrictMode>,
);
