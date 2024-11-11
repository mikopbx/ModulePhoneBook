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

    /**
     * The global search input element.
     * @type {jQuery}
     */
    $globalSearch: $('#global-search'),

    /**
     * The page length selector.
     * @type {jQuery}
     */
    $pageLengthSelector:$('#page-length-select'),

    /**
     * The page length selector.
     * @type {jQuery}
     */
    $searchExtensionsInput: $('#search-extensions-input'),


    /**
     * The data table object.
     * @type {Object}
     */
    dataTable: {},

    /**
     * The document body.
     * @type {jQuery}
     */
    $body: $('body'),

    // Cached DOM elements
    $disableInputMaskToggle: $('#disable-input-mask'),

    /**
     * The extensions table element.
     * @type {jQuery}
     */
    $recordsTable: $('#phonebook-table'),

    /**
     * The add new button element.
     * @type {jQuery}
     */
    $addNewButton: $('#add-new-button'),

    /**
     * Selector for number input fields.
     * @type {string}
     */
    inputNumberJQTPL: 'input.number-input',

    /**
     * List of input masks.
     * @type {null|Array}
     */
    $maskList: null,

    // URLs for AJAX requests
    getNewRecordsAJAXUrl: `${globalRootUrl}module-phone-book/getNewRecords`,

    deleteRecordAJAXUrl: `${globalRootUrl}module-phone-book/delete`,

    saveRecordAJAXUrl: `${globalRootUrl}module-phone-book/save`,

    /**
     * Initialize the module.
     * This includes setting up event listeners and initializing the DataTable.
     */
    initialize() {
        this.initializeSearch();
        this.initializeDataTable();
        this.initializeEventListeners();
    },

    /**
     * Initialize the search functionality.
     * It listens for key events and applies a filter based on the user's input.
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
     * Initialize all event listeners.
     * Handles input focus, form submission, adding new rows, and delete actions.
     */
    initializeEventListeners() {

        // Handle focus on input fields for editing
        this.$body.on('focusin', '.caller-id-input, .number-input', (e) => {
            this.onFieldFocus($(e.target));
        });

        // Handle loss of focus on input fields and save changes
        this.$body.on('focusout', '.caller-id-input, .number-input', () => {
            this.saveChangesForAllRows();
        });

        // Handle delete button click
        this.$body.on('click', 'a.delete', (e) => {
            e.preventDefault();
            const id = $(e.target).closest('a').data('value');
            this.deleteRow($(e.target), id);
        });

        // Handle Enter or Tab key to trigger form submission
        $(document).on('keydown', (e) => {
            if (e.key === 'Enter' || (e.key === 'Tab' && !$(':focus').hasClass('.number-input'))) {
                this.saveChangesForAllRows();
            }
        });

        // Handle adding a new row
        this.$addNewButton.on('click', (e) => {
            e.preventDefault();
            this.addNewRow();
        });

        // Handle page length selection
        this.$pageLengthSelector.dropdown({
            onChange(pageLength) {
                if (pageLength==='auto'){
                    pageLength = this.calculatePageLength();
                    localStorage.removeItem('phonebookTablePageLength');
                } else {
                    localStorage.setItem('phonebookTablePageLength', pageLength);
                }
                ModulePhoneBookDT.dataTable.page.len(pageLength).draw();
            },
        });

        // Prevent event bubbling on dropdown click
        this.$pageLengthSelector.on('click', function(event) {
            event.stopPropagation(); // Prevent the event from bubbling
        });
    },


    /**
     * Handle focus event on a field by adding a glowing effect and enabling editing.
     *
     * @param {jQuery} $input - The input field that received focus.
     */
    onFieldFocus($input) {
        $input.transition('glow');
        $input.closest('div').removeClass('transparent').addClass('changed-field');
        $input.attr('readonly', false);
    },

    /**
     * Save changes for all modified rows.
     * It sends the changes for each modified row to the server.
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
     * Add a new row to the phonebook table.
     * The row is editable and allows for input of new contact information.
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
                <td><div class="ui basic icon buttons action-buttons tiny">
                    <a href="#" class="ui button delete" data-value="new">
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
     * Initialize the DataTable instance with the required settings and options.
     */
    initializeDataTable() {

        // Get the user's saved value or use the automatically calculated value if none exists
        const savedPageLength = localStorage.getItem('phonebookTablePageLength');
        const pageLength = savedPageLength ? savedPageLength : this.calculatePageLength();

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
            pageLength: pageLength,
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


        // Set the select input value to the saved value if it exists
        if (savedPageLength) {
            this.$pageLengthSelector.dropdown('set value', savedPageLength);
        }


        // Initialize debounce timer variable
        let searchDebounceTimer = null;

        this.$globalSearch.on('keyup', (e) => {
            // Clear previous timer if the user is still typing
            clearTimeout(searchDebounceTimer);

            // Set a new timer for delayed execution
            searchDebounceTimer = setTimeout(() => {
                const text = this.$globalSearch.val();
                // Trigger the search if input is valid (Enter, Backspace, or more than 2 characters)
                if (e.keyCode === 13 || e.keyCode === 8 || text.length >= 2) {
                    this.applyFilter(text);
                }
            }, 500); // 500ms delay before executing the search
        });

        // Restore the saved search phrase from DataTables state
        const state = this.dataTable.state.loaded();
        if (state && state.search) {
            this.$globalSearch.val(state.search.search); // Set the search field with the saved value
        }

        // Retrieves the value of 'search' query parameter from the URL.
        const searchValue = this.getQueryParam('search');

        // Sets the global search input value and applies the filter if a search value is provided.
        if (searchValue) {
            this.$globalSearch.val(searchValue);
            this.applyFilter(searchValue);
        }

        this.dataTable.on('draw', () => {
            this.$globalSearch.closest('div').removeClass('loading');
        });
    },

    /**
     * Build the HTML template for each row in the DataTable.
     *
     * @param {HTMLElement} row - The row element.
     * @param {Object} data - The data object for the row.
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
            <div class="ui basic icon buttons action-buttons tiny">
                <a href="#" data-value="${data.DT_RowId}" class="ui delete button">
                    <i class="icon trash red"></i>
                </a>
            </div>`;

        $('td', row).eq(0).html('<i class="ui user circle icon"></i>');
        $('td', row).eq(1).html(nameTemplate);
        $('td', row).eq(2).html(numberTemplate);
        $('td', row).eq(3).html(deleteButtonTemplate);
    },

    /**
     * Apply a search filter to the DataTable.
     *
     * @param {string} text - The search text to apply.
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
     * Initialize input masks for phone number fields.
     *
     * @param {jQuery} $el - The input elements to apply masks to.
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
     * Send the changes for a specific row to the server.
     *
     * @param {string} recordId - The ID of the record to save.
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
            on: 'now',
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
     * Display a saving icon for the given record.
     *
     * @param {string} recordId - The ID of the record being saved.
     */
    displaySavingIcon(recordId) {
        $(`tr#${recordId} .user.circle`)
            .removeClass('user circle')
            .addClass('spinner loading');
    },

    /**
     * Handle successful saving of a record.
     *
     * @param {Object} response - The server response.
     * @param {string} recordId - The ID of the record that was saved.
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
     * Delete a row from the phonebook table.
     *
     * @param {jQuery} $target - The delete button element.
     * @param {string} id - The ID of the record to delete.
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
     * Clean number before pasting.
     *
     * @param {string} pastedValue - The pasted phone number.
     * @returns {string} The cleaned number.
     */
    cbOnNumberBeforePaste(pastedValue) {
        return pastedValue.replace(/\D+/g, '');
    },

    /**
     * Calculate the number of rows that can fit on a page based on window height.
     *
     * @returns {number} The calculated number of rows.
     */
    calculatePageLength() {
        // Calculate row height
        let rowHeight = this.$recordsTable.find('tr').first().outerHeight();

        // Calculate window height and available space for table
        const windowHeight = window.innerHeight;
        const headerFooterHeight = 550; // Estimate height for header, footer, and other elements

        // Calculate new page length
        return Math.max(Math.floor((windowHeight - headerFooterHeight) / rowHeight), 5);
    },

    /**
     * Get the value of a query parameter from the URL.
     *
     * @param {string} param - The name of the query parameter to retrieve.
     * @returns {string|null} The value of the query parameter, or null if not found.
     */
    getQueryParam(param) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    },
};

$(document).ready(() => {
    ModulePhoneBookDT.initialize();
});