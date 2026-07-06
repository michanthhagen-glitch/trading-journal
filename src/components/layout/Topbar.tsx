import { Bell, Search } from "lucide-react";
import type { AppModule } from "../../app/types";

type TopbarProps = {
  activeModule: AppModule;
};

export function Topbar({ activeModule }: TopbarProps) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">{activeModule.description}</p>
        <h1>{activeModule.label}</h1>
      </div>

      <div className="topbar-actions">
        <button aria-label="Search" className="icon-button" type="button">
          <Search aria-hidden="true" size={18} />
        </button>
        <button
          aria-label="Notifications"
          className="icon-button"
          type="button"
        >
          <Bell aria-hidden="true" size={18} />
        </button>
      </div>
    </header>
  );
}
