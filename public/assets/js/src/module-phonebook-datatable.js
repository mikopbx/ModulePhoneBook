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

/* global globalRootUrl, globalTranslate, SemanticLocalization, UserMessage, InputMaskPatterns */

const ModulePhoneBookDT = {
    // Cached DOM elements
    $disableInputMaskToggle: $('#disable-input-mask'),
    $globalSearch: $('#globalsearch'),
    $recordsTable: $('#phonebook-table'),
    $addNewButton: $('#add-new-button'),
    inputNumberJQTPL: 'input.number-input',
    $maskList: null,

    // URLs for AJAX requests
    getNewRecordsAJAXUrl: `${globalRootUrl}module-phone-book/getNewRecords`,
    deleteRecordAJAXUrl: `${globalRootUrl}module-phone-book/delete`,
    saveRecordAJAXUrl: `${globalRootUrl}module-phone-book/save`,

    /**
     * Initialize the module
     */
    initialize() {
        this.initializeSearch();
        this.initializeDataTable();
        this.initializeEventListeners();
    },

    /**
     * Initialize the search functionality
     */
    initializeSearch() {
        this.$globalSearch.on('keyup', (e) => {
            const searchText = this.$globalSearch.val().trim();
            if (e.keyCode === 13 || e.keyCode === 8 || searchText.length === 0) {
                this.applyFilter(searchText);
            }
        });
    },

    /**
     * Initialize all event listeners
     */
    initializeEventListeners() {
        const $body = $('body');

        // Double-click on input field for editing
        $body.on('focusin', '.caller-id-input, .number-input', (e) => {
            this.onFieldFocus($(e.target));
        });

        // Input field loses focus - send changes
        $body.on('focusout', '.caller-id-input, .number-input', () => {
            this.saveChangesForAllRows();
        });

        // Delete button click event
        $body.on('click', 'a.delete', (e) => {
            e.preventDefault();
            const id = $(e.target).closest('a').data('value');
            this.deleteRow($(e.target), id);
        });

        // Handle Enter or Tab key for form submission
        $(document).on('keydown', (e) => {
            if (e.key === 'Enter' || (e.key === 'Tab' && !$(':focus').hasClass('.number-input'))) {
                this.saveChangesForAllRows();
            }
        });

        // Add new row button click
        this.$addNewButton.on('click', (e) => {
            e.preventDefault();
            this.addNewRow();
        });
    },

    /**
     * Handle focus on an input field
     */
    onFieldFocus($input) {
        $input.transition('glow');
        $input.closest('div').removeClass('transparent').addClass('changed-field');
        $input.attr('readonly', false);
    },

    /**
     * Save changes for all rows
     */
    saveChangesForAllRows() {
        const $rows = $('.changed-field').closest('tr');
        $rows.each((_, row) => {
            const rowId = $(row).attr('id');
            if (rowId !== undefined) {
                this.sendChangesToServer(rowId);
            }
        });
    },

    /**
     * Add a new row to the phonebook table
     */
    addNewRow() {
        const $emptyRow = $('.dataTables_empty');
        if ($emptyRow.length) $emptyRow.remove();

        this.saveChangesForAllRows();

        const newId = `new${Math.floor(Math.random() * 500)}`;
        const newRowTemplate = `
            <tr id="${newId}">
                <td><i class="ui user circle icon"></i></td>
                <td><div class="ui fluid input inline-edit changed-field"><input class="caller-id-input" type="text" value=""></div></td>
                <td><div class="ui fluid input inline-edit changed-field"><input class="number-input" type="text" value=""></div></td>
                <td><div class="ui small basic icon buttons action-buttons">
                    <a href="#" class="ui button delete two-steps-delete popuped" data-value="new">
                        <i class="icon trash red"></i>
                    </a>
                </div></td>
            </tr>`;

        this.$recordsTable.find('tbody').prepend(newRowTemplate);
        const $newRow = $(`#${newId}`);
        $newRow.find('input').transition('glow');
        $newRow.find('.caller-id-input').focus();
        this.initializeInputmask($newRow.find('.number-input'));
    },

    /**
     * Initialize the DataTable
     */
    initializeDataTable() {
        this.$recordsTable.dataTable({
            search: { search: this.$globalSearch.val() },
            serverSide: true,
            processing: true,
            ajax: {
                url: this.getNewRecordsAJAXUrl,
                type: 'POST',
                dataSrc: 'data',
            },
            columns: [
                { data: null },
                { data: 'call_id' },
                { data: 'number' },
                { data: null },
            ],
            paging: true,
            pageLength: 17,
            deferRender: true,
            sDom: 'rtip',
            ordering: false,
            createdRow: (row, data) => {
                this.buildRowTemplate(row, data);
            },
            drawCallback: () => {
                this.initializeInputmask($(this.inputNumberJQTPL));
            },
            language: SemanticLocalization.dataTableLocalisation,
        });

        this.dataTable = this.$recordsTable.DataTable();

        this.dataTable.on('draw', () => {
            this.$globalSearch.closest('div').removeClass('loading');
        });
    },

    /**
     * Build the HTML structure for each row
     */
    buildRowTemplate(row, data) {
        const nameTemplate = `
            <div class="ui transparent fluid input inline-edit">
                <input class="caller-id-input" type="text" value="${data.call_id}" />
            </div>`;
        const numberTemplate = `
            <div class="ui transparent input inline-edit">
                <input class="number-input" type="text" value="${data.number}" />
            </div>`;
        const deleteButtonTemplate = `
            <div class="ui small basic icon buttons action-buttons">
                <a href="${this.deleteRecordAJAXUrl}/${data.DT_RowId}" class="ui button delete two-steps-delete popuped">
                    <i class="icon trash red"></i>
                </a>
            </div>`;

        $('td', row).eq(0).html('<i class="ui user circle icon"></i>');
        $('td', row).eq(1).html(nameTemplate);
        $('td', row).eq(2).html(numberTemplate);
        $('td', row).eq(3).html(deleteButtonTemplate);
    },

    /**
     * Apply a filter to the DataTable
     * @param {string} text
     */
    applyFilter(text) {
        const $changedFields = $('.changed-field');
        $changedFields.each((_, obj) => {
            const $input = $(obj).find('input');
            $input.val($input.data('value'));
            $input.attr('readonly', true);
            $(obj).removeClass('changed-field').addClass('transparent');
        });
        this.dataTable.search(text).draw();
        this.$globalSearch.closest('div').addClass('loading');
    },

    /**
     * Initialize input masks for phone numbers
     */
    initializeInputmask($el) {
        if (this.$disableInputMaskToggle.checkbox('is checked')) return;

        if (this.$maskList === null) {
            this.$maskList = $.masksSort(InputMaskPatterns, ['#'], /[0-9]|#/, 'mask');
        }

        $el.inputmasks({
            inputmask: {
                definitions: {
                    '#': { validator: '[0-9]', cardinality: 1 },
                },
                showMaskOnHover: false,
                onBeforePaste: this.cbOnNumberBeforePaste,
            },
            match: /[0-9]/,
            replace: '9',
            list: this.$maskList,
            listKey: 'mask',
        });
    },

    /**
     * Send the changes for a specific row to the server
     * @param {string} recordId
     */
    sendChangesToServer(recordId) {
        const callerId = $(`tr#${recordId} .caller-id-input`).val();
        const numberInputVal = $(`tr#${recordId} .number-input`).val();

        if (!callerId || !numberInputVal) return;

        let number = numberInputVal.replace(/\D+/g, '');
        number = `1${number.substr(number.length - 9)}`;

        const data = {
            call_id: callerId,
            number_rep: numberInputVal,
            number,
            id: recordId,
        };

        this.displaySavingIcon(recordId);

        $.api({
            url: this.saveRecordAJAXUrl,
            method: 'POST',
            data,
            successTest: (response) => response && response.success === true,
            onSuccess: (response) => this.onSaveSuccess(response, recordId),
            onFailure: (response) => UserMessage.showMultiString(response.message),
            onError: (errorMessage, element, xhr) => {
                if (xhr.status === 403) window.location = `${globalRootUrl}session/index`;
            },
        });
    },

    /**
     * Display saving icon for a specific row
     */
    displaySavingIcon(recordId) {
        $(`tr#${recordId} .user.circle`)
            .removeClass('user circle')
            .addClass('spinner loading');
    },

    /**
     * Handle success of saving a record
     */
    onSaveSuccess(response, recordId) {
        if (response.data) {
            let oldId = response.data.oldId || recordId;
            $(`tr#${oldId} input`).attr('readonly', true);
            $(`tr#${oldId} div`).removeClass('changed-field loading').addClass('transparent');
            $(`tr#${oldId} .spinner.loading`).addClass('user circle').removeClass('spinner loading');
            if (oldId !== response.data.newId) {
                $(`tr#${oldId}`).attr('id', response.data.newId);
            }
        }
    },

    /**
     * Delete a row from the phonebook
     * @param {jQuery} $target
     * @param {string} id
     */
    deleteRow($target, id) {
        if (id === 'new') {
            $target.closest('tr').remove();
            return;
        }

        $.api({
            url: `${this.deleteRecordAJAXUrl}/${id}`,
            on: 'now',
            onSuccess: (response) => {
                if (response.success) {
                    $target.closest('tr').remove();
                    if (this.$recordsTable.find('tbody > tr').length === 0) {
                        this.$recordsTable.find('tbody').append('<tr class="odd"></tr>');
                    }
                }
            },
        });
    },

    /**
     * Clean number before pasting
     * @returns {string}
     */
    cbOnNumberBeforePaste(pastedValue) {
        return pastedValue.replace(/\D+/g, '');
    },
};

$(document).ready(() => {
    ModulePhoneBookDT.initialize();
});