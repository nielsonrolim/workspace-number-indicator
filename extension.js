import St from 'gi://St';
import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

const WorkspaceIndicator = GObject.registerClass(
class WorkspaceIndicator extends PanelMenu.Button {
    _init(settings) {
        super._init(0.0, 'Workspace Indicator', true);

        this._settings = settings;
        this._onUpdate = this._update.bind(this);
        this._isList = false;
        this._windowSignals = new Map();
        this._idleId = 0;

        this._label = new St.Label({
            text: '',
            y_align: Clutter.ActorAlign.CENTER,
            style: 'font-weight: bold; padding: 0 4px;',
        });

        this._list = new St.BoxLayout({
            style_class: 'wni-workspace-list',
            y_align: Clutter.ActorAlign.CENTER,
        });

        const box = new St.BoxLayout();
        box.add_child(this._label);
        box.add_child(this._list);
        this.add_child(box);
        this._update();

        // In the list style the numbers handle clicks, so the Overview toggle is off
        this.connect('button-press-event', (_actor, event) => {
            if (event.get_button() === 1 && !this._isList) {
                Main.overview.toggle();
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });

        this._wsSignal = global.workspace_manager.connect(
            'active-workspace-changed',
            this._onUpdate
        );
        this._wsCountSignal = global.workspace_manager.connect(
            'notify::n-workspaces',
            () => this._rebuildList()
        );
        this._wsReorderedSignal = global.workspace_manager.connect(
            'workspaces-reordered',
            () => this._rebuildList()
        );
        this._settingsSignal = this._settings.connect(
            'changed::show-total',
            this._onUpdate
        );
        this._styleSignal = this._settings.connect(
            'changed::indicator-style',
            this._onUpdate
        );

        // Highlight like the Activities button while the Overview is open
        this._overviewShowingSignal = Main.overview.connect('showing',
            () => this.add_style_pseudo_class('checked'));
        this._overviewHidingSignal = Main.overview.connect('hiding',
            () => this.remove_style_pseudo_class('checked'));
        if (Main.overview.visible)
            this.add_style_pseudo_class('checked');
    }

    _update() {
        const isList = this._settings.get_string('indicator-style') === 'list';
        if (isList !== this._isList) {
            this._isList = isList;
            if (isList)
                this._startList();
            else
                this._stopList();
        }
        this._label.visible = !isList;
        this._list.visible = isList;

        if (isList) {
            this._updateList();
            return;
        }

        const manager = global.workspace_manager;
        const current = manager.get_active_workspace_index() + 1;

        if (this._settings.get_boolean('show-total')) {
            const total = manager.get_n_workspaces();
            this._label.set_text(`${current} / ${total}`);
        } else {
            this._label.set_text(`${current}`);
        }
    }

    // Coalesce bursts of window changes into a single refresh
    _queueUpdate() {
        if (this._idleId)
            return;
        this._idleId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            this._idleId = 0;
            this._update();
            return GLib.SOURCE_REMOVE;
        });
    }

    _updateList() {
        const manager = global.workspace_manager;
        const active = manager.get_active_workspace_index();
        this._list.get_children().forEach((item, i) => {
            const occupied = manager.get_workspace_by_index(i)?.list_windows()
                .some(w => !w.is_skip_taskbar() && !w.is_on_all_workspaces());
            if (i === active)
                item.add_style_class_name('wni-workspace-active');
            else
                item.remove_style_class_name('wni-workspace-active');
            // Empty workspaces are dimmed, keeping the panel's own text colour
            item.opacity = occupied || i === active ? 255 : 128;
        });
    }

    _startList() {
        this._windowCreatedSignal = global.display.connect('window-created',
            (_display, window) => {
                this._trackWindow(window);
                this._queueUpdate();
            });
        for (const window of global.display.list_all_windows())
            this._trackWindow(window);
        this._buildList();
    }

    _stopList() {
        if (this._windowCreatedSignal) {
            global.display.disconnect(this._windowCreatedSignal);
            this._windowCreatedSignal = null;
        }
        for (const window of [...this._windowSignals.keys()])
            this._untrackWindow(window);
        this._list.destroy_all_children();
    }

    _trackWindow(window) {
        if (this._windowSignals.has(window))
            return;
        const queue = () => this._queueUpdate();
        this._windowSignals.set(window, [
            window.connect('workspace-changed', queue),
            window.connect('notify::on-all-workspaces', queue),
            window.connect('notify::skip-taskbar', queue),
            window.connect('unmanaged', () => {
                this._untrackWindow(window);
                this._queueUpdate();
            }),
        ]);
    }

    _untrackWindow(window) {
        for (const id of this._windowSignals.get(window) ?? [])
            window.disconnect(id);
        this._windowSignals.delete(window);
    }

    _rebuildList() {
        if (this._isList)
            this._buildList();
        this._update();
    }

    _buildList() {
        this._list.destroy_all_children();
        const total = global.workspace_manager.get_n_workspaces();

        // Resolve the workspace at click time so a removed one is never activated
        const activate = index => {
            global.workspace_manager.get_workspace_by_index(index)
                ?.activate(global.get_current_time());
        };

        for (let i = 0; i < total; i++) {
            const item = new St.Label({
                text: `${i + 1}`,
                style_class: 'wni-workspace',
                y_align: Clutter.ActorAlign.CENTER,
                reactive: true,
                track_hover: true,
            });
            item.connect('button-press-event', (_actor, event) => {
                if (event.get_button() !== 1)
                    return Clutter.EVENT_PROPAGATE;
                activate(i);
                return Clutter.EVENT_STOP;
            });
            item.connect('touch-event', (_actor, event) => {
                if (event.type() === Clutter.EventType.TOUCH_BEGIN)
                    activate(i);
                return Clutter.EVENT_STOP;
            });
            this._list.add_child(item);
        }
    }

    destroy() {
        if (this._idleId) {
            GLib.source_remove(this._idleId);
            this._idleId = 0;
        }
        this._stopList();
        if (this._wsSignal) {
            global.workspace_manager.disconnect(this._wsSignal);
            this._wsSignal = null;
        }
        if (this._wsCountSignal) {
            global.workspace_manager.disconnect(this._wsCountSignal);
            this._wsCountSignal = null;
        }
        if (this._wsReorderedSignal) {
            global.workspace_manager.disconnect(this._wsReorderedSignal);
            this._wsReorderedSignal = null;
        }
        if (this._settingsSignal) {
            this._settings.disconnect(this._settingsSignal);
            this._settingsSignal = null;
        }
        if (this._styleSignal) {
            this._settings.disconnect(this._styleSignal);
            this._styleSignal = null;
        }
        if (this._overviewShowingSignal) {
            Main.overview.disconnect(this._overviewShowingSignal);
            this._overviewShowingSignal = null;
        }
        if (this._overviewHidingSignal) {
            Main.overview.disconnect(this._overviewHidingSignal);
            this._overviewHidingSignal = null;
        }
        super.destroy();
    }
});

const SHORTCUT_COUNT = 10;

// System schemas scanned for keybindings that clash with the extension shortcuts
const SYSTEM_KEYBINDING_SCHEMAS = [
    'org.gnome.desktop.wm.keybindings',
    'org.gnome.shell.keybindings',
    'org.gnome.settings-daemon.plugins.media-keys',
];

// Creating Gio.Settings for a schema that isn't installed aborts the process
function lookupSettings(schemaId) {
    const schema = Gio.SettingsSchemaSource.get_default()?.lookup(schemaId, true);
    return schema ? new Gio.Settings({settings_schema: schema}) : null;
}

function normalizeAccelerator(accel) {
    const mods = (accel.match(/<[^>]+>/g) ?? [])
        .map(m => m.toLowerCase().replace('<primary>', '<control>'))
        .sort();
    return mods.join('') + accel.replace(/<[^>]+>/g, '').toLowerCase();
}

class WorkspaceKeybindings {
    constructor(settings) {
        this._settings = settings;
        this._added = new Set();

        // Restore anything left over from a session that ended without cleanup
        this._restoreAll();

        // Names must not clash with Mutter's built-in keybindings (e.g. switch-to-workspace-1)
        this._groups = {
            'shortcut-switch-to-workspace': {
                setting: 'enable-switch-shortcuts',
                handler: index => this._switchTo(index),
            },
            'shortcut-move-to-workspace': {
                setting: 'enable-move-shortcuts',
                handler: index => this._moveTo(index),
            },
        };

        this._signals = Object.entries(this._groups).map(([prefix, group]) => {
            this._apply(prefix);
            return this._settings.connect(`changed::${group.setting}`, () => this._apply(prefix));
        });
    }

    _apply(prefix) {
        const {setting, handler} = this._groups[prefix];
        const enabled = this._settings.get_boolean(setting);

        for (let i = 0; i < SHORTCUT_COUNT; i++) {
            const name = `${prefix}-${i + 1}`;
            if (enabled && !this._added.has(name)) {
                for (const accel of this._settings.get_strv(name))
                    this._replaceConflicts(name, accel);
                const action = Main.wm.addKeybinding(name, this._settings,
                    Meta.KeyBindingFlags.NONE,
                    Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
                    () => handler(i));
                if (action === Meta.KeyBindingAction.NONE) {
                    console.warn(`Workspace Number Indicator: could not add keybinding ${name}`);
                    this._releaseConflicts(name);
                    continue;
                }
                this._added.add(name);
            } else if (!enabled && this._added.has(name)) {
                Main.wm.removeKeybinding(name);
                this._added.delete(name);
                this._releaseConflicts(name);
            }
        }
    }

    _switchTo(index) {
        const workspace = global.workspace_manager.get_workspace_by_index(index);
        workspace?.activate(global.get_current_time());
    }

    _moveTo(index) {
        const workspace = global.workspace_manager.get_workspace_by_index(index);
        const window = global.display.get_focus_window();
        if (!workspace || !window || window.is_on_all_workspaces())
            return;
        window.change_workspace(workspace);
        workspace.activate_with_focus(window, global.get_current_time());
    }

    // Backup format: {"<schema> <key>": {value, wasDefault, owners: [names]}}
    _loadBackup() {
        try {
            return JSON.parse(this._settings.get_string('replaced-system-keybindings'));
        } catch {
            return {};
        }
    }

    _saveBackup(backup) {
        this._settings.set_string('replaced-system-keybindings', JSON.stringify(backup));
    }

    _replaceConflicts(owner, accel) {
        const target = normalizeAccelerator(accel);
        const backup = this._loadBackup();

        for (const schema of SYSTEM_KEYBINDING_SCHEMAS) {
            const settings = lookupSettings(schema);
            if (!settings)
                continue;
            for (const key of settings.settings_schema.list_keys()) {
                const variant = settings.get_value(key);
                if (variant.get_type_string() !== 'as')
                    continue;
                const value = variant.deepUnpack();
                const kept = value.filter(v => normalizeAccelerator(v) !== target);
                if (kept.length === value.length)
                    continue;

                const id = `${schema} ${key}`;
                backup[id] ??= {
                    value,
                    wasDefault: settings.get_user_value(key) === null,
                    owners: [],
                };
                if (!backup[id].owners.includes(owner))
                    backup[id].owners.push(owner);
                settings.set_strv(key, kept);
            }
        }

        this._saveBackup(backup);
    }

    _releaseConflicts(owner) {
        const backup = this._loadBackup();
        for (const [id, entry] of Object.entries(backup)) {
            entry.owners = entry.owners.filter(o => o !== owner);
            if (entry.owners.length === 0) {
                this._restoreEntry(id, entry);
                delete backup[id];
            }
        }
        this._saveBackup(backup);
    }

    _restoreAll() {
        for (const [id, entry] of Object.entries(this._loadBackup()))
            this._restoreEntry(id, entry);
        this._saveBackup({});
    }

    _restoreEntry(id, entry) {
        const [schema, key] = id.split(' ');
        try {
            const settings = lookupSettings(schema);
            if (!settings)
                return;
            if (entry.wasDefault)
                settings.reset(key);
            else
                settings.set_strv(key, entry.value);
        } catch (e) {
            console.warn(`Workspace Number Indicator: could not restore ${id}: ${e.message}`);
        }
    }

    destroy() {
        for (const id of this._signals)
            this._settings.disconnect(id);
        this._signals = [];
        for (const name of this._added)
            Main.wm.removeKeybinding(name);
        this._added.clear();
        this._restoreAll();
    }
}

export default class WorkspaceNumberExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._addIndicator();
        const onPositionChange = () => {
            this._removeIndicator();
            this._addIndicator();
        };
        this._positionSignal = this._settings.connect('changed::panel-position', onPositionChange);
        this._leftPlacementSignal = this._settings.connect('changed::left-placement', () => {
            if (this._settings.get_string('panel-position') === 'left')
                onPositionChange();
        });
        this._updatePillsVisibility();
        this._pillsSignal = this._settings.connect('changed::hide-workspace-pills',
            () => this._updatePillsVisibility());
        this._keybindings = new WorkspaceKeybindings(this._settings);
    }

    _updatePillsVisibility() {
        this._setPillsHidden(this._settings.get_boolean('hide-workspace-pills'));
    }

    _setPillsHidden(hidden) {
        const activities = Main.panel.statusArea.activities;
        if (activities)
            activities.container.visible = !hidden;
    }

    _addIndicator() {
        const box = this._settings.get_string('panel-position');
        let index;
        if (box === 'left')
            index = this._settings.get_string('left-placement') === 'before' ? 0 : 1;
        else
            index = 0;
        const indicator = new WorkspaceIndicator(this._settings);
        try {
            Main.panel.addToStatusArea(this.uuid, indicator, index, box);
        } catch (e) {
            indicator.destroy();
            throw e;
        }
        this._indicator = indicator;
    }

    _removeIndicator() {
        this._indicator?.destroy();
        this._indicator = null;
    }

    disable() {
        if (this._positionSignal) {
            this._settings.disconnect(this._positionSignal);
            this._positionSignal = null;
        }
        if (this._leftPlacementSignal) {
            this._settings.disconnect(this._leftPlacementSignal);
            this._leftPlacementSignal = null;
        }
        if (this._pillsSignal) {
            this._settings.disconnect(this._pillsSignal);
            this._pillsSignal = null;
        }
        this._keybindings?.destroy();
        this._keybindings = null;
        this._setPillsHidden(false);
        this._removeIndicator();
        this._settings = null;
    }
}
