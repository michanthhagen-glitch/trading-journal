import { Bell, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AppModule } from "../../app/types";

export type TopbarSearchItem = {
  id: string;
  label: string;
  description: string;
  keywords: string;
  onSelect: () => void;
};

export type TopbarNotification = {
  id: string;
  title: string;
  detail: string;
  tone: "info" | "warning";
  onSelect: () => void;
};

type TopbarProps = {
  activeModule: AppModule;
  searchItems: TopbarSearchItem[];
  notifications: TopbarNotification[];
};

export function Topbar({
  activeModule,
  searchItems,
  notifications,
}: TopbarProps) {
  const [openPanel, setOpenPanel] = useState<"search" | "notifications" | null>(
    null,
  );
  const [query, setQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return searchItems.slice(0, 10);
    return searchItems
      .filter((item) =>
        `${item.label} ${item.description} ${item.keywords}`
          .toLowerCase()
          .includes(normalized),
      )
      .slice(0, 20);
  }, [query, searchItems]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpenPanel("search");
      }
      if (event.key === "Escape") setOpenPanel(null);
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    if (openPanel === "search") searchInputRef.current?.focus();
  }, [openPanel]);

  function closePanel() {
    setOpenPanel(null);
    setQuery("");
  }

  function choose(action: () => void) {
    action();
    closePanel();
  }

  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">{activeModule.description}</p>
        <h1>{activeModule.label}</h1>
      </div>

      <div className="topbar-actions">
        <button
          aria-label="Search"
          aria-expanded={openPanel === "search"}
          className="icon-button"
          type="button"
          onClick={() =>
            setOpenPanel((current) => (current === "search" ? null : "search"))
          }
          title="Search (Ctrl+K)"
        >
          <Search aria-hidden="true" size={18} />
        </button>
        <button
          aria-label="Notifications"
          aria-expanded={openPanel === "notifications"}
          className="icon-button topbar-notification-button"
          type="button"
          onClick={() =>
            setOpenPanel((current) =>
              current === "notifications" ? null : "notifications",
            )
          }
        >
          <Bell aria-hidden="true" size={18} />
          {notifications.length > 0 ? (
            <span className="topbar-notification-count">
              {notifications.length}
            </span>
          ) : null}
        </button>

        {openPanel ? (
          <aside
            className="topbar-panel"
            aria-label={
              openPanel === "search" ? "Search journal" : "Notifications"
            }
          >
            <header className="topbar-panel-header">
              <strong>
                {openPanel === "search" ? "Search journal" : "Notifications"}
              </strong>
              <button
                className="icon-button"
                type="button"
                aria-label="Close"
                onClick={closePanel}
              >
                <X size={15} aria-hidden="true" />
              </button>
            </header>

            {openPanel === "search" ? (
              <>
                <label className="topbar-search-field">
                  <Search size={15} aria-hidden="true" />
                  <span className="sr-only">
                    Search accounts, trades, strategies, and risk plans
                  </span>
                  <input
                    ref={searchInputRef}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search accounts, trades, strategies..."
                  />
                </label>
                <div className="topbar-panel-list">
                  {filteredItems.length === 0 ? (
                    <p className="topbar-panel-empty">
                      No matching journal items.
                    </p>
                  ) : (
                    filteredItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => choose(item.onSelect)}
                      >
                        <strong>{item.label}</strong>
                        <span>{item.description}</span>
                      </button>
                    ))
                  )}
                </div>
              </>
            ) : (
              <div className="topbar-panel-list">
                {notifications.length === 0 ? (
                  <p className="topbar-panel-empty">You're all caught up.</p>
                ) : (
                  notifications.map((notice) => (
                    <button
                      className={`topbar-notice ${notice.tone}`}
                      key={notice.id}
                      type="button"
                      onClick={() => choose(notice.onSelect)}
                    >
                      <strong>{notice.title}</strong>
                      <span>{notice.detail}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </aside>
        ) : null}
      </div>
    </header>
  );
}
