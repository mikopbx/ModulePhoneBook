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

/* global globalRootUrl, globalTranslate,
SemanticLocalization, UserMessage, InputMaskPatterns */

const ModulePhoneBookSettings = {
    $disableInputMaskToggle: $('#disable-input-mask'),
    $deleteAllRecordsButton: $('#delete-all-records'),
    $deleteAllModal: $('#delete-all-modal-form'),
    deleteAllRecordsAJAXUrl: `${globalRootUrl}module-phone-book/module-phone-book/deleteAllRecords`,
    disableInputMaskAJAXUrl: `${globalRootUrl}module-phone-book/module-phone-book/toggleDisableInputMask`,

    /**
     * Initialize the settings module for the phonebook.
     * It sets up the event listeners for toggling input masks and deleting all records.
     */
    initialize() {
        // Hide the delete confirmation modal initially
        ModulePhoneBookSettings.$deleteAllModal.modal('hide');

        // Set up the checkbox for disabling/enabling the input mask
        ModulePhoneBookSettings.$disableInputMaskToggle.checkbox({
            onChange: ModulePhoneBookSettings.onChangeInputMaskToggle
        });

        // Attach event listener for the "Delete All Records" button
        ModulePhoneBookSettings.$deleteAllRecordsButton.on('click', function () {
            ModulePhoneBookSettings.deleteAllRecords();
        });
    },

    /**
     * Handle the deletion of all records.
     * Displays a confirmation modal, and if approved, sends a request to delete all phonebook records.
     */
    deleteAllRecords() {
        ModulePhoneBookSettings.$deleteAllModal
            .modal({
                closable: false, // Prevent closing the modal without user action
                onDeny: () => {
                    return true; // Allows modal to close on "Cancel"
                },
                onApprove: () => {
                    ModulePhoneBookSettings.$deleteAllRecordsButton.addClass('loading');
                    // On approval, send a request to delete all records
                    $.api({
                        url: ModulePhoneBookSettings.deleteAllRecordsAJAXUrl,
                        on: 'now',
                        method: 'POST',
                        successTest: PbxApi.successTest,
                        onSuccess(response) {
                            ModulePhoneBookSettings.$deleteAllRecordsButton.removeClass('loading');
                            UserMessage.showInformation(globalTranslate.module_phnbk_AllRecordsDeleted);
                            // Reload the page after successful update
                            ModulePhoneBookDT.dataTable.ajax.reload();
                        },
                        onFailure(response) {
                            ModulePhoneBookSettings.$deleteAllRecordsButton.removeClass('loading');
                            // Show error message if deletion fails
                            UserMessage.showMultiString(response.messages);
                        },
                    });
                    return true;
                },
            })
            .modal('show'); // Display the confirmation modal
    },

    /**
     * Handle the toggle of the input mask.
     * Sends a request to update the setting for enabling or disabling input masks.
     */
    onChangeInputMaskToggle() {
        const currentState = ModulePhoneBookSettings.$disableInputMaskToggle.checkbox('is checked');

        // Send request to toggle the input mask setting
        $.api({
            url: ModulePhoneBookSettings.disableInputMaskAJAXUrl,
            on: 'now',
            method: 'POST',
            data: { disableInputMask: currentState },
            successTest: PbxApi.successTest,
            onSuccess(response) {
                window.location.reload();
            },
            onFailure(response) {
                // Show error message if the update fails
                UserMessage.showMultiString(response.messages);
            },
        });
        return true;
    },
};

// Initialize the settings module when the document is ready
$(document).ready(() => {
    ModulePhoneBookSettings.initialize();
});