const { Gio } = imports.gi;
const Main = imports.ui.main;
const Me = imports.misc.extensionUtils.getCurrentExtension();

/* exported RequiredSettingsModule */
var RequiredSettingsModule = class RequiredSettingsModule {
    constructor() {
        this.mutterSettings = new Gio.Settings({
            schema_id: 'org.gnome.mutter'
        });
        this.settingsToForce = [
            {
                schema: 'org.gnome.mutter',
                key: 'dynamic-workspaces',
                value: false,
                valueType: 'boolean'
            },
            {
                schema: 'org.gnome.mutter',
                key: 'workspaces-only-on-primary',
                value: true,
                valueType: 'boolean'
            }
        ];
    }

    enable() {
        this.signals = [];
        this.settingsToForce.forEach(settingToForce => {
            let setting = new Gio.Settings({
                schema_id: settingToForce.schema
            });

            this.setValueIfDifferentAndNotify(
                setting,
                settingToForce.key,
                settingToForce.value,
                settingToForce.valueType
            );
            let signalId = setting.connect(
                `changed::${settingToForce.key}`,
                () => {
                    this.setValueIfDifferentAndNotify(
                        setting,
                        settingToForce.key,
                        settingToForce.value,
                        settingToForce.valueType
                    );
                }
            );

            this.signals.push({
                from: setting,
                signalId: signalId
            });
        });

        const SchemaSource = Gio.SettingsSchemaSource.new_from_directory(
            Me.dir.get_path(),
            Gio.SettingsSchemaSource.get_default(),
            false
        );
        const bindingSettings = new Gio.Settings({
            settings_schema: SchemaSource.lookup(Me.metadata['bindings'], true)
        });
        this.hotkeysToRemove = bindingSettings.list_keys().map(key => {
            return bindingSettings.get_strv(key)[0];
        });

        let setting = new Gio.Settings({
            schema_id: 'org.gnome.shell.keybindings'
        });
        setting.list_keys().forEach(key => {
            let shortcut = setting.get_strv(key);
            if (this.hotkeysToRemove.indexOf(shortcut[0]) > -1) {
                log(key, shortcut);
                setting.set_strv(key, ['']);
                Main.notify(
                    'Material-shell',
                    `This extension has unset the ${key} hotkey to override it`
                );
            }
        });
    }

    disable() {
        this.signals.forEach(signal => {
            signal.from.disconnect(signal.signalId);
        });
        this.signals = [];
    }

    setValueIfDifferentAndNotify(setting, key, value, valueType) {
        if (setting[`get_${valueType}`](key) !== value) {
            setting[`set_${valueType}`](key, value);

            Main.notify(
                'Material-shell',
                `This extension has override the ${key} setting to ${value}`
            );
        }
    }

    forceStaticWorkspaces() {
        this.mutterSettings.connect(
            'changed::dynamic-workspaces',
            (_, value, test) => {
                if (this.mutterSettings.get('dynamic-workspaces') === true) {
                    log('set3');
                    this.mutterSettings.set('dynamic-workspaces', false);
                }
            }
        );
        log('set1');
        this.mutterSettings['set_' + 'boolean']('dynamic-workspaces', false);
        log('set2');
        this.mutterSettings.set('dynamic-workspaces', true);
    }

    forceWorkspacesOnlyOnPrimary() {
        this.mutterSettings.connect(
            'changed::workspaces-only-on-primary',
            (_, value, test) => {
                if (
                    !this.mutterSettings.get_boolean(
                        'workspaces-only-on-primary'
                    )
                ) {
                    this.mutterSettings.set_boolean(
                        'workspaces-only-on-primary',
                        true
                    );
                }
            }
        );
        this.mutterSettings.set_boolean('workspaces-only-on-primary', true);
    }
};
