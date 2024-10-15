<form method="post" action="#" role="form" class="ui large form" id="module-phonebook-form">

    <div class="ui top attached tabular menu" id="module-phonebook-menu">
        <a class="item active" data-tab="phonebook">{{ t._('module_phnbk_PhonebookTab') }}</a>
        <a class="item" data-tab="excel">{{ t._('module_phnbk_ImportExcelTab') }}</a>
        <a class="item" data-tab="settings">{{ t._('module_phnbk_SettingsTab') }}</a>
    </div>

    <div class="ui bottom attached tab segment active" data-tab="phonebook">
        {{ partial("Modules/ModulePhoneBook/ModulePhoneBook/Tabs/phonebookTab") }}
    </div>
    <div class="ui bottom attached tab segment " data-tab="excel">
        {{ partial("Modules/ModulePhoneBook/ModulePhoneBook/Tabs/excelTab") }}
    </div>
    <div class="ui bottom attached tab segment " data-tab="settings">
        {{ partial("Modules/ModulePhoneBook/ModulePhoneBook/Tabs/settingsTab") }}
    </div>
</form>


