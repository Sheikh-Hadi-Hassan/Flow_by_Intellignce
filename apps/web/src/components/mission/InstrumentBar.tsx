"use client";

import Link from "next/link";
import { Bell, Moon, Search, Sparkles, Sun } from "lucide-react";
import { useId, useState } from "react";

import { useTheme } from "../../lib/theme/context";
import { applyAccent } from "../../lib/prototype/storage";
import { useWorkspaceSessionActions } from "../../lib/workspace/session-actions";
import { founderLifecycleNav } from "../../lib/navigation/lifecycle-nav";
import type { MissionNotification, MissionViewer } from "../../lib/mission-control/types";
import { IconButton } from "../ui/Button";
import { Wordmark } from "../ui/Display";

const ACCENTS = [
  { id: "blue", name: "Blue", value: "#1a56db" },
  { id: "orange", name: "Orange", value: "#c2410c" },
  { id: "teal", name: "Teal", value: "#0d6e6e" },
  { id: "slate", name: "Slate", value: "#334155" },
];

export function AccentPicker({ workspace }: { workspace: string }) {
  const { session, updateSession } = useWorkspaceSessionActions(workspace);

  return (
    <div
      className="flow-mc-accents"
      role="group"
      aria-label="Workspace accent color"
    >
      {ACCENTS.map((accent) => (
        <button
          key={accent.id}
          type="button"
          className="flow-mc-accents__swatch"
          style={{ background: accent.value }}
          aria-pressed={session?.accentColor === accent.value}
          aria-label={`${accent.name} accent`}
          title={`${accent.name} accent`}
          onClick={() => {
            updateSession({ accentColor: accent.value });
            applyAccent(accent.value);
          }}
        />
      ))}
    </div>
  );
}

export function NotificationBell({
  notifications,
}: {
  notifications: readonly MissionNotification[];
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const unread = notifications.length;

  return (
    <div style={{ position: "relative" }}>
      <IconButton
        label={`Notifications, ${unread} unread`}
        className="flow-mc-bar__bell"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <Bell size={18} aria-hidden />
        {unread > 0 ? (
          <span className="flow-mc-bar__bell-dot" aria-hidden>
            {unread}
          </span>
        ) : null}
      </IconButton>
      {open ? (
        <div
          id={panelId}
          className="flow-panel"
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + var(--space-2))",
            width: "min(320px, calc(100vw - var(--space-8)))",
            zIndex: 60,
            boxShadow: "var(--shadow-md)",
          }}
        >
          <p className="flow-mc-block__title">Notifications</p>
          <ul className="flow-mc-rows" style={{ marginTop: "var(--space-2)" }}>
            {notifications.map((note) => (
              <li key={note.id}>
                <div className="flow-mc-row">
                  <span className="flow-mc-row__main">
                    <span className="flow-mc-row__name">{note.summary}</span>
                  </span>
                  <span className="flow-mc-row__note">{note.timeLabel}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function InstrumentBar({
  workspace,
  viewer,
  notifications,
  onAskFlow,
}: {
  workspace: string;
  viewer: MissionViewer;
  notifications: readonly MissionNotification[];
  onAskFlow: () => void;
}) {
  const { theme, toggleTheme } = useTheme();
  const nav = founderLifecycleNav(workspace).filter((item) =>
    ["mission", "clients", "pipeline", "delivery", "team"].includes(item.id),
  );

  return (
    <header className="flow-mc-bar">
      <div className="flow-mc__inner flow-mc-bar__inner">
        <div className="flow-mc-bar__identity">
          <Link href={`/${workspace}/admin`} aria-label="Flow home">
            <Wordmark />
          </Link>
          <span className="flow-mc-bar__divider" aria-hidden />
          <span className="flow-mc-bar__workspace">{viewer.workspaceName}</span>
        </div>

        <nav className="flow-mc-bar__nav" aria-label="Workspace sections">
          {nav.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={
                item.id === "mission"
                  ? "flow-mc-bar__nav-link flow-mc-bar__nav-link--active"
                  : "flow-mc-bar__nav-link"
              }
              aria-current={item.id === "mission" ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <span className="flow-mc-bar__spacer" />

        <div className="flow-mc-bar__actions">
          <button
            type="button"
            className="flow-mc-bar__search"
            onClick={onAskFlow}
          >
            <Search size={14} aria-hidden />
            <span>Search {viewer.workspaceName}</span>
            <kbd aria-hidden>/</kbd>
          </button>

          <button type="button" className="flow-mc-bar__ask" onClick={onAskFlow}>
            <Sparkles size={14} aria-hidden />
            <span>Ask Flow</span>
          </button>

          <NotificationBell notifications={notifications} />

          <AccentPicker workspace={workspace} />

          <IconButton
            label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
            onClick={toggleTheme}
          >
            {theme === "light" ? (
              <Moon size={18} aria-hidden />
            ) : (
              <Sun size={18} aria-hidden />
            )}
          </IconButton>

          <span
            className="flow-mc-bar__avatar"
            title={`${viewer.person.name} · ${viewer.person.role}`}
          >
            <span className="sr-only">
              Signed in as {viewer.person.name}, {viewer.person.role}
            </span>
            <span aria-hidden>{viewer.person.initials}</span>
          </span>
        </div>
      </div>
    </header>
  );
}
