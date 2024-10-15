/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2024 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

const ModulePhoneBookStatus = {
    $moduleStatus: $('#status'),
    $statusToggle: $('#module-status-toggle'),
    $formObj: $('#module-phonebook-form'),

    /**
     * Initializes the module's status checks.
     * Adds event listeners to update the status of the form based on the module's enabled/disabled state.
     */
    initialize() {
        ModulePhoneBookStatus.checkStatusToggle();
        window.addEventListener('ModuleStatusChanged', ModulePhoneBookStatus.checkStatusToggle);
    },

    /**
     * Toggle the status of buttons and fields when the module status changes.
     * If the module is enabled, fields are activated; otherwise, they are disabled.
     */
    checkStatusToggle() {
        if (ModulePhoneBookStatus.$statusToggle.checkbox('is checked')) {
            ModulePhoneBookStatus.$formObj.show();
            ModulePhoneBookStatus.$moduleStatus.show();
        } else {
            ModulePhoneBookStatus.$formObj.hide();
            ModulePhoneBookStatus.$moduleStatus.hide();
        }
    },
};

// Initialize the module status handler when the document is ready.
$(document).ready(() => {
    ModulePhoneBookStatus.initialize();
});