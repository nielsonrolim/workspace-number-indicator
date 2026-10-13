# Workspace Number Indicator

![GNOME Shell](https://img.shields.io/badge/GNOME%20Shell-45--51-blue)
![License](https://img.shields.io/badge/license-GPL--2.0-green)

A GNOME Shell extension that displays the current workspace number in the top panel. Supports showing just the current workspace (`2`), current/total (`2 / 4`), or a clickable list of all workspaces (`1 2 [3] 4`), and lets you place the indicator on the left or right side of the panel. Compatible with GNOME Shell 45–51.

<!-- Add screenshot here -->

## Features

- Displays current workspace number in the top panel
- Optional `current / total` format (e.g. `2 / 4`) or just the current number (e.g. `2`)
- Optional list of all workspaces as clickable numbers, highlighting the active one and those with windows
- Configurable panel position: left or right
- When placed on the left, choose before or after the Activities button
- Optionally hide the Activities button workspace pills
- Optional keyboard shortcuts: `Super + 1 … 0` switches to workspace 1–10 and `Shift + Super + 1 … 0` moves the current window there
- Left- or right-click the indicator to toggle the Overview (in the list style, left-clicking or tapping a number switches to that workspace, and right-click toggles the Overview)
- The indicator is highlighted while the Overview is open, matching the Activities button pills

## Installation

### GNOME Extensions website

Install from [extensions.gnome.org](https://extensions.gnome.org) *(link coming soon)*.

### Manual install

```bash
git clone https://github.com/nielsonrolim/workspace-number-indicator.git \
  ~/.local/share/gnome-shell/extensions/workspace-number-indicator@nielsonrolim.github.io
cd ~/.local/share/gnome-shell/extensions/workspace-number-indicator@nielsonrolim.github.io
glib-compile-schemas schemas/
gnome-extensions enable workspace-number-indicator@nielsonrolim.github.io
```

Then reload GNOME Shell (X11: `killall -HUP gnome-shell`; Wayland: log out and back in).

## Settings

Open the preferences window with:

```bash
gnome-extensions prefs workspace-number-indicator@nielsonrolim.github.io
```

The options are in the **Display** and **Keyboard shortcuts** groups of the preferences window:

| Option | Key | Type | Default | Effect |
|--------|-----|------|---------|--------|
| Indicator style | `indicator-style` | string | `'number'` | `'number'` → shows only the current workspace; `'list'` → shows every workspace as a number (click to switch), with the active one highlighted and those with windows in white |
| Show total number of workspaces | `show-total` | boolean | `true` | `true` → shows `current / total` (e.g. `2 / 4`); `false` → shows only `current` (e.g. `2`). Disabled in the preferences window when the style is list |
| Hide workspace pills | `hide-workspace-pills` | boolean | `false` | `true` → hides the Activities button and its workspace pills from the top bar |
| Panel position | `panel-position` | string | `'left'` | Which side of the top bar: `'left'` or `'right'` |
| Left side placement | `left-placement` | string | `'after'` | When the panel position is left: `'before'` or `'after'` the Activities button. Disabled in the preferences window when the position is right or the workspace pills are hidden |
| Switch to workspace | `enable-switch-shortcuts` | boolean | `false` | `true` → `Super + 1 … 0` switches to workspace 1–10 |
| Move to workspace | `enable-move-shortcuts` | boolean | `false` | `true` → `Shift + Super + 1 … 0` moves the focused window to workspace 1–10 and follows it |

All changes apply immediately, without reloading GNOME Shell.

The keyboard shortcut options are described in [Keyboard shortcuts](#keyboard-shortcuts).

### Command line

The options can also be read and changed with `gsettings`, pointing it at the extension's schema directory:

```bash
EXT=~/.local/share/gnome-shell/extensions/workspace-number-indicator@nielsonrolim.github.io
SCHEMA=org.gnome.shell.extensions.workspace-number-indicator

gsettings --schemadir "$EXT/schemas" list-recursively "$SCHEMA"
gsettings --schemadir "$EXT/schemas" set "$SCHEMA" indicator-style list
gsettings --schemadir "$EXT/schemas" set "$SCHEMA" show-total false
gsettings --schemadir "$EXT/schemas" set "$SCHEMA" hide-workspace-pills true
gsettings --schemadir "$EXT/schemas" set "$SCHEMA" panel-position right
gsettings --schemadir "$EXT/schemas" set "$SCHEMA" left-placement before
gsettings --schemadir "$EXT/schemas" set "$SCHEMA" enable-switch-shortcuts true
gsettings --schemadir "$EXT/schemas" set "$SCHEMA" enable-move-shortcuts true
```

## Keyboard shortcuts

Both groups of shortcuts are off by default. Turn them on in the **Keyboard shortcuts** group of the preferences window.

| Shortcut | Action | Option |
|----------|--------|--------|
| `Super + 1` … `Super + 9` | Switch to workspace 1–9 | Switch to workspace |
| `Super + 0` | Switch to workspace 10 | Switch to workspace |
| `Shift + Super + 1` … `Shift + Super + 9` | Move the focused window to workspace 1–9 and follow it | Move to workspace |
| `Shift + Super + 0` | Move the focused window to workspace 10 and follow it | Move to workspace |

- The shortcuts also work while the Overview is open.
- Shortcuts for workspaces that don't exist do nothing. With dynamic workspaces, only the workspaces that currently exist can be reached.
- Windows shown on all workspaces are not moved.

### Conflicts with system shortcuts

While a group is on, any system shortcut that uses the same keys is disabled. For example, GNOME uses `Super + 1…9` by default to open the apps pinned to the dash. The original shortcuts are restored when the option is turned off or the extension is disabled. The backup is saved in the extension settings, so it is also restored after a GNOME Shell crash.

Don't enable equivalent shortcuts in another extension (such as Space Bar) at the same time, since both would grab the same keys.

## Development

**Reload after changes (X11):**
```bash
killall -HUP gnome-shell
```

**Reload after changes (Wayland — nested session):**
```bash
dbus-run-session -- gnome-shell --nested --wayland
```

**Reload the preferences window after changes:** close it and stop the background process, which keeps the old `prefs.js` loaded:
```bash
pkill -f org.gnome.Shell.Extensions
```

**View logs:**
```bash
journalctl -f -o cat /usr/bin/gnome-shell
```

**Recompile GSettings schema after editing the XML:**
```bash
glib-compile-schemas schemas/
```

## License

[GNU General Public License v2.0](LICENSE)
