import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { WorkspaceSection } from "../../app/types";

type SidebarProps = {
  activeModuleId: string;
  isCollapsed: boolean;
  onSelectModule: (moduleId: string) => void;
  onToggleCollapsed: () => void;
  sections: WorkspaceSection[];
};

export function Sidebar({
  activeModuleId,
  isCollapsed,
  onSelectModule,
  onToggleCollapsed,
  sections,
}: SidebarProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    () =>
      Object.fromEntries(
        sections.map((section) => [section.id, true]),
      ) as Record<string, boolean>,
  );

  function toggleSection(sectionId: string) {
    setOpenSections((current) => ({
      ...current,
      [sectionId]: !(current[sectionId] ?? true),
    }));
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

      <nav className="nav-sections">
        {sections.map((section) => {
          const isOpen = openSections[section.id] ?? true;
          const hasActiveModule = section.modules.some(
            (module) => module.id === activeModuleId,
          );
          const SectionIcon = section.Icon;

          return (
            <section className="nav-section" key={section.id}>
              <button
                aria-expanded={isCollapsed ? undefined : isOpen}
                aria-label={section.label}
                className={
                  hasActiveModule
                    ? "nav-section-button active"
                    : "nav-section-button"
                }
                onClick={() =>
                  isCollapsed
                    ? onSelectModule(section.modules[0].id)
                    : toggleSection(section.id)
                }
                title={section.label}
                type="button"
              >
                <span className="nav-section-title">
                  <SectionIcon aria-hidden="true" size={17} />
                  <span>{section.label}</span>
                </span>
                <span className="nav-chevron">
                  {isOpen ? (
                    <ChevronDown aria-hidden="true" size={16} />
                  ) : (
                    <ChevronRight aria-hidden="true" size={16} />
                  )}
                </span>
              </button>

              {isOpen || isCollapsed ? (
                <div className="nav-list">
                  {section.modules.map((module) => {
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
                </div>
              ) : null}
            </section>
          );
        })}
      </nav>
    </aside>
  );
}
