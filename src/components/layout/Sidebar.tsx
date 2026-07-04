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

      <nav className="nav-list" aria-label="Modules">
        {modules.map((module) => {
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
        })}
      </nav>
    </aside>
  );
}
