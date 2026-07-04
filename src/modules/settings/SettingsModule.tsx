import { Sparkles } from "lucide-react";
import type { ModuleContext } from "../../app/types";

export function SettingsModule(_context: ModuleContext) {
  return (
    <div className="placeholder-module">
      <div className="placeholder-card">
        <span className="placeholder-icon" aria-hidden="true">
          <Sparkles size={20} />
        </span>
        <h2>Settings</h2>
        <p>Account, broker connections, backup, theme — coming next.</p>
        <p className="placeholder-foot">Shell only — content arrives later.</p>
      </div>
    </div>
  );
}
