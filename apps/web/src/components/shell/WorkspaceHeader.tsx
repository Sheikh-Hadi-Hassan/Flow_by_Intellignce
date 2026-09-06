"use client";

import {
  Bell,
  Building2,
  Check,
  CheckSquare,
  FileText,
  FolderKanban,
  Inbox,
  Menu,
  MoreHorizontal,
  Moon,
  Plus,
  Receipt,
  Search,
  Settings,
  Sparkles,
  Sun,
  Target,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { NORTHSTAR_WORKSPACE_NAME } from "../../content/demo/northstar";
import {
  founderLifecycleNav,
  isLifecycleNavActive,
} from "../../lib/navigation/lifecycle-nav";
import { missionNotifications, missionViewer } from "../../lib/mission-control/seed";
import type { PrototypeSession } from "../../lib/prototype/types";
import { useTheme } from "../../lib/theme/context";
import { useAskFlow } from "../ask/AskFlowProvider";

const CENTRE_IDS = ["mission", "clients", "pipeline", "delivery", "team"] as const;

function headerPageTitle(pathname: string, activeLabel?: string): string {
  if (activeLabel) return activeLabel;
  if (pathname.includes("/settings/business")) return "Business Registry";
  if (pathname.includes("/building-blocks")) return "Building blocks";
  if (pathname.includes("/settings")) return "Settings";
  if (pathname.includes("/admin")) return "Workspace";
  return "Workspace";
}

function createActions(workspace: string) {
  const base = `/${workspace}/admin`;
  return [
    { href: `${base}/clients`, label: "Client", Icon: Building2 },
    { href: `${base}/opportunities`, label: "Opportunity", Icon: Target },
    { href: `${base}/lifecycle/projects`, label: "Project", Icon: FolderKanban },
    { href: `${base}/lifecycle/contracts`, label: "Contract", Icon: FileText },
    { href: `${base}/lifecycle/reporting`, label: "Invoice", Icon: Receipt },
    { href: `/${workspace}/work`, label: "Task", Icon: CheckSquare },
  ];
}

export function WorkspaceHeader({
  workspace,
  session,
}: {
  workspace: string;
  session: PrototypeSession;
}) {
  const pathname = usePathname() ?? "";
  const { theme, toggleTheme } = useTheme();
  const ask = useAskFlow();
  const searchRef = useRef<HTMLButtonElement>(null);
  const searchFieldRef = useRef<HTMLInputElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchDraft, setSearchDraft] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const searchPanelId = useId();
  const createId = useId();
  const notesId = useId();
  const menuId = useId();
  const overflowId = useId();
  const headerRef = useRef<HTMLElement>(null);

  const nav = founderLifecycleNav(workspace).filter((item) =>
    (CENTRE_IDS as readonly string[]).includes(item.id),
  );
  const active = nav.find((item) => isLifecycleNavActive(pathname, item));
  const workspaceName =
    session.mode === "demo" ? NORTHSTAR_WORKSPACE_NAME : session.workspaceName;
  const unread = missionNotifications.length;
  const isDark = theme === "dark";

  useEffect(() => {
    if (!searchOpen) return;
    searchFieldRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setSearchOpen(false);
      window.requestAnimationFrame(() => searchRef.current?.focus());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen]);

  useEffect(() => {
    setSearchOpen(false);
    setCreateOpen(false);
    setNotesOpen(false);
    setMenuOpen(false);
    setOverflowOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onPointer = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) {
        setCreateOpen(false);
        setNotesOpen(false);
        setMenuOpen(false);
        setOverflowOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setCreateOpen(false);
      setNotesOpen(false);
      setMenuOpen(false);
      setOverflowOpen(false);
    };
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <header ref={headerRef} className="flow-ws-header" data-testid="workspace-header">
      <div className="flow-ws-header__brand">
        <div className="flow-ws-header__pop-anchor">
          <button
            type="button"
            className="flow-ws-header__menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={() => {
              setCreateOpen(false);
              setNotesOpen(false);
              setMenuOpen((value) => !value);
            }}
          >
            {menuOpen ? <X size={16} aria-hidden /> : <Menu size={16} aria-hidden />}
          </button>
          {menuOpen ? (
            <div id={menuId} className="flow-ws-pop flow-ws-pop--start" role="menu">
              <div className="flow-ws-pop__head">
                <p className="flow-ws-pop__kicker">Workspace</p>
                <p className="flow-ws-pop__name">{workspaceName}</p>
              </div>
              {nav.map((item) => {
                const on = isLifecycleNavActive(pathname, item);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    role="menuitem"
                    className={on ? "flow-ws-pop__item flow-ws-pop__item--on" : "flow-ws-pop__item"}
                    aria-current={on ? "page" : undefined}
                    onClick={() => setMenuOpen(false)}
                  >
                    <span className="flow-ws-pop__glyph" aria-hidden>
                      <Icon size={14} strokeWidth={1.75} />
                    </span>
                    {item.label}
                    {on ? (
                      <Check className="flow-ws-pop__check" size={14} strokeWidth={2} aria-hidden />
                    ) : null}
                  </Link>
                );
              })}
              <div className="flow-ws-pop__foot">
                <Link
                  href={`/${workspace}/admin/building-blocks`}
                  role="menuitem"
                  className="flow-ws-pop__item"
                  onClick={() => setMenuOpen(false)}
                >
                  Building blocks
                </Link>
                <Link
                  href={`/${workspace}/admin/settings`}
                  role="menuitem"
                  className="flow-ws-pop__item"
                  onClick={() => setMenuOpen(false)}
                >
                  <span className="flow-ws-pop__glyph" aria-hidden>
                    <Settings size={14} strokeWidth={1.75} />
                  </span>
                  Settings
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  className="flow-ws-pop__item"
                  onClick={() => {
                    toggleTheme();
                    setMenuOpen(false);
                  }}
                >
                  <span className="flow-ws-pop__glyph" aria-hidden>
                    {isDark ? (
                      <Sun size={14} strokeWidth={1.75} />
                    ) : (
                      <Moon size={14} strokeWidth={1.75} />
                    )}
                  </span>
                  {isDark ? "Light mode" : "Dark mode"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
        <span className="flow-ws-header__tile" aria-hidden>
          <Sparkles size={16} />
        </span>
        <div className="flow-ws-header__identity">
          <Link
            href={`/${workspace}/admin`}
            className="flow-ws-header__wordmark"
          >
            Flow
          </Link>
          <span className="flow-ws-header__workspace">{workspaceName}</span>
        </div>
      </div>

      <div className="flow-ws-header__centre">
        <nav className="flow-ws-header__nav" aria-label="Workspace">
          {nav.map((item) => {
            const on = isLifecycleNavActive(pathname, item);
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={
                  on
                    ? "flow-ws-header__link flow-ws-header__link--on"
                    : "flow-ws-header__link"
                }
                aria-current={on ? "page" : undefined}
              >
                {on ? <Icon size={15} aria-hidden /> : null}
                {item.label}
              </Link>
            );
          })}
        </nav>
        <p className="flow-ws-header__title">
          {headerPageTitle(pathname, active?.label)}
        </p>
      </div>

      <div className="flow-ws-header__utils">
        <button
          ref={searchRef}
          type="button"
          className="flow-ws-util flow-ws-util--search flow-ws-tip"
          aria-label="Search"
          data-tooltip="Search"
          aria-expanded={searchOpen}
          aria-controls={searchPanelId}
          onClick={() => {
            setCreateOpen(false);
            setNotesOpen(false);
            setMenuOpen(false);
            setOverflowOpen(false);
            setSearchOpen(true);
          }}
        >
          <Search size={16} aria-hidden />
        </button>
        <div className="flow-ws-header__pop-anchor">
          <button
            type="button"
            className="flow-ws-util flow-ws-util--create flow-ws-tip"
            aria-label="Quick Create"
            data-tooltip="Quick Create"
            aria-expanded={createOpen}
            aria-controls={createId}
            onClick={() => {
              setNotesOpen(false);
              setMenuOpen(false);
              setOverflowOpen(false);
              setCreateOpen((value) => !value);
            }}
          >
            <Plus size={16} aria-hidden />
          </button>
          {createOpen ? (
            <div id={createId} className="flow-ws-pop" role="menu">
              <div className="flow-ws-pop__head">
                <p className="flow-ws-pop__kicker">Create</p>
                <p className="flow-ws-pop__name">New record</p>
              </div>
              {createActions(workspace).map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  role="menuitem"
                  className="flow-ws-pop__item"
                  onClick={() => setCreateOpen(false)}
                >
                  <span className="flow-ws-pop__glyph" aria-hidden>
                    <item.Icon size={14} strokeWidth={1.75} />
                  </span>
                  {item.label}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
        <Link
          href={`/${workspace}/admin/opportunities`}
          className="flow-ws-util flow-ws-util--approvals flow-ws-tip"
          aria-label="Approvals"
          data-tooltip="Approvals"
        >
          <Inbox size={16} aria-hidden />
        </Link>
        <div className="flow-ws-header__pop-anchor">
          <button
            type="button"
            className="flow-ws-util flow-ws-util--notes flow-ws-tip"
            aria-label={
              unread > 0
                ? `Notifications, ${unread} unread`
                : "Notifications"
            }
            data-tooltip="Notifications"
            aria-expanded={notesOpen}
            aria-controls={notesId}
            onClick={() => {
              setCreateOpen(false);
              setMenuOpen(false);
              setOverflowOpen(false);
              setNotesOpen((value) => !value);
            }}
          >
            <Bell size={16} aria-hidden />
            {unread > 0 ? (
              <span className="flow-ws-header__badge" aria-hidden />
            ) : null}
          </button>
          {notesOpen ? (
            <div
              id={notesId}
              className="flow-ws-pop flow-ws-pop--notes"
              role="region"
              aria-label="Notifications"
            >
              <div className="flow-ws-pop__head">
                <p className="flow-ws-pop__kicker">Notifications</p>
                <p className="flow-ws-pop__name">
                  {unread > 0 ? `${unread} need attention` : "Caught up"}
                </p>
              </div>
              {missionNotifications.map((note) => (
                <article
                  key={note.id}
                  className={`flow-ws-note flow-ws-note--${note.tone}`}
                >
                  <p className="flow-ws-note__body">{note.summary}</p>
                  <p className="flow-ws-note__time">{note.timeLabel}</p>
                </article>
              ))}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          className="flow-ws-util flow-ws-util--theme flow-ws-tip"
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          data-tooltip="Theme"
          onClick={toggleTheme}
        >
          {isDark ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />}
        </button>
        <Link
          href={`/${workspace}/admin/settings`}
          className="flow-ws-header__avatar flow-ws-tip"
          aria-label={`${missionViewer.person.name}, ${missionViewer.person.role}`}
          data-tooltip={missionViewer.person.name}
        >
          {missionViewer.person.initials}
        </Link>

        <div className="flow-ws-header__pop-anchor flow-ws-header__overflow">
          <button
            type="button"
            className="flow-ws-util"
            aria-label={overflowOpen ? "Close more actions" : "More actions"}
            aria-expanded={overflowOpen}
            aria-controls={overflowId}
            onClick={() => {
              setCreateOpen(false);
              setNotesOpen(false);
              setMenuOpen(false);
              setOverflowOpen((value) => !value);
            }}
          >
            <MoreHorizontal size={16} aria-hidden />
          </button>
          {overflowOpen ? (
            <div id={overflowId} className="flow-ws-pop" role="menu">
              <div className="flow-ws-pop__head">
                <p className="flow-ws-pop__kicker">Actions</p>
                <p className="flow-ws-pop__name">{active?.label ?? "Workspace"}</p>
              </div>
              <button
                type="button"
                role="menuitem"
                className="flow-ws-pop__item"
                onClick={() => {
                  setOverflowOpen(false);
                  setSearchOpen(true);
                }}
              >
                <span className="flow-ws-pop__glyph" aria-hidden>
                  <Search size={14} strokeWidth={1.75} />
                </span>
                Search
              </button>
              <button
                type="button"
                role="menuitem"
                className="flow-ws-pop__item"
                onClick={() => {
                  setOverflowOpen(false);
                  setCreateOpen(true);
                }}
              >
                <span className="flow-ws-pop__glyph" aria-hidden>
                  <Plus size={14} strokeWidth={1.75} />
                </span>
                Quick create
              </button>
              <button
                type="button"
                role="menuitem"
                className="flow-ws-pop__item"
                onClick={() => {
                  setOverflowOpen(false);
                  setNotesOpen(true);
                }}
              >
                <span className="flow-ws-pop__glyph" aria-hidden>
                  <Bell size={14} strokeWidth={1.75} />
                </span>
                Notifications
              </button>
              <button
                type="button"
                role="menuitem"
                className="flow-ws-pop__item"
                onClick={() => {
                  toggleTheme();
                  setOverflowOpen(false);
                }}
              >
                <span className="flow-ws-pop__glyph" aria-hidden>
                  {isDark ? (
                    <Sun size={14} strokeWidth={1.75} />
                  ) : (
                    <Moon size={14} strokeWidth={1.75} />
                  )}
                </span>
                {isDark ? "Light mode" : "Dark mode"}
              </button>
              <Link
                href={`/${workspace}/admin/settings`}
                role="menuitem"
                className="flow-ws-pop__item"
                onClick={() => setOverflowOpen(false)}
              >
                <span className="flow-ws-pop__glyph" aria-hidden>
                  <Settings size={14} strokeWidth={1.75} />
                </span>
                Profile & settings
              </Link>
            </div>
          ) : null}
        </div>

        {searchOpen ? (
          <form
            id={searchPanelId}
            className="flow-ws-search"
            onSubmit={(event) => {
              event.preventDefault();
              const value = searchDraft.trim();
              setSearchOpen(false);
              if (value) ask.submit(value);
              else ask.focusComposer();
              window.requestAnimationFrame(() => searchRef.current?.focus());
            }}
          >
            <label className="sr-only" htmlFor="ws-search-field">
              Search workspace
            </label>
            <input
              id="ws-search-field"
              ref={searchFieldRef}
              value={searchDraft}
              placeholder="Search workspace"
              onChange={(event) => setSearchDraft(event.target.value)}
            />
            <button
              type="button"
              className="flow-ws-search__close"
              aria-label="Close search"
              onClick={() => {
                setSearchOpen(false);
                window.requestAnimationFrame(() => searchRef.current?.focus());
              }}
            >
              <X size={14} aria-hidden />
            </button>
          </form>
        ) : null}
      </div>
    </header>
  );
}
