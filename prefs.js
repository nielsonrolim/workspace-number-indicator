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

        const styles = ['number', 'list'];
        const styleModel = new Gtk.StringList({ strings: ['Current number', 'All workspaces'] });

        const styleRow = new Adw.ComboRow({
            title: 'Indicator style',
            subtitle: 'Show only the current workspace, or every workspace as a clickable number',
            model: styleModel,
        });
        styleRow.selected = styles.indexOf(settings.get_string('indicator-style'));
        styleRow.connect('notify::selected', () => {
            settings.set_string('indicator-style', styles[styleRow.selected]);
        });
        const styleSignal = settings.connect('changed::indicator-style', () => {
            styleRow.selected = styles.indexOf(settings.get_string('indicator-style'));
        });
        group.add(styleRow);

        const row = new Adw.SwitchRow({
            title: 'Show total number of workspaces',
            subtitle: 'Displays as "current / total" (e.g. 2 / 4) instead of just the number',
        });
        group.add(row);

        settings.bind('show-total', row, 'active', Gio.SettingsBindFlags.DEFAULT);

        const updateTotalSensitivity = () => {
            row.sensitive = settings.get_string('indicator-style') === 'number';
        };
        updateTotalSensitivity();
        const totalSensitivitySignal = settings.connect('changed::indicator-style', updateTotalSensitivity);

        const pillsRow = new Adw.SwitchRow({
            title: 'Hide workspace pills',
            subtitle: 'Hides the Activities button and its workspace pills from the top bar',
        });
        group.add(pillsRow);

        settings.bind('hide-workspace-pills', pillsRow, 'active', Gio.SettingsBindFlags.DEFAULT);

        const positions = ['left', 'right'];
        const positionModel = new Gtk.StringList({ strings: ['Left', 'Right'] });

        const posRow = new Adw.ComboRow({
            title: 'Panel position',
            subtitle: 'Where to place the indicator in the top bar',
            model: positionModel,
        });
        posRow.selected = positions.indexOf(settings.get_string('panel-position'));
        posRow.connect('notify::selected', () => {
            settings.set_string('panel-position', positions[posRow.selected]);
        });
        const positionSignal = settings.connect('changed::panel-position', () => {
            posRow.selected = positions.indexOf(settings.get_string('panel-position'));
        });
        group.add(posRow);

        const placements = ['before', 'after'];
        const placementModel = new Gtk.StringList({ strings: ['Before Activities button', 'After Activities button'] });

        const leftPlacementRow = new Adw.ComboRow({
            title: 'Left side placement',
            subtitle: 'Position relative to the Activities button',
            model: placementModel,
        });
        leftPlacementRow.selected = placements.indexOf(settings.get_string('left-placement'));
        leftPlacementRow.connect('notify::selected', () => {
            settings.set_string('left-placement', placements[leftPlacementRow.selected]);
        });
        const placementSignal = settings.connect('changed::left-placement', () => {
            leftPlacementRow.selected = placements.indexOf(settings.get_string('left-placement'));
        });

        const updateSensitivity = () => {
            leftPlacementRow.sensitive = settings.get_string('panel-position') === 'left';
        };
        updateSensitivity();
        const sensitivitySignal = settings.connect('changed::panel-position', updateSensitivity);

        group.add(leftPlacementRow);

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
            settings.disconnect(styleSignal);
            settings.disconnect(totalSensitivitySignal);
            settings.disconnect(positionSignal);
            settings.disconnect(placementSignal);
            settings.disconnect(sensitivitySignal);
            return false;
        });
    }
}
