import { Pause, Play, RefreshCw, ShieldCheck, Wallet, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { AppModule } from "../../app/types";
import { runAppUpdate, type AppUpdateState } from "../../shared/appUpdater";
import type { TradingAccount } from "../../shared/db/database";
import type {
  TradingPlanSidebarInfo,
  TradingPlanToken,
} from "../../shared/tradingPlan";
import briocheSongUrl from "./assets/follow-the-plan.mp3";
import methodMarkLockupUrl from "./assets/methodmark-lockup.png";
import methodMarkSymbolUrl from "./assets/methodmark-symbol.png";

type SidebarProps = {
  accounts: TradingAccount[];
  activeModuleId: string;
  isCollapsed: boolean;
  modules: AppModule[];
  selectedAccountId: string | null;
  tradingPlanInfo: TradingPlanSidebarInfo;
  onSelectAccount: (accountId: string) => void;
  onSelectModule: (moduleId: string) => void;
  onToggleCollapsed: () => void;
};

const appDisplayName = import.meta.env.VITE_APP_DISPLAY_NAME ?? "MethodMark";
const appBadgeLabel = import.meta.env.VITE_APP_BADGE_LABEL ?? "Desktop";
const briocheNoteTriggerClicks = 5;
const briochePlanNote = "Hey Brioche, are you following your plan? <3";

export function Sidebar({
  accounts,
  activeModuleId,
  isCollapsed,
  modules,
  selectedAccountId,
  tradingPlanInfo,
  onSelectAccount,
  onSelectModule,
  onToggleCollapsed,
}: SidebarProps) {
  const [updateState, setUpdateState] = useState<AppUpdateState>({
    isBusy: false,
    message: "",
    tone: "idle",
  });
  const mainGroups = [
    modules.filter((module) => module.id === "dashboard"),
    modules.filter(
      (module) => module.id === "trades" || module.id === "recaps",
    ),
    modules.filter((module) => module.id === "account"),
  ].filter((group) => group.length > 0);
  const bottomModules = modules.filter((module) => module.id === "settings");
  const selectedAccount = accounts.find(
    (account) => account.id === selectedAccountId,
  );

  async function handleUpdateClick() {
    if (updateState.isBusy) return;
    await runAppUpdate(setUpdateState);
  }

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
          className={
            isCollapsed ? "brand-toggle brand-toggle-compact" : "brand-toggle"
          }
          onClick={onToggleCollapsed}
          title={isCollapsed ? "Open sidebar" : "Collapse sidebar"}
          type="button"
        >
          <img
            alt=""
            aria-hidden="true"
            className={
              isCollapsed ? "brand-symbol-image" : "brand-lockup-image"
            }
            src={isCollapsed ? methodMarkSymbolUrl : methodMarkLockupUrl}
          />
          <span className="sr-only">{appDisplayName}</span>
        </button>
        {!isCollapsed ? (
          <span className="brand-badge">{appBadgeLabel}</span>
        ) : null}
      </div>

      <label
        className="account-context-picker"
        title={selectedAccount?.name ?? "No account"}
      >
        <Wallet size={16} aria-hidden="true" />
        <span className="sr-only">Selected account</span>
        <select
          value={selectedAccountId ?? ""}
          onChange={(event) => onSelectAccount(event.target.value)}
          disabled={accounts.length === 0}
        >
          {accounts.length === 0 ? (
            <option value="">No account</option>
          ) : (
            accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))
          )}
        </select>
      </label>

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

      <div className="sidebar-bottom">
        <TradingPlanPanel info={tradingPlanInfo} />

        <nav className="nav-list nav-list-bottom" aria-label="Settings">
          {bottomModules.map(renderNavItem)}
          <button
            className="nav-item sidebar-update-button"
            disabled={updateState.isBusy}
            onClick={handleUpdateClick}
            title={updateState.message || "Check for app updates"}
            type="button"
          >
            <RefreshCw
              aria-hidden="true"
              className={updateState.isBusy ? "spin-icon" : undefined}
              size={16}
            />
            <span>{updateState.isBusy ? "Updating..." : "Update"}</span>
          </button>
          {updateState.message ? (
            <p className={`sidebar-update-status ${updateState.tone}`}>
              {updateState.message}
            </p>
          ) : null}
        </nav>
      </div>
    </aside>
  );
}

function PlanTokenList({ tokens }: { tokens: TradingPlanToken[] }) {
  const orderedTokens = ["Min", "Mid", "Max"].map(
    (label) =>
      tokens.find((token) => token.label === label) ?? {
        amountLabel: "-",
        label,
        percentLabel: "-",
        targetLabel: null,
        title: "Not set.",
        tone: "neutral",
      },
  );

  return (
    <>
      {orderedTokens.map((token) => (
        <span
          className={`sidebar-plan-token ${token.tone}`}
          key={token.label}
          title={token.title}
        >
          <strong>{token.targetLabel ?? token.amountLabel}</strong>
          <span>{token.percentLabel}</span>
        </span>
      ))}
    </>
  );
}

function PlanMetric({
  label,
  tokens,
}: {
  label: string;
  tokens: TradingPlanToken[];
}) {
  return (
    <>
      <span className="sidebar-plan-row-label">{label}</span>
      <PlanTokenList tokens={tokens} />
    </>
  );
}

function TradingPlanPanel({ info }: { info: TradingPlanSidebarInfo }) {
  const [noteClicks, setNoteClicks] = useState(0);
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const [isSongPlaying, setIsSongPlaying] = useState(false);
  const songRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      songRef.current?.pause();
    };
  }, []);

  function handleNoteTrigger() {
    setNoteClicks((currentClicks) => {
      const nextClicks = currentClicks + 1;
      if (nextClicks >= briocheNoteTriggerClicks) {
        setIsNoteOpen(true);
        return 0;
      }
      return nextClicks;
    });
  }

  function stopSong() {
    const song = songRef.current;
    if (!song) return;
    song.pause();
    song.currentTime = 0;
    setIsSongPlaying(false);
  }

  function closeNote() {
    stopSong();
    setIsNoteOpen(false);
  }

  async function handleSongToggle() {
    const song = songRef.current;
    if (!song) return;

    if (isSongPlaying) {
      song.pause();
      setIsSongPlaying(false);
      return;
    }

    try {
      await song.play();
      setIsSongPlaying(true);
    } catch {
      setIsSongPlaying(false);
    }
  }

  return (
    <section className="sidebar-plan-panel" aria-label="Trading plan">
      <button
        aria-label="Trading plan"
        className="sidebar-plan-header sidebar-plan-easter-trigger"
        onClick={handleNoteTrigger}
        title="Trading plan"
        type="button"
      >
        <ShieldCheck size={15} aria-hidden="true" />
        <div>
          <strong>Trading plan</strong>
          <span>{info.planLabel}</span>
        </div>
      </button>

      {isNoteOpen ? (
        <aside className="sidebar-easter-egg" aria-label="Brioche plan note">
          <button
            aria-label="Close Brioche note"
            className="sidebar-easter-close"
            onClick={closeNote}
            title="Close"
            type="button"
          >
            <X size={13} aria-hidden="true" />
          </button>
          <strong>Brioche check</strong>
          <p>{briochePlanNote}</p>
          <audio
            onEnded={() => setIsSongPlaying(false)}
            preload="metadata"
            ref={songRef}
            src={briocheSongUrl}
          />
          <button
            aria-label={
              isSongPlaying ? "Pause Follow the Plan" : "Play Follow the Plan"
            }
            className="sidebar-easter-play"
            onClick={handleSongToggle}
            type="button"
          >
            {isSongPlaying ? (
              <Pause size={13} aria-hidden="true" />
            ) : (
              <Play size={13} aria-hidden="true" />
            )}
            <span>{isSongPlaying ? "Pause song" : "Play song"}</span>
          </button>
        </aside>
      ) : null}

      <div className="sidebar-plan-balance">
        <span>Current balance</span>
        <strong>{info.balanceLabel}</strong>
      </div>

      <div className="sidebar-plan-section">
        <span className="sidebar-plan-title">Risk</span>
        <div className="sidebar-plan-grid">
          <span />
          <span>Min</span>
          <span>Mid</span>
          <span>Max</span>
          <PlanMetric label="Trade" tokens={info.risk.trade} />
          <PlanMetric label="Day" tokens={info.risk.day} />
          <PlanMetric label="Week" tokens={info.risk.week} />
        </div>
      </div>

      <div className="sidebar-plan-section">
        <span className="sidebar-plan-title">Goal</span>
        <div className="sidebar-plan-grid">
          <span />
          <span>Min</span>
          <span>Mid</span>
          <span>Max</span>
          <PlanMetric label="Day" tokens={info.goal.day} />
          <PlanMetric label="Week" tokens={info.goal.week} />
        </div>
      </div>

      <div className="sidebar-plan-rules">
        <span className="sidebar-plan-title">Rules</span>
        {info.rules.map((rule) => (
          <div
            className={`sidebar-plan-rule ${rule.tone}`}
            key={rule.label}
            title={rule.title}
          >
            <span>{rule.label}</span>
            <strong>{rule.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
