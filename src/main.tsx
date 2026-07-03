import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app/App";
import { initializeDatabase } from "./shared/db/database";
import "./styles.css";

void initializeDatabase().catch((error) => {
  console.error("Database initialization failed", error);
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
