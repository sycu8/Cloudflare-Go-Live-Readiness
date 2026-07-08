import "./style.css";
import { mountApp } from "./app.js";

const root = document.getElementById("app");
if (root) {
  mountApp(root).catch((err) => {
    root.textContent = `Failed to start: ${err instanceof Error ? err.message : String(err)}`;
  });
}
