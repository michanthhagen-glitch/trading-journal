import {
  Activity,
  BookOpen,
  LayoutDashboard,
  Settings,
  Wallet,
} from "lucide-react";
import { AccountModule } from "../modules/account/AccountModule";
import { DashboardModule } from "../modules/dashboard/DashboardModule";
import { TradesModule } from "../modules/trades/TradesModule";
import { JournalModule } from "../modules/journal/JournalModule";
import { SettingsModule } from "../modules/settings/SettingsModule";
import type { AppModule } from "./types";

export const appModules: AppModule[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    description: "Analytics, performance, and recent activity",
    Icon: LayoutDashboard,
    Component: DashboardModule,
  },
  {
    id: "account",
    label: "Account",
    description: "Accounts, strategies, and risk management",
    Icon: Wallet,
    Component: AccountModule,
  },
  {
    id: "trades",
    label: "Trades",
    description: "Log, track, and recap every trade",
    Icon: Activity,
    Component: TradesModule,
  },
  {
    id: "journal",
    label: "Journal",
    description: "Daily, weekly, and monthly recaps",
    Icon: BookOpen,
    Component: JournalModule,
  },
  {
    id: "settings",
    label: "Settings",
    description: "Preferences and data management",
    Icon: Settings,
    Component: SettingsModule,
  },
];
