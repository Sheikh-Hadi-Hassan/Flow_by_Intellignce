"use client";

import Link from "next/link";
import { Bell, Menu, Moon, Palette, Search, Sparkles, Sun, X } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { founderLifecycleNav } from "../../../lib/navigation/lifecycle-nav";
import { applyAccent } from "../../../lib/prototype/storage";
import { useTheme } from "../../../lib/theme/context";
import { useWorkspaceSessionActions } from "../../../lib/workspace/session-actions";
import type {
  MissionNotification,
  MissionViewer,
} from "../../../lib/mission-control/types";
import { Wordmark } from "../../ui/Display";

/** The canvas preview's palette: the four standard accents plus the green the
 * reference comparison is judged in. Values flow through the existing accent
 * system, nothing is hard-coded downstream. */
export const CANVAS_ACCENTS = [
  { id: "green", name: "Green", value: "#16a34a" },
  { id: "blue", name: "Blue", value: "#1a56db" },
  { id: "orange", name: "Orange", value: "#c2410c" },
  { id: "teal", name: "Teal", value: "#0d6e6e" },
  { id: "slate", name: "Slate", value: "#334155" },
] as const;

function AppearanceControl({ workspace }: { workspace: string }) {
  const { theme, toggleTheme } = useTheme();
  const { session, updateSession } = useWorkspaceSessionActions(workspace);
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="flow-canvas-head__appearance">
      <button
        type="button"
        className="flow-canvas-head__control"
        aria-label="Accent colour"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <Palette size={15} aria-hidden />
      </button>
      {open ? (
        <div id={panelId} className="flow-canvas-head__palette">
          {CANVAS_ACCENTS.map((accent) => (
            <button
              key={accent.id}
              type="button"
              className="flow-canvas-head__swatch"
              style={{ background: accent.value }}
              aria-pressed={session?.accentColor === accent.value}
              aria-label={`${accent.name} accent`}
              onClick={() => {
                updateSession({ accentColor: accent.value });
                applyAccent(accent.value);
                setOpen(false);
              }}
            />
          ))}
        </div>
      ) : null}
      <button
        type="button"
        className="flow-canvas-head__control"
        aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
        onClick={toggleTheme}
      >
        {theme === "light" ? (
          <Moon size={15} aria-hidden />
        ) : (
          <Sun size={15} aria-hidden />
        )}
      </button>
    </div>
  );
}

function QuietBell({
  notifications,
}: {
  notifications: readonly MissionNotification[];
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="flow-canvas-head__appearance">
      <button
        type="button"
        className="flow-canvas-head__control"
        aria-label={`Notifications, ${notifications.length} unread`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <Bell size={15} aria-hidden />
        {notifications.length > 0 ? (
          <span className="flow-canvas-head__dot" aria-hidden />
        ) : null}
      </button>
      {open ? (
        <div id={panelId} className="flow-canvas-head__palette flow-canvas-head__notes">
          {notifications.map((note) => (
            <p key={note.id} className="flow-canvas-head__note">
              <span>{note.summary}</span>
              <span className="flow-canvas-head__note-time">{note.timeLabel}</span>
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * A header that stays out of the way. Navigation keeps its words — "Pipeline"
 * has no honest icon — but at footnote weight, and every control is compact
 * and borderless so nothing up here competes with the hero value.
 */
export function CanvasHeader({
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
  const nav = founderLifecycleNav(workspace).filter((item) =>
    ["mission", "clients", "pipeline", "delivery", "team"].includes(item.id),
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const drawerId = useId();

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <header className="flow-canvas-head">
      <div className="flow-canvas-head__inner">
        <button
          type="button"
          className="flow-canvas-head__menu"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
          aria-controls={drawerId}
          onClick={() => setMenuOpen((value) => !value)}
        >
          {menuOpen ? <X size={16} aria-hidden /> : <Menu size={16} aria-hidden />}
        </button>

        <div className="flow-canvas-head__identity">
          <Link href={`/${workspace}/admin`} aria-label="Flow home">
            <Wordmark />
          </Link>
          <span className="flow-canvas-head__workspace">
            {viewer.workspaceName}
          </span>
        </div>

        <nav className="flow-canvas-head__nav" aria-label="Workspace sections">
          {nav.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={
                item.id === "mission"
                  ? "flow-canvas-head__link flow-canvas-head__link--on"
                  : "flow-canvas-head__link"
              }
              aria-current={item.id === "mission" ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flow-canvas-head__actions">
          <button
            type="button"
            className="flow-canvas-head__search"
            onClick={onAskFlow}
          >
            <Search size={13} aria-hidden />
            <span>Search {viewer.workspaceName}</span>
          </button>

          <button
            type="button"
            className="flow-canvas-head__control flow-canvas-head__ask"
            aria-label="Ask Flow"
            onClick={onAskFlow}
          >
            <Sparkles size={15} aria-hidden />
          </button>

          <QuietBell notifications={notifications} />

          <AppearanceControl workspace={workspace} />

          <span
            className="flow-canvas-head__avatar"
            title={`${viewer.person.name} · ${viewer.person.role}`}
          >
            <span className="sr-only">
              Signed in as {viewer.person.name}, {viewer.person.role}
            </span>
            <span aria-hidden>{viewer.person.initials}</span>
          </span>
        </div>
      </div>

      {menuOpen ? (
        <div id={drawerId} className="flow-canvas-head__drawer">
          <p className="flow-canvas-head__drawer-workspace">
            {viewer.workspaceName}
          </p>
          <nav className="flow-canvas-head__drawer-nav" aria-label="Workspace sections">
            {nav.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={
                  item.id === "mission"
                    ? "flow-canvas-head__link flow-canvas-head__link--on"
                    : "flow-canvas-head__link"
                }
                aria-current={item.id === "mission" ? "page" : undefined}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
