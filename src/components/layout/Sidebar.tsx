import type { AppModule } from "../../app/types";

type SidebarProps = {
  activeModuleId: string;
  isCollapsed: boolean;
  modules: AppModule[];
  onSelectModule: (moduleId: string) => void;
  onToggleCollapsed: () => void;
};

export function Sidebar({
  activeModuleId,
  isCollapsed,
  modules,
  onSelectModule,
  onToggleCollapsed,
}: SidebarProps) {
  const mainGroups = [
    modules.filter((module) => module.id === "dashboard"),
    modules.filter(
      (module) => module.id === "trades" || module.id === "recaps",
    ),
    modules.filter((module) => module.id === "account"),
  ].filter((group) => group.length > 0);
  const bottomModules = modules.filter((module) => module.id === "settings");

  function renderNavItem(module: AppModule) {
    const isActive = module.id === activeModuleId;
    const Icon = module.Icon;

    return (
      <button
        aria-current={isActive ? "page" : undefined}
        className={isActive ? "nav-item active" : "nav-item"}
        key={module.id}
        onClick={() => onSelectModule(module.id)}
        title={module.label}
        type="button"
      >
        <Icon aria-hidden="true" size={16} />
        <span>{module.label}</span>
      </button>
    );
  }

  return (
    <aside
      className={isCollapsed ? "sidebar collapsed" : "sidebar"}
      aria-label="Main navigation"
    >
      <div className="brand">
        <button
          aria-label={isCollapsed ? "Open sidebar" : "Collapse sidebar"}
          aria-pressed={isCollapsed}
          className="brand-mark"
          onClick={onToggleCollapsed}
          title={isCollapsed ? "Open sidebar" : "Collapse sidebar"}
          type="button"
        >
          T
        </button>
        <div className="brand-copy">
          <strong>Trading Journal</strong>
          <span>Desktop</span>
        </div>
      </div>

      <nav className="nav-list nav-list-main" aria-label="Modules">
        {mainGroups.map((group) => (
          <div
            className="nav-section"
            key={group.map((module) => module.id).join("-")}
          >
            {group.map(renderNavItem)}
          </div>
        ))}
      </nav>

      <nav className="nav-list nav-list-bottom" aria-label="Settings">
        {bottomModules.map(renderNavItem)}
      </nav>
    </aside>
  );
}
