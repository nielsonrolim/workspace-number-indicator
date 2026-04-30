import Adw from 'gi://Adw';
import Gio from 'gi://Gio';

import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class WorkspaceIndicatorPrefs extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        this._settings = this.getSettings('org.gnome.shell.extensions.workspace-number-indicator');
        const settings = this._settings;

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

        const row = new Adw.SwitchRow({
            title: 'Show total number of workspaces',
            subtitle: 'Displays as "current / total" (e.g. 2 / 4) instead of just the number',
        });
        group.add(row);

        settings.bind('show-total', row, 'active', Gio.SettingsBindFlags.DEFAULT);
    }
}
