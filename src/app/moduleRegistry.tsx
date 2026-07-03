import {
  Activity,
  BookOpen,
  LayoutDashboard,
  Settings as SettingsIcon,
  Wallet,
} from "lucide-react";
import { AccountWorkspace } from "../modules/account/AccountWorkspace";
import { DashboardWorkspace } from "../modules/dashboard/DashboardWorkspace";
import { TradesWorkspace } from "../modules/trades/TradesWorkspace";
import { JournalWorkspace } from "../modules/journal/JournalWorkspace";
import { SettingsWorkspace } from "../modules/settings/SettingsWorkspace";
import type { WorkspaceModule, WorkspaceSection } from "./types";

export const workspaceModules: WorkspaceModule[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    description: "Analytics, performance, and recent activity",
    Icon: LayoutDashboard,
    Workspace: DashboardWorkspace,
  },
  {
    id: "account",
    label: "Account",
    description: "Accounts, strategies, and risk management",
    Icon: Wallet,
    Workspace: AccountWorkspace,
  },
  {
    id: "trades",
    label: "Trades",
    description: "Log, track, and recap every trade",
    Icon: Activity,
    Workspace: TradesWorkspace,
  },
  {
    id: "journal",
    label: "Journal",
    description: "Daily, weekly, and monthly recaps",
    Icon: BookOpen,
    Workspace: JournalWorkspace,
  },
  {
    id: "settings",
    label: "Settings",
    description: "Preferences and data management",
    Icon: SettingsIcon,
    Workspace: SettingsWorkspace,
  },
];

export const workspaceSections: WorkspaceSection[] = [
  {
    id: "workspace",
    label: "Workspace",
    Icon: LayoutDashboard,
    modules: workspaceModules,
  },
];
