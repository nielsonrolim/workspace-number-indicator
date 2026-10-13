import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class WorkspaceIndicatorPrefs extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        window.set_default_size(780, 720);

        const page = new Adw.PreferencesPage({
            title: 'General',
            icon_name: 'preferences-system-symbolic',
        });
        window.add(page);

        const group = new Adw.PreferencesGroup({
            title: 'Display',
            description: 'Configure what is shown in the panel indicator.',
        });
        page.add(group);

        const signals = [];

        // Keeps a combo row and a string setting in sync. Only real changes are
        // written, so syncing the row never writes the setting back
        const bindComboRow = (row, key, values, onChange = () => {}) => {
            row.connect('notify::selected', () => {
                const value = values[row.selected];
                if (value !== undefined && value !== settings.get_string(key))
                    settings.set_string(key, value);
            });
            const sync = () => {
                const selected = Math.max(values.indexOf(settings.get_string(key)), 0);
                if (row.selected !== selected)
                    row.selected = selected;
                onChange();
            };
            sync();
            signals.push(settings.connect(`changed::${key}`, sync));
        };

        const styleRow = new Adw.ComboRow({
            title: 'Indicator style',
            subtitle: 'Show only the current workspace, or every workspace as a clickable number',
            model: new Gtk.StringList({ strings: ['Current number', 'All workspaces'] }),
        });

        const totalRow = new Adw.SwitchRow({
            title: 'Show total number of workspaces',
            subtitle: 'Displays as "current / total" (e.g. 2 / 4) instead of just the number',
        });
        settings.bind('show-total', totalRow, 'active', Gio.SettingsBindFlags.DEFAULT);

        bindComboRow(styleRow, 'indicator-style', ['number', 'list'], () => {
            totalRow.sensitive = settings.get_string('indicator-style') === 'number';
        });

        const posRow = new Adw.ComboRow({
            title: 'Panel position',
            subtitle: 'Where to place the indicator in the top bar',
            model: new Gtk.StringList({ strings: ['Left', 'Right'] }),
        });

        const pillsRow = new Adw.SwitchRow({
            title: 'Hide workspace pills',
            subtitle: 'Hides the Activities button and its workspace pills from the top bar',
        });
        settings.bind('hide-workspace-pills', pillsRow, 'active', Gio.SettingsBindFlags.DEFAULT);

        const leftPlacementRow = new Adw.ComboRow({
            title: 'Left side placement',
            subtitle: 'Position relative to the Activities button',
            model: new Gtk.StringList({ strings: ['Before Activities button', 'After Activities button'] }),
        });
        bindComboRow(leftPlacementRow, 'left-placement', ['before', 'after']);

        // Placement only matters on the left, next to a visible Activities button
        const updatePlacementSensitivity = () => {
            leftPlacementRow.sensitive = settings.get_string('panel-position') === 'left' &&
                !settings.get_boolean('hide-workspace-pills');
        };
        bindComboRow(posRow, 'panel-position', ['left', 'right'], updatePlacementSensitivity);
        signals.push(settings.connect('changed::hide-workspace-pills', updatePlacementSensitivity));

        // Each dependent row sits right under the row that controls it
        for (const r of [styleRow, totalRow, posRow, pillsRow, leftPlacementRow])
            group.add(r);

        const shortcutsGroup = new Adw.PreferencesGroup({
            title: 'Keyboard shortcuts',
            description: 'Conflicting system shortcuts are disabled while these are on and restored afterwards.',
        });
        page.add(shortcutsGroup);

        const switchRow = new Adw.SwitchRow({
            title: 'Switch to workspace',
            subtitle: 'Super + 1 … 0',
        });
        shortcutsGroup.add(switchRow);
        settings.bind('enable-switch-shortcuts', switchRow, 'active', Gio.SettingsBindFlags.DEFAULT);

        const moveRow = new Adw.SwitchRow({
            title: 'Move to workspace',
            subtitle: 'Shift + Super + 1 … 0, with the current window',
        });
        shortcutsGroup.add(moveRow);
        settings.bind('enable-move-shortcuts', moveRow, 'active', Gio.SettingsBindFlags.DEFAULT);

        window.connect('close-request', () => {
            for (const id of signals)
                settings.disconnect(id);
            return false;
        });
    }
}
