"use strict";

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

var ModulePhoneBookDT = {
  /**
   * The global search input element.
   * @type {jQuery}
   */
  $globalSearch: $('#global-search'),
  /**
   * The page length selector.
   * @type {jQuery}
   */
  $pageLengthSelector: $('#page-length-select'),
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
  getNewRecordsAJAXUrl: "".concat(globalRootUrl, "module-phone-book/getNewRecords"),
  deleteRecordAJAXUrl: "".concat(globalRootUrl, "module-phone-book/delete"),
  saveRecordAJAXUrl: "".concat(globalRootUrl, "module-phone-book/save"),
  /**
   * Initialize the module.
   * This includes setting up event listeners and initializing the DataTable.
   */
  initialize: function initialize() {
    this.initializeSearch();
    this.initializeDataTable();
    this.initializeEventListeners();
  },
  /**
   * Initialize the search functionality.
   * It listens for key events and applies a filter based on the user's input.
   */
  initializeSearch: function initializeSearch() {
    var _this = this;
    this.$globalSearch.on('keyup', function (e) {
      var searchText = _this.$globalSearch.val().trim();
      if (e.keyCode === 13 || e.keyCode === 8 || searchText.length === 0) {
        _this.applyFilter(searchText);
      }
    });
  },
  /**
   * Initialize all event listeners.
   * Handles input focus, form submission, adding new rows, and delete actions.
   */
  initializeEventListeners: function initializeEventListeners() {
    var _this2 = this;
    // Handle focus on input fields for editing
    this.$body.on('focusin', '.caller-id-input, .number-input', function (e) {
      _this2.onFieldFocus($(e.target));
    });

    // Handle loss of focus on input fields and save changes
    this.$body.on('focusout', '.caller-id-input, .number-input', function () {
      _this2.saveChangesForAllRows();
    });

    // Handle delete button click
    this.$body.on('click', 'a.delete', function (e) {
      e.preventDefault();
      var id = $(e.target).closest('a').data('value');
      _this2.deleteRow($(e.target), id);
    });

    // Handle Enter or Tab key to trigger form submission
    $(document).on('keydown', function (e) {
      if (e.key === 'Enter' || e.key === 'Tab' && !$(':focus').hasClass('.number-input')) {
        _this2.saveChangesForAllRows();
      }
    });

    // Handle adding a new row
    this.$addNewButton.on('click', function (e) {
      e.preventDefault();
      _this2.addNewRow();
    });

    // Handle page length selection
    this.$pageLengthSelector.dropdown({
      onChange: function onChange(pageLength) {
        if (pageLength === 'auto') {
          pageLength = this.calculatePageLength();
          localStorage.removeItem('phonebookTablePageLength');
        } else {
          localStorage.setItem('phonebookTablePageLength', pageLength);
        }
        ModulePhoneBookDT.dataTable.page.len(pageLength).draw();
      }
    });

    // Prevent event bubbling on dropdown click
    this.$pageLengthSelector.on('click', function (event) {
      event.stopPropagation(); // Prevent the event from bubbling
    });
  },
  /**
   * Handle focus event on a field by adding a glowing effect and enabling editing.
   *
   * @param {jQuery} $input - The input field that received focus.
   */
  onFieldFocus: function onFieldFocus($input) {
    $input.transition('glow');
    $input.closest('div').removeClass('transparent').addClass('changed-field');
    $input.attr('readonly', false);
  },
  /**
   * Save changes for all modified rows.
   * It sends the changes for each modified row to the server.
   */
  saveChangesForAllRows: function saveChangesForAllRows() {
    var _this3 = this;
    var $rows = $('.changed-field').closest('tr');
    $rows.each(function (_, row) {
      var rowId = $(row).attr('id');
      if (rowId !== undefined) {
        _this3.sendChangesToServer(rowId);
      }
    });
  },
  /**
   * Add a new row to the phonebook table.
   * The row is editable and allows for input of new contact information.
   */
  addNewRow: function addNewRow() {
    var $emptyRow = $('.dataTables_empty');
    if ($emptyRow.length) $emptyRow.remove();
    this.saveChangesForAllRows();
    var newId = "new".concat(Math.floor(Math.random() * 500));
    var newRowTemplate = "\n            <tr id=\"".concat(newId, "\">\n                <td><i class=\"ui user circle icon\"></i></td>\n                <td><div class=\"ui fluid input inline-edit changed-field\"><input class=\"caller-id-input\" type=\"text\" value=\"\"></div></td>\n                <td><div class=\"ui fluid input inline-edit changed-field\"><input class=\"number-input\" type=\"text\" value=\"\"></div></td>\n                <td><div class=\"ui basic icon buttons action-buttons tiny\">\n                    <a href=\"#\" class=\"ui button delete\" data-value=\"new\">\n                        <i class=\"icon trash red\"></i>\n                    </a>\n                </div></td>\n            </tr>");
    this.$recordsTable.find('tbody').prepend(newRowTemplate);
    var $newRow = $("#".concat(newId));
    $newRow.find('input').transition('glow');
    $newRow.find('.caller-id-input').focus();
    this.initializeInputmask($newRow.find('.number-input'));
  },
  /**
   * Initialize the DataTable instance with the required settings and options.
   */
  initializeDataTable: function initializeDataTable() {
    var _this4 = this;
    // Get the user's saved value or use the automatically calculated value if none exists
    var savedPageLength = localStorage.getItem('phonebookTablePageLength');
    var pageLength = savedPageLength ? savedPageLength : this.calculatePageLength();
    this.$recordsTable.dataTable({
      search: {
        search: this.$globalSearch.val()
      },
      serverSide: true,
      processing: true,
      ajax: {
        url: this.getNewRecordsAJAXUrl,
        type: 'POST',
        dataSrc: 'data'
      },
      columns: [{
        data: null
      }, {
        data: 'call_id'
      }, {
        data: 'number'
      }, {
        data: null
      }],
      paging: true,
      pageLength: pageLength,
      deferRender: true,
      sDom: 'rtip',
      ordering: false,
      createdRow: function createdRow(row, data) {
        _this4.buildRowTemplate(row, data);
      },
      drawCallback: function drawCallback() {
        _this4.initializeInputmask($(_this4.inputNumberJQTPL));
      },
      language: SemanticLocalization.dataTableLocalisation
    });
    this.dataTable = this.$recordsTable.DataTable();

    // Set the select input value to the saved value if it exists
    if (savedPageLength) {
      this.$pageLengthSelector.dropdown('set value', savedPageLength);
    }

    // Initialize debounce timer variable
    var searchDebounceTimer = null;
    this.$globalSearch.on('keyup', function (e) {
      // Clear previous timer if the user is still typing
      clearTimeout(searchDebounceTimer);

      // Set a new timer for delayed execution
      searchDebounceTimer = setTimeout(function () {
        var text = _this4.$globalSearch.val();
        // Trigger the search if input is valid (Enter, Backspace, or more than 2 characters)
        if (e.keyCode === 13 || e.keyCode === 8 || text.length >= 2) {
          _this4.applyFilter(text);
        }
      }, 500); // 500ms delay before executing the search
    });

    // Restore the saved search phrase from DataTables state
    var state = this.dataTable.state.loaded();
    if (state && state.search) {
      this.$globalSearch.val(state.search.search); // Set the search field with the saved value
    }

    // Retrieves the value of 'search' query parameter from the URL.
    var searchValue = this.getQueryParam('search');

    // Sets the global search input value and applies the filter if a search value is provided.
    if (searchValue) {
      this.$globalSearch.val(searchValue);
      this.applyFilter(searchValue);
    }
    this.dataTable.on('draw', function () {
      _this4.$globalSearch.closest('div').removeClass('loading');
    });
  },
  /**
   * Build the HTML template for each row in the DataTable.
   *
   * @param {HTMLElement} row - The row element.
   * @param {Object} data - The data object for the row.
   */
  buildRowTemplate: function buildRowTemplate(row, data) {
    var btnDeleteColor = data.created > 0 ? 'icon trash blue' : 'icon trash red';
    var nameTemplate = "\n            <div class=\"ui transparent fluid input inline-edit\">\n                <input class=\"caller-id-input\" type=\"text\" value=\"".concat(data.call_id, "\" />\n            </div>");
    var numberTemplate = "\n            <div class=\"ui transparent input inline-edit\">\n                <input class=\"number-input\" type=\"text\" value=\"".concat(data.number, "\" />\n            </div>");
    var deleteButtonTemplate = "\n            <div class=\"ui basic icon buttons action-buttons tiny\">\n                <a href=\"#\" data-value=\"".concat(data.DT_RowId, "\" class=\"ui delete button\">\n                    <i class=\"").concat(btnDeleteColor, "\"></i>\n                </a>\n            </div>");
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
  applyFilter: function applyFilter(text) {
    var $changedFields = $('.changed-field');
    $changedFields.each(function (_, obj) {
      var $input = $(obj).find('input');
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
  initializeInputmask: function initializeInputmask($el) {
    if (this.$disableInputMaskToggle.checkbox('is checked')) return;
    if (this.$maskList === null) {
      this.$maskList = $.masksSort(InputMaskPatterns, ['#'], /[0-9]|#/, 'mask');
    }
    $el.inputmasks({
      inputmask: {
        definitions: {
          '#': {
            validator: '[0-9]',
            cardinality: 1
          }
        },
        showMaskOnHover: false,
        onBeforePaste: this.cbOnNumberBeforePaste
      },
      match: /[0-9]/,
      replace: '9',
      list: this.$maskList,
      listKey: 'mask'
    });
  },
  /**
   * Send the changes for a specific row to the server.
   *
   * @param {string} recordId - The ID of the record to save.
   */
  sendChangesToServer: function sendChangesToServer(recordId) {
    var _this5 = this;
    var callerId = $("tr#".concat(recordId, " .caller-id-input")).val();
    var numberInputVal = $("tr#".concat(recordId, " .number-input")).val();
    if (!callerId || !numberInputVal) return;
    var data = {
      call_id: callerId,
      number_rep: numberInputVal,
      id: recordId
    };
    this.displaySavingIcon(recordId);
    $.api({
      url: this.saveRecordAJAXUrl,
      method: 'POST',
      on: 'now',
      data: data,
      successTest: function successTest(response) {
        return response && response.success === true;
      },
      onSuccess: function onSuccess(response) {
        return _this5.onSaveSuccess(response, recordId);
      },
      onFailure: function onFailure(response) {
        return UserMessage.showMultiString(response.message);
      },
      onError: function onError(errorMessage, element, xhr) {
        if (xhr.status === 403) window.location = "".concat(globalRootUrl, "session/index");
      }
    });
  },
  /**
   * Display a saving icon for the given record.
   *
   * @param {string} recordId - The ID of the record being saved.
   */
  displaySavingIcon: function displaySavingIcon(recordId) {
    $("tr#".concat(recordId, " .user.circle")).removeClass('user circle').addClass('spinner loading');
  },
  /**
   * Handle successful saving of a record.
   *
   * @param {Object} response - The server response.
   * @param {string} recordId - The ID of the record that was saved.
   */
  onSaveSuccess: function onSaveSuccess(response, recordId) {
    if (response.data) {
      var oldId = response.data.oldId || recordId;
      $("tr#".concat(oldId, " input")).attr('readonly', true);
      $("tr#".concat(oldId, " a.delete.button")).attr('data-value', response.data.newId);
      $("tr#".concat(oldId, " div")).removeClass('changed-field loading').addClass('transparent');
      $("tr#".concat(oldId, " .spinner.loading")).addClass('user circle').removeClass('spinner loading');
      if (oldId !== response.data.newId) {
        $("tr#".concat(oldId)).attr('id', response.data.newId);
      }
    }
  },
  /**
   * Delete a row from the phonebook table.
   *
   * @param {jQuery} $target - The delete button element.
   * @param {string} id - The ID of the record to delete.
   */
  deleteRow: function deleteRow($target, id) {
    var _this6 = this;
    if (id === 'new') {
      $target.closest('tr').remove();
      return;
    }
    $.api({
      url: "".concat(this.deleteRecordAJAXUrl, "/").concat(id),
      on: 'now',
      onSuccess: function onSuccess(response) {
        if (response.success) {
          $target.closest('tr').remove();
          if (_this6.$recordsTable.find('tbody > tr').length === 0) {
            _this6.$recordsTable.find('tbody').append('<tr class="odd"></tr>');
          }
        }
      }
    });
  },
  /**
   * Clean number before pasting.
   *
   * @param {string} pastedValue - The pasted phone number.
   * @returns {string} The cleaned number.
   */
  cbOnNumberBeforePaste: function cbOnNumberBeforePaste(pastedValue) {
    return pastedValue.replace(/\D+/g, '');
  },
  /**
   * Calculate the number of rows that can fit on a page based on window height.
   *
   * @returns {number} The calculated number of rows.
   */
  calculatePageLength: function calculatePageLength() {
    // Calculate row height
    var rowHeight = this.$recordsTable.find('tr').first().outerHeight();

    // Calculate window height and available space for table
    var windowHeight = window.innerHeight;
    var headerFooterHeight = 550; // Estimate height for header, footer, and other elements

    // Calculate new page length
    return Math.max(Math.floor((windowHeight - headerFooterHeight) / rowHeight), 5);
  },
  /**
   * Get the value of a query parameter from the URL.
   *
   * @param {string} param - The name of the query parameter to retrieve.
   * @returns {string|null} The value of the query parameter, or null if not found.
   */
  getQueryParam: function getQueryParam(param) {
    var urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  }
};
$(document).ready(function () {
  ModulePhoneBookDT.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJNb2R1bGVQaG9uZUJvb2tEVCIsIiRnbG9iYWxTZWFyY2giLCIkIiwiJHBhZ2VMZW5ndGhTZWxlY3RvciIsIiRzZWFyY2hFeHRlbnNpb25zSW5wdXQiLCJkYXRhVGFibGUiLCIkYm9keSIsIiRkaXNhYmxlSW5wdXRNYXNrVG9nZ2xlIiwiJHJlY29yZHNUYWJsZSIsIiRhZGROZXdCdXR0b24iLCJpbnB1dE51bWJlckpRVFBMIiwiJG1hc2tMaXN0IiwiZ2V0TmV3UmVjb3Jkc0FKQVhVcmwiLCJjb25jYXQiLCJnbG9iYWxSb290VXJsIiwiZGVsZXRlUmVjb3JkQUpBWFVybCIsInNhdmVSZWNvcmRBSkFYVXJsIiwiaW5pdGlhbGl6ZSIsImluaXRpYWxpemVTZWFyY2giLCJpbml0aWFsaXplRGF0YVRhYmxlIiwiaW5pdGlhbGl6ZUV2ZW50TGlzdGVuZXJzIiwiX3RoaXMiLCJvbiIsImUiLCJzZWFyY2hUZXh0IiwidmFsIiwidHJpbSIsImtleUNvZGUiLCJsZW5ndGgiLCJhcHBseUZpbHRlciIsIl90aGlzMiIsIm9uRmllbGRGb2N1cyIsInRhcmdldCIsInNhdmVDaGFuZ2VzRm9yQWxsUm93cyIsInByZXZlbnREZWZhdWx0IiwiaWQiLCJjbG9zZXN0IiwiZGF0YSIsImRlbGV0ZVJvdyIsImRvY3VtZW50Iiwia2V5IiwiaGFzQ2xhc3MiLCJhZGROZXdSb3ciLCJkcm9wZG93biIsIm9uQ2hhbmdlIiwicGFnZUxlbmd0aCIsImNhbGN1bGF0ZVBhZ2VMZW5ndGgiLCJsb2NhbFN0b3JhZ2UiLCJyZW1vdmVJdGVtIiwic2V0SXRlbSIsInBhZ2UiLCJsZW4iLCJkcmF3IiwiZXZlbnQiLCJzdG9wUHJvcGFnYXRpb24iLCIkaW5wdXQiLCJ0cmFuc2l0aW9uIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsImF0dHIiLCJfdGhpczMiLCIkcm93cyIsImVhY2giLCJfIiwicm93Iiwicm93SWQiLCJ1bmRlZmluZWQiLCJzZW5kQ2hhbmdlc1RvU2VydmVyIiwiJGVtcHR5Um93IiwicmVtb3ZlIiwibmV3SWQiLCJNYXRoIiwiZmxvb3IiLCJyYW5kb20iLCJuZXdSb3dUZW1wbGF0ZSIsImZpbmQiLCJwcmVwZW5kIiwiJG5ld1JvdyIsImZvY3VzIiwiaW5pdGlhbGl6ZUlucHV0bWFzayIsIl90aGlzNCIsInNhdmVkUGFnZUxlbmd0aCIsImdldEl0ZW0iLCJzZWFyY2giLCJzZXJ2ZXJTaWRlIiwicHJvY2Vzc2luZyIsImFqYXgiLCJ1cmwiLCJ0eXBlIiwiZGF0YVNyYyIsImNvbHVtbnMiLCJwYWdpbmciLCJkZWZlclJlbmRlciIsInNEb20iLCJvcmRlcmluZyIsImNyZWF0ZWRSb3ciLCJidWlsZFJvd1RlbXBsYXRlIiwiZHJhd0NhbGxiYWNrIiwibGFuZ3VhZ2UiLCJTZW1hbnRpY0xvY2FsaXphdGlvbiIsImRhdGFUYWJsZUxvY2FsaXNhdGlvbiIsIkRhdGFUYWJsZSIsInNlYXJjaERlYm91bmNlVGltZXIiLCJjbGVhclRpbWVvdXQiLCJzZXRUaW1lb3V0IiwidGV4dCIsInN0YXRlIiwibG9hZGVkIiwic2VhcmNoVmFsdWUiLCJnZXRRdWVyeVBhcmFtIiwiYnRuRGVsZXRlQ29sb3IiLCJjcmVhdGVkIiwibmFtZVRlbXBsYXRlIiwiY2FsbF9pZCIsIm51bWJlclRlbXBsYXRlIiwibnVtYmVyIiwiZGVsZXRlQnV0dG9uVGVtcGxhdGUiLCJEVF9Sb3dJZCIsImVxIiwiaHRtbCIsIiRjaGFuZ2VkRmllbGRzIiwib2JqIiwiJGVsIiwiY2hlY2tib3giLCJtYXNrc1NvcnQiLCJJbnB1dE1hc2tQYXR0ZXJucyIsImlucHV0bWFza3MiLCJpbnB1dG1hc2siLCJkZWZpbml0aW9ucyIsInZhbGlkYXRvciIsImNhcmRpbmFsaXR5Iiwic2hvd01hc2tPbkhvdmVyIiwib25CZWZvcmVQYXN0ZSIsImNiT25OdW1iZXJCZWZvcmVQYXN0ZSIsIm1hdGNoIiwicmVwbGFjZSIsImxpc3QiLCJsaXN0S2V5IiwicmVjb3JkSWQiLCJfdGhpczUiLCJjYWxsZXJJZCIsIm51bWJlcklucHV0VmFsIiwibnVtYmVyX3JlcCIsImRpc3BsYXlTYXZpbmdJY29uIiwiYXBpIiwibWV0aG9kIiwic3VjY2Vzc1Rlc3QiLCJyZXNwb25zZSIsInN1Y2Nlc3MiLCJvblN1Y2Nlc3MiLCJvblNhdmVTdWNjZXNzIiwib25GYWlsdXJlIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJtZXNzYWdlIiwib25FcnJvciIsImVycm9yTWVzc2FnZSIsImVsZW1lbnQiLCJ4aHIiLCJzdGF0dXMiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsIm9sZElkIiwiJHRhcmdldCIsIl90aGlzNiIsImFwcGVuZCIsInBhc3RlZFZhbHVlIiwicm93SGVpZ2h0IiwiZmlyc3QiLCJvdXRlckhlaWdodCIsIndpbmRvd0hlaWdodCIsImlubmVySGVpZ2h0IiwiaGVhZGVyRm9vdGVySGVpZ2h0IiwibWF4IiwicGFyYW0iLCJ1cmxQYXJhbXMiLCJVUkxTZWFyY2hQYXJhbXMiLCJnZXQiLCJyZWFkeSJdLCJzb3VyY2VzIjpbInNyYy9tb2R1bGUtcGhvbmVib29rLWRhdGF0YWJsZS5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKlxyXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXHJcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjQgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxyXG4gKlxyXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxyXG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxyXG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxyXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxyXG4gKlxyXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcclxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcclxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxyXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxyXG4gKlxyXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cclxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cclxuICovXHJcblxyXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBTZW1hbnRpY0xvY2FsaXphdGlvbiwgVXNlck1lc3NhZ2UsIElucHV0TWFza1BhdHRlcm5zICovXHJcblxyXG5jb25zdCBNb2R1bGVQaG9uZUJvb2tEVCA9IHtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFRoZSBnbG9iYWwgc2VhcmNoIGlucHV0IGVsZW1lbnQuXHJcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxyXG4gICAgICovXHJcbiAgICAkZ2xvYmFsU2VhcmNoOiAkKCcjZ2xvYmFsLXNlYXJjaCcpLFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogVGhlIHBhZ2UgbGVuZ3RoIHNlbGVjdG9yLlxyXG4gICAgICogQHR5cGUge2pRdWVyeX1cclxuICAgICAqL1xyXG4gICAgJHBhZ2VMZW5ndGhTZWxlY3RvcjokKCcjcGFnZS1sZW5ndGgtc2VsZWN0JyksXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBUaGUgcGFnZSBsZW5ndGggc2VsZWN0b3IuXHJcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxyXG4gICAgICovXHJcbiAgICAkc2VhcmNoRXh0ZW5zaW9uc0lucHV0OiAkKCcjc2VhcmNoLWV4dGVuc2lvbnMtaW5wdXQnKSxcclxuXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBUaGUgZGF0YSB0YWJsZSBvYmplY3QuXHJcbiAgICAgKiBAdHlwZSB7T2JqZWN0fVxyXG4gICAgICovXHJcbiAgICBkYXRhVGFibGU6IHt9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogVGhlIGRvY3VtZW50IGJvZHkuXHJcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxyXG4gICAgICovXHJcbiAgICAkYm9keTogJCgnYm9keScpLFxyXG5cclxuICAgIC8vIENhY2hlZCBET00gZWxlbWVudHNcclxuICAgICRkaXNhYmxlSW5wdXRNYXNrVG9nZ2xlOiAkKCcjZGlzYWJsZS1pbnB1dC1tYXNrJyksXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBUaGUgZXh0ZW5zaW9ucyB0YWJsZSBlbGVtZW50LlxyXG4gICAgICogQHR5cGUge2pRdWVyeX1cclxuICAgICAqL1xyXG4gICAgJHJlY29yZHNUYWJsZTogJCgnI3Bob25lYm9vay10YWJsZScpLFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogVGhlIGFkZCBuZXcgYnV0dG9uIGVsZW1lbnQuXHJcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxyXG4gICAgICovXHJcbiAgICAkYWRkTmV3QnV0dG9uOiAkKCcjYWRkLW5ldy1idXR0b24nKSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIFNlbGVjdG9yIGZvciBudW1iZXIgaW5wdXQgZmllbGRzLlxyXG4gICAgICogQHR5cGUge3N0cmluZ31cclxuICAgICAqL1xyXG4gICAgaW5wdXROdW1iZXJKUVRQTDogJ2lucHV0Lm51bWJlci1pbnB1dCcsXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBMaXN0IG9mIGlucHV0IG1hc2tzLlxyXG4gICAgICogQHR5cGUge251bGx8QXJyYXl9XHJcbiAgICAgKi9cclxuICAgICRtYXNrTGlzdDogbnVsbCxcclxuXHJcbiAgICAvLyBVUkxzIGZvciBBSkFYIHJlcXVlc3RzXHJcbiAgICBnZXROZXdSZWNvcmRzQUpBWFVybDogYCR7Z2xvYmFsUm9vdFVybH1tb2R1bGUtcGhvbmUtYm9vay9nZXROZXdSZWNvcmRzYCxcclxuXHJcbiAgICBkZWxldGVSZWNvcmRBSkFYVXJsOiBgJHtnbG9iYWxSb290VXJsfW1vZHVsZS1waG9uZS1ib29rL2RlbGV0ZWAsXHJcblxyXG4gICAgc2F2ZVJlY29yZEFKQVhVcmw6IGAke2dsb2JhbFJvb3RVcmx9bW9kdWxlLXBob25lLWJvb2svc2F2ZWAsXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBJbml0aWFsaXplIHRoZSBtb2R1bGUuXHJcbiAgICAgKiBUaGlzIGluY2x1ZGVzIHNldHRpbmcgdXAgZXZlbnQgbGlzdGVuZXJzIGFuZCBpbml0aWFsaXppbmcgdGhlIERhdGFUYWJsZS5cclxuICAgICAqL1xyXG4gICAgaW5pdGlhbGl6ZSgpIHtcclxuICAgICAgICB0aGlzLmluaXRpYWxpemVTZWFyY2goKTtcclxuICAgICAgICB0aGlzLmluaXRpYWxpemVEYXRhVGFibGUoKTtcclxuICAgICAgICB0aGlzLmluaXRpYWxpemVFdmVudExpc3RlbmVycygpO1xyXG4gICAgfSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIEluaXRpYWxpemUgdGhlIHNlYXJjaCBmdW5jdGlvbmFsaXR5LlxyXG4gICAgICogSXQgbGlzdGVucyBmb3Iga2V5IGV2ZW50cyBhbmQgYXBwbGllcyBhIGZpbHRlciBiYXNlZCBvbiB0aGUgdXNlcidzIGlucHV0LlxyXG4gICAgICovXHJcbiAgICBpbml0aWFsaXplU2VhcmNoKCkge1xyXG4gICAgICAgIHRoaXMuJGdsb2JhbFNlYXJjaC5vbigna2V5dXAnLCAoZSkgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBzZWFyY2hUZXh0ID0gdGhpcy4kZ2xvYmFsU2VhcmNoLnZhbCgpLnRyaW0oKTtcclxuICAgICAgICAgICAgaWYgKGUua2V5Q29kZSA9PT0gMTMgfHwgZS5rZXlDb2RlID09PSA4IHx8IHNlYXJjaFRleHQubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmFwcGx5RmlsdGVyKHNlYXJjaFRleHQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogSW5pdGlhbGl6ZSBhbGwgZXZlbnQgbGlzdGVuZXJzLlxyXG4gICAgICogSGFuZGxlcyBpbnB1dCBmb2N1cywgZm9ybSBzdWJtaXNzaW9uLCBhZGRpbmcgbmV3IHJvd3MsIGFuZCBkZWxldGUgYWN0aW9ucy5cclxuICAgICAqL1xyXG4gICAgaW5pdGlhbGl6ZUV2ZW50TGlzdGVuZXJzKCkge1xyXG5cclxuICAgICAgICAvLyBIYW5kbGUgZm9jdXMgb24gaW5wdXQgZmllbGRzIGZvciBlZGl0aW5nXHJcbiAgICAgICAgdGhpcy4kYm9keS5vbignZm9jdXNpbicsICcuY2FsbGVyLWlkLWlucHV0LCAubnVtYmVyLWlucHV0JywgKGUpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5vbkZpZWxkRm9jdXMoJChlLnRhcmdldCkpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBIYW5kbGUgbG9zcyBvZiBmb2N1cyBvbiBpbnB1dCBmaWVsZHMgYW5kIHNhdmUgY2hhbmdlc1xyXG4gICAgICAgIHRoaXMuJGJvZHkub24oJ2ZvY3Vzb3V0JywgJy5jYWxsZXItaWQtaW5wdXQsIC5udW1iZXItaW5wdXQnLCAoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuc2F2ZUNoYW5nZXNGb3JBbGxSb3dzKCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIEhhbmRsZSBkZWxldGUgYnV0dG9uIGNsaWNrXHJcbiAgICAgICAgdGhpcy4kYm9keS5vbignY2xpY2snLCAnYS5kZWxldGUnLCAoZSkgPT4ge1xyXG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgIGNvbnN0IGlkID0gJChlLnRhcmdldCkuY2xvc2VzdCgnYScpLmRhdGEoJ3ZhbHVlJyk7XHJcbiAgICAgICAgICAgIHRoaXMuZGVsZXRlUm93KCQoZS50YXJnZXQpLCBpZCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIEhhbmRsZSBFbnRlciBvciBUYWIga2V5IHRvIHRyaWdnZXIgZm9ybSBzdWJtaXNzaW9uXHJcbiAgICAgICAgJChkb2N1bWVudCkub24oJ2tleWRvd24nLCAoZSkgPT4ge1xyXG4gICAgICAgICAgICBpZiAoZS5rZXkgPT09ICdFbnRlcicgfHwgKGUua2V5ID09PSAnVGFiJyAmJiAhJCgnOmZvY3VzJykuaGFzQ2xhc3MoJy5udW1iZXItaW5wdXQnKSkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2F2ZUNoYW5nZXNGb3JBbGxSb3dzKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gSGFuZGxlIGFkZGluZyBhIG5ldyByb3dcclxuICAgICAgICB0aGlzLiRhZGROZXdCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcclxuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZE5ld1JvdygpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBIYW5kbGUgcGFnZSBsZW5ndGggc2VsZWN0aW9uXHJcbiAgICAgICAgdGhpcy4kcGFnZUxlbmd0aFNlbGVjdG9yLmRyb3Bkb3duKHtcclxuICAgICAgICAgICAgb25DaGFuZ2UocGFnZUxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHBhZ2VMZW5ndGg9PT0nYXV0bycpe1xyXG4gICAgICAgICAgICAgICAgICAgIHBhZ2VMZW5ndGggPSB0aGlzLmNhbGN1bGF0ZVBhZ2VMZW5ndGgoKTtcclxuICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSgncGhvbmVib29rVGFibGVQYWdlTGVuZ3RoJyk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdwaG9uZWJvb2tUYWJsZVBhZ2VMZW5ndGgnLCBwYWdlTGVuZ3RoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIE1vZHVsZVBob25lQm9va0RULmRhdGFUYWJsZS5wYWdlLmxlbihwYWdlTGVuZ3RoKS5kcmF3KCk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIFByZXZlbnQgZXZlbnQgYnViYmxpbmcgb24gZHJvcGRvd24gY2xpY2tcclxuICAgICAgICB0aGlzLiRwYWdlTGVuZ3RoU2VsZWN0b3Iub24oJ2NsaWNrJywgZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgICAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7IC8vIFByZXZlbnQgdGhlIGV2ZW50IGZyb20gYnViYmxpbmdcclxuICAgICAgICB9KTtcclxuICAgIH0sXHJcblxyXG5cclxuICAgIC8qKlxyXG4gICAgICogSGFuZGxlIGZvY3VzIGV2ZW50IG9uIGEgZmllbGQgYnkgYWRkaW5nIGEgZ2xvd2luZyBlZmZlY3QgYW5kIGVuYWJsaW5nIGVkaXRpbmcuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICRpbnB1dCAtIFRoZSBpbnB1dCBmaWVsZCB0aGF0IHJlY2VpdmVkIGZvY3VzLlxyXG4gICAgICovXHJcbiAgICBvbkZpZWxkRm9jdXMoJGlucHV0KSB7XHJcbiAgICAgICAgJGlucHV0LnRyYW5zaXRpb24oJ2dsb3cnKTtcclxuICAgICAgICAkaW5wdXQuY2xvc2VzdCgnZGl2JykucmVtb3ZlQ2xhc3MoJ3RyYW5zcGFyZW50JykuYWRkQ2xhc3MoJ2NoYW5nZWQtZmllbGQnKTtcclxuICAgICAgICAkaW5wdXQuYXR0cigncmVhZG9ubHknLCBmYWxzZSk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogU2F2ZSBjaGFuZ2VzIGZvciBhbGwgbW9kaWZpZWQgcm93cy5cclxuICAgICAqIEl0IHNlbmRzIHRoZSBjaGFuZ2VzIGZvciBlYWNoIG1vZGlmaWVkIHJvdyB0byB0aGUgc2VydmVyLlxyXG4gICAgICovXHJcbiAgICBzYXZlQ2hhbmdlc0ZvckFsbFJvd3MoKSB7XHJcbiAgICAgICAgY29uc3QgJHJvd3MgPSAkKCcuY2hhbmdlZC1maWVsZCcpLmNsb3Nlc3QoJ3RyJyk7XHJcbiAgICAgICAgJHJvd3MuZWFjaCgoXywgcm93KSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJvd0lkID0gJChyb3cpLmF0dHIoJ2lkJyk7XHJcbiAgICAgICAgICAgIGlmIChyb3dJZCAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNlbmRDaGFuZ2VzVG9TZXJ2ZXIocm93SWQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQWRkIGEgbmV3IHJvdyB0byB0aGUgcGhvbmVib29rIHRhYmxlLlxyXG4gICAgICogVGhlIHJvdyBpcyBlZGl0YWJsZSBhbmQgYWxsb3dzIGZvciBpbnB1dCBvZiBuZXcgY29udGFjdCBpbmZvcm1hdGlvbi5cclxuICAgICAqL1xyXG4gICAgYWRkTmV3Um93KCkge1xyXG4gICAgICAgIGNvbnN0ICRlbXB0eVJvdyA9ICQoJy5kYXRhVGFibGVzX2VtcHR5Jyk7XHJcbiAgICAgICAgaWYgKCRlbXB0eVJvdy5sZW5ndGgpICRlbXB0eVJvdy5yZW1vdmUoKTtcclxuXHJcbiAgICAgICAgdGhpcy5zYXZlQ2hhbmdlc0ZvckFsbFJvd3MoKTtcclxuXHJcbiAgICAgICAgY29uc3QgbmV3SWQgPSBgbmV3JHtNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiA1MDApfWA7XHJcbiAgICAgICAgY29uc3QgbmV3Um93VGVtcGxhdGUgPSBgXHJcbiAgICAgICAgICAgIDx0ciBpZD1cIiR7bmV3SWR9XCI+XHJcbiAgICAgICAgICAgICAgICA8dGQ+PGkgY2xhc3M9XCJ1aSB1c2VyIGNpcmNsZSBpY29uXCI+PC9pPjwvdGQ+XHJcbiAgICAgICAgICAgICAgICA8dGQ+PGRpdiBjbGFzcz1cInVpIGZsdWlkIGlucHV0IGlubGluZS1lZGl0IGNoYW5nZWQtZmllbGRcIj48aW5wdXQgY2xhc3M9XCJjYWxsZXItaWQtaW5wdXRcIiB0eXBlPVwidGV4dFwiIHZhbHVlPVwiXCI+PC9kaXY+PC90ZD5cclxuICAgICAgICAgICAgICAgIDx0ZD48ZGl2IGNsYXNzPVwidWkgZmx1aWQgaW5wdXQgaW5saW5lLWVkaXQgY2hhbmdlZC1maWVsZFwiPjxpbnB1dCBjbGFzcz1cIm51bWJlci1pbnB1dFwiIHR5cGU9XCJ0ZXh0XCIgdmFsdWU9XCJcIj48L2Rpdj48L3RkPlxyXG4gICAgICAgICAgICAgICAgPHRkPjxkaXYgY2xhc3M9XCJ1aSBiYXNpYyBpY29uIGJ1dHRvbnMgYWN0aW9uLWJ1dHRvbnMgdGlueVwiPlxyXG4gICAgICAgICAgICAgICAgICAgIDxhIGhyZWY9XCIjXCIgY2xhc3M9XCJ1aSBidXR0b24gZGVsZXRlXCIgZGF0YS12YWx1ZT1cIm5ld1wiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImljb24gdHJhc2ggcmVkXCI+PC9pPlxyXG4gICAgICAgICAgICAgICAgICAgIDwvYT5cclxuICAgICAgICAgICAgICAgIDwvZGl2PjwvdGQ+XHJcbiAgICAgICAgICAgIDwvdHI+YDtcclxuXHJcbiAgICAgICAgdGhpcy4kcmVjb3Jkc1RhYmxlLmZpbmQoJ3Rib2R5JykucHJlcGVuZChuZXdSb3dUZW1wbGF0ZSk7XHJcbiAgICAgICAgY29uc3QgJG5ld1JvdyA9ICQoYCMke25ld0lkfWApO1xyXG4gICAgICAgICRuZXdSb3cuZmluZCgnaW5wdXQnKS50cmFuc2l0aW9uKCdnbG93Jyk7XHJcbiAgICAgICAgJG5ld1Jvdy5maW5kKCcuY2FsbGVyLWlkLWlucHV0JykuZm9jdXMoKTtcclxuICAgICAgICB0aGlzLmluaXRpYWxpemVJbnB1dG1hc2soJG5ld1Jvdy5maW5kKCcubnVtYmVyLWlucHV0JykpO1xyXG4gICAgfSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIEluaXRpYWxpemUgdGhlIERhdGFUYWJsZSBpbnN0YW5jZSB3aXRoIHRoZSByZXF1aXJlZCBzZXR0aW5ncyBhbmQgb3B0aW9ucy5cclxuICAgICAqL1xyXG4gICAgaW5pdGlhbGl6ZURhdGFUYWJsZSgpIHtcclxuXHJcbiAgICAgICAgLy8gR2V0IHRoZSB1c2VyJ3Mgc2F2ZWQgdmFsdWUgb3IgdXNlIHRoZSBhdXRvbWF0aWNhbGx5IGNhbGN1bGF0ZWQgdmFsdWUgaWYgbm9uZSBleGlzdHNcclxuICAgICAgICBjb25zdCBzYXZlZFBhZ2VMZW5ndGggPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgncGhvbmVib29rVGFibGVQYWdlTGVuZ3RoJyk7XHJcbiAgICAgICAgY29uc3QgcGFnZUxlbmd0aCA9IHNhdmVkUGFnZUxlbmd0aCA/IHNhdmVkUGFnZUxlbmd0aCA6IHRoaXMuY2FsY3VsYXRlUGFnZUxlbmd0aCgpO1xyXG5cclxuICAgICAgICB0aGlzLiRyZWNvcmRzVGFibGUuZGF0YVRhYmxlKHtcclxuICAgICAgICAgICAgc2VhcmNoOiB7IHNlYXJjaDogdGhpcy4kZ2xvYmFsU2VhcmNoLnZhbCgpIH0sXHJcbiAgICAgICAgICAgIHNlcnZlclNpZGU6IHRydWUsXHJcbiAgICAgICAgICAgIHByb2Nlc3Npbmc6IHRydWUsXHJcbiAgICAgICAgICAgIGFqYXg6IHtcclxuICAgICAgICAgICAgICAgIHVybDogdGhpcy5nZXROZXdSZWNvcmRzQUpBWFVybCxcclxuICAgICAgICAgICAgICAgIHR5cGU6ICdQT1NUJyxcclxuICAgICAgICAgICAgICAgIGRhdGFTcmM6ICdkYXRhJyxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgY29sdW1uczogW1xyXG4gICAgICAgICAgICAgICAgeyBkYXRhOiBudWxsIH0sXHJcbiAgICAgICAgICAgICAgICB7IGRhdGE6ICdjYWxsX2lkJyB9LFxyXG4gICAgICAgICAgICAgICAgeyBkYXRhOiAnbnVtYmVyJyB9LFxyXG4gICAgICAgICAgICAgICAgeyBkYXRhOiBudWxsIH0sXHJcbiAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgIHBhZ2luZzogdHJ1ZSxcclxuICAgICAgICAgICAgcGFnZUxlbmd0aDogcGFnZUxlbmd0aCxcclxuICAgICAgICAgICAgZGVmZXJSZW5kZXI6IHRydWUsXHJcbiAgICAgICAgICAgIHNEb206ICdydGlwJyxcclxuICAgICAgICAgICAgb3JkZXJpbmc6IGZhbHNlLFxyXG4gICAgICAgICAgICBjcmVhdGVkUm93OiAocm93LCBkYXRhKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmJ1aWxkUm93VGVtcGxhdGUocm93LCBkYXRhKTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZHJhd0NhbGxiYWNrOiAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmluaXRpYWxpemVJbnB1dG1hc2soJCh0aGlzLmlucHV0TnVtYmVySlFUUEwpKTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgbGFuZ3VhZ2U6IFNlbWFudGljTG9jYWxpemF0aW9uLmRhdGFUYWJsZUxvY2FsaXNhdGlvbixcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGhpcy5kYXRhVGFibGUgPSB0aGlzLiRyZWNvcmRzVGFibGUuRGF0YVRhYmxlKCk7XHJcblxyXG5cclxuICAgICAgICAvLyBTZXQgdGhlIHNlbGVjdCBpbnB1dCB2YWx1ZSB0byB0aGUgc2F2ZWQgdmFsdWUgaWYgaXQgZXhpc3RzXHJcbiAgICAgICAgaWYgKHNhdmVkUGFnZUxlbmd0aCkge1xyXG4gICAgICAgICAgICB0aGlzLiRwYWdlTGVuZ3RoU2VsZWN0b3IuZHJvcGRvd24oJ3NldCB2YWx1ZScsIHNhdmVkUGFnZUxlbmd0aCk7XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkZWJvdW5jZSB0aW1lciB2YXJpYWJsZVxyXG4gICAgICAgIGxldCBzZWFyY2hEZWJvdW5jZVRpbWVyID0gbnVsbDtcclxuXHJcbiAgICAgICAgdGhpcy4kZ2xvYmFsU2VhcmNoLm9uKCdrZXl1cCcsIChlKSA9PiB7XHJcbiAgICAgICAgICAgIC8vIENsZWFyIHByZXZpb3VzIHRpbWVyIGlmIHRoZSB1c2VyIGlzIHN0aWxsIHR5cGluZ1xyXG4gICAgICAgICAgICBjbGVhclRpbWVvdXQoc2VhcmNoRGVib3VuY2VUaW1lcik7XHJcblxyXG4gICAgICAgICAgICAvLyBTZXQgYSBuZXcgdGltZXIgZm9yIGRlbGF5ZWQgZXhlY3V0aW9uXHJcbiAgICAgICAgICAgIHNlYXJjaERlYm91bmNlVGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRleHQgPSB0aGlzLiRnbG9iYWxTZWFyY2gudmFsKCk7XHJcbiAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIHRoZSBzZWFyY2ggaWYgaW5wdXQgaXMgdmFsaWQgKEVudGVyLCBCYWNrc3BhY2UsIG9yIG1vcmUgdGhhbiAyIGNoYXJhY3RlcnMpXHJcbiAgICAgICAgICAgICAgICBpZiAoZS5rZXlDb2RlID09PSAxMyB8fCBlLmtleUNvZGUgPT09IDggfHwgdGV4dC5sZW5ndGggPj0gMikge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYXBwbHlGaWx0ZXIodGV4dCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sIDUwMCk7IC8vIDUwMG1zIGRlbGF5IGJlZm9yZSBleGVjdXRpbmcgdGhlIHNlYXJjaFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBSZXN0b3JlIHRoZSBzYXZlZCBzZWFyY2ggcGhyYXNlIGZyb20gRGF0YVRhYmxlcyBzdGF0ZVxyXG4gICAgICAgIGNvbnN0IHN0YXRlID0gdGhpcy5kYXRhVGFibGUuc3RhdGUubG9hZGVkKCk7XHJcbiAgICAgICAgaWYgKHN0YXRlICYmIHN0YXRlLnNlYXJjaCkge1xyXG4gICAgICAgICAgICB0aGlzLiRnbG9iYWxTZWFyY2gudmFsKHN0YXRlLnNlYXJjaC5zZWFyY2gpOyAvLyBTZXQgdGhlIHNlYXJjaCBmaWVsZCB3aXRoIHRoZSBzYXZlZCB2YWx1ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gUmV0cmlldmVzIHRoZSB2YWx1ZSBvZiAnc2VhcmNoJyBxdWVyeSBwYXJhbWV0ZXIgZnJvbSB0aGUgVVJMLlxyXG4gICAgICAgIGNvbnN0IHNlYXJjaFZhbHVlID0gdGhpcy5nZXRRdWVyeVBhcmFtKCdzZWFyY2gnKTtcclxuXHJcbiAgICAgICAgLy8gU2V0cyB0aGUgZ2xvYmFsIHNlYXJjaCBpbnB1dCB2YWx1ZSBhbmQgYXBwbGllcyB0aGUgZmlsdGVyIGlmIGEgc2VhcmNoIHZhbHVlIGlzIHByb3ZpZGVkLlxyXG4gICAgICAgIGlmIChzZWFyY2hWYWx1ZSkge1xyXG4gICAgICAgICAgICB0aGlzLiRnbG9iYWxTZWFyY2gudmFsKHNlYXJjaFZhbHVlKTtcclxuICAgICAgICAgICAgdGhpcy5hcHBseUZpbHRlcihzZWFyY2hWYWx1ZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmRhdGFUYWJsZS5vbignZHJhdycsICgpID0+IHtcclxuICAgICAgICAgICAgdGhpcy4kZ2xvYmFsU2VhcmNoLmNsb3Nlc3QoJ2RpdicpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQnVpbGQgdGhlIEhUTUwgdGVtcGxhdGUgZm9yIGVhY2ggcm93IGluIHRoZSBEYXRhVGFibGUuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtIVE1MRWxlbWVudH0gcm93IC0gVGhlIHJvdyBlbGVtZW50LlxyXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBUaGUgZGF0YSBvYmplY3QgZm9yIHRoZSByb3cuXHJcbiAgICAgKi9cclxuICAgIGJ1aWxkUm93VGVtcGxhdGUocm93LCBkYXRhKSB7XHJcbiAgICAgICAgY29uc3QgYnRuRGVsZXRlQ29sb3IgPSBkYXRhLmNyZWF0ZWQgPiAwID8gJ2ljb24gdHJhc2ggYmx1ZScgOiAnaWNvbiB0cmFzaCByZWQnO1xyXG4gICAgICAgIGNvbnN0IG5hbWVUZW1wbGF0ZSA9IGBcclxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHRyYW5zcGFyZW50IGZsdWlkIGlucHV0IGlubGluZS1lZGl0XCI+XHJcbiAgICAgICAgICAgICAgICA8aW5wdXQgY2xhc3M9XCJjYWxsZXItaWQtaW5wdXRcIiB0eXBlPVwidGV4dFwiIHZhbHVlPVwiJHtkYXRhLmNhbGxfaWR9XCIgLz5cclxuICAgICAgICAgICAgPC9kaXY+YDtcclxuICAgICAgICBjb25zdCBudW1iZXJUZW1wbGF0ZSA9IGBcclxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHRyYW5zcGFyZW50IGlucHV0IGlubGluZS1lZGl0XCI+XHJcbiAgICAgICAgICAgICAgICA8aW5wdXQgY2xhc3M9XCJudW1iZXItaW5wdXRcIiB0eXBlPVwidGV4dFwiIHZhbHVlPVwiJHtkYXRhLm51bWJlcn1cIiAvPlxyXG4gICAgICAgICAgICA8L2Rpdj5gO1xyXG4gICAgICAgIGNvbnN0IGRlbGV0ZUJ1dHRvblRlbXBsYXRlID0gYFxyXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgYmFzaWMgaWNvbiBidXR0b25zIGFjdGlvbi1idXR0b25zIHRpbnlcIj5cclxuICAgICAgICAgICAgICAgIDxhIGhyZWY9XCIjXCIgZGF0YS12YWx1ZT1cIiR7ZGF0YS5EVF9Sb3dJZH1cIiBjbGFzcz1cInVpIGRlbGV0ZSBidXR0b25cIj5cclxuICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cIiR7YnRuRGVsZXRlQ29sb3J9XCI+PC9pPlxyXG4gICAgICAgICAgICAgICAgPC9hPlxyXG4gICAgICAgICAgICA8L2Rpdj5gO1xyXG5cclxuICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMCkuaHRtbCgnPGkgY2xhc3M9XCJ1aSB1c2VyIGNpcmNsZSBpY29uXCI+PC9pPicpO1xyXG4gICAgICAgICQoJ3RkJywgcm93KS5lcSgxKS5odG1sKG5hbWVUZW1wbGF0ZSk7XHJcbiAgICAgICAgJCgndGQnLCByb3cpLmVxKDIpLmh0bWwobnVtYmVyVGVtcGxhdGUpO1xyXG4gICAgICAgICQoJ3RkJywgcm93KS5lcSgzKS5odG1sKGRlbGV0ZUJ1dHRvblRlbXBsYXRlKTtcclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBBcHBseSBhIHNlYXJjaCBmaWx0ZXIgdG8gdGhlIERhdGFUYWJsZS5cclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIFRoZSBzZWFyY2ggdGV4dCB0byBhcHBseS5cclxuICAgICAqL1xyXG4gICAgYXBwbHlGaWx0ZXIodGV4dCkge1xyXG4gICAgICAgIGNvbnN0ICRjaGFuZ2VkRmllbGRzID0gJCgnLmNoYW5nZWQtZmllbGQnKTtcclxuICAgICAgICAkY2hhbmdlZEZpZWxkcy5lYWNoKChfLCBvYmopID0+IHtcclxuICAgICAgICAgICAgY29uc3QgJGlucHV0ID0gJChvYmopLmZpbmQoJ2lucHV0Jyk7XHJcbiAgICAgICAgICAgICRpbnB1dC52YWwoJGlucHV0LmRhdGEoJ3ZhbHVlJykpO1xyXG4gICAgICAgICAgICAkaW5wdXQuYXR0cigncmVhZG9ubHknLCB0cnVlKTtcclxuICAgICAgICAgICAgJChvYmopLnJlbW92ZUNsYXNzKCdjaGFuZ2VkLWZpZWxkJykuYWRkQ2xhc3MoJ3RyYW5zcGFyZW50Jyk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgdGhpcy5kYXRhVGFibGUuc2VhcmNoKHRleHQpLmRyYXcoKTtcclxuICAgICAgICB0aGlzLiRnbG9iYWxTZWFyY2guY2xvc2VzdCgnZGl2JykuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBJbml0aWFsaXplIGlucHV0IG1hc2tzIGZvciBwaG9uZSBudW1iZXIgZmllbGRzLlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSAkZWwgLSBUaGUgaW5wdXQgZWxlbWVudHMgdG8gYXBwbHkgbWFza3MgdG8uXHJcbiAgICAgKi9cclxuICAgIGluaXRpYWxpemVJbnB1dG1hc2soJGVsKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuJGRpc2FibGVJbnB1dE1hc2tUb2dnbGUuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkgcmV0dXJuO1xyXG5cclxuICAgICAgICBpZiAodGhpcy4kbWFza0xpc3QgPT09IG51bGwpIHtcclxuICAgICAgICAgICAgdGhpcy4kbWFza0xpc3QgPSAkLm1hc2tzU29ydChJbnB1dE1hc2tQYXR0ZXJucywgWycjJ10sIC9bMC05XXwjLywgJ21hc2snKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgICRlbC5pbnB1dG1hc2tzKHtcclxuICAgICAgICAgICAgaW5wdXRtYXNrOiB7XHJcbiAgICAgICAgICAgICAgICBkZWZpbml0aW9uczoge1xyXG4gICAgICAgICAgICAgICAgICAgICcjJzogeyB2YWxpZGF0b3I6ICdbMC05XScsIGNhcmRpbmFsaXR5OiAxIH0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgc2hvd01hc2tPbkhvdmVyOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIG9uQmVmb3JlUGFzdGU6IHRoaXMuY2JPbk51bWJlckJlZm9yZVBhc3RlLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBtYXRjaDogL1swLTldLyxcclxuICAgICAgICAgICAgcmVwbGFjZTogJzknLFxyXG4gICAgICAgICAgICBsaXN0OiB0aGlzLiRtYXNrTGlzdCxcclxuICAgICAgICAgICAgbGlzdEtleTogJ21hc2snLFxyXG4gICAgICAgIH0pO1xyXG4gICAgfSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIFNlbmQgdGhlIGNoYW5nZXMgZm9yIGEgc3BlY2lmaWMgcm93IHRvIHRoZSBzZXJ2ZXIuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHJlY29yZElkIC0gVGhlIElEIG9mIHRoZSByZWNvcmQgdG8gc2F2ZS5cclxuICAgICAqL1xyXG4gICAgc2VuZENoYW5nZXNUb1NlcnZlcihyZWNvcmRJZCkge1xyXG4gICAgICAgIGNvbnN0IGNhbGxlcklkID0gJChgdHIjJHtyZWNvcmRJZH0gLmNhbGxlci1pZC1pbnB1dGApLnZhbCgpO1xyXG4gICAgICAgIGNvbnN0IG51bWJlcklucHV0VmFsID0gJChgdHIjJHtyZWNvcmRJZH0gLm51bWJlci1pbnB1dGApLnZhbCgpO1xyXG5cclxuICAgICAgICBpZiAoIWNhbGxlcklkIHx8ICFudW1iZXJJbnB1dFZhbCkgcmV0dXJuO1xyXG5cclxuICAgICAgICBjb25zdCBkYXRhID0ge1xyXG4gICAgICAgICAgICBjYWxsX2lkOiBjYWxsZXJJZCxcclxuICAgICAgICAgICAgbnVtYmVyX3JlcDogbnVtYmVySW5wdXRWYWwsXHJcbiAgICAgICAgICAgIGlkOiByZWNvcmRJZFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHRoaXMuZGlzcGxheVNhdmluZ0ljb24ocmVjb3JkSWQpO1xyXG5cclxuICAgICAgICAkLmFwaSh7XHJcbiAgICAgICAgICAgIHVybDogdGhpcy5zYXZlUmVjb3JkQUpBWFVybCxcclxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXHJcbiAgICAgICAgICAgIG9uOiAnbm93JyxcclxuICAgICAgICAgICAgZGF0YSxcclxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IChyZXNwb25zZSkgPT4gcmVzcG9uc2UgJiYgcmVzcG9uc2Uuc3VjY2VzcyA9PT0gdHJ1ZSxcclxuICAgICAgICAgICAgb25TdWNjZXNzOiAocmVzcG9uc2UpID0+IHRoaXMub25TYXZlU3VjY2VzcyhyZXNwb25zZSwgcmVjb3JkSWQpLFxyXG4gICAgICAgICAgICBvbkZhaWx1cmU6IChyZXNwb25zZSkgPT4gVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2UpLFxyXG4gICAgICAgICAgICBvbkVycm9yOiAoZXJyb3JNZXNzYWdlLCBlbGVtZW50LCB4aHIpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmICh4aHIuc3RhdHVzID09PSA0MDMpIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9pbmRleGA7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgfSk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogRGlzcGxheSBhIHNhdmluZyBpY29uIGZvciB0aGUgZ2l2ZW4gcmVjb3JkLlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSByZWNvcmRJZCAtIFRoZSBJRCBvZiB0aGUgcmVjb3JkIGJlaW5nIHNhdmVkLlxyXG4gICAgICovXHJcbiAgICBkaXNwbGF5U2F2aW5nSWNvbihyZWNvcmRJZCkge1xyXG4gICAgICAgICQoYHRyIyR7cmVjb3JkSWR9IC51c2VyLmNpcmNsZWApXHJcbiAgICAgICAgICAgIC5yZW1vdmVDbGFzcygndXNlciBjaXJjbGUnKVxyXG4gICAgICAgICAgICAuYWRkQ2xhc3MoJ3NwaW5uZXIgbG9hZGluZycpO1xyXG4gICAgfSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIEhhbmRsZSBzdWNjZXNzZnVsIHNhdmluZyBvZiBhIHJlY29yZC5cclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgc2VydmVyIHJlc3BvbnNlLlxyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHJlY29yZElkIC0gVGhlIElEIG9mIHRoZSByZWNvcmQgdGhhdCB3YXMgc2F2ZWQuXHJcbiAgICAgKi9cclxuICAgIG9uU2F2ZVN1Y2Nlc3MocmVzcG9uc2UsIHJlY29yZElkKSB7XHJcbiAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEpIHtcclxuICAgICAgICAgICAgbGV0IG9sZElkID0gcmVzcG9uc2UuZGF0YS5vbGRJZCB8fCByZWNvcmRJZDtcclxuICAgICAgICAgICAgJChgdHIjJHtvbGRJZH0gaW5wdXRgKS5hdHRyKCdyZWFkb25seScsIHRydWUpO1xyXG4gICAgICAgICAgICAkKGB0ciMke29sZElkfSBhLmRlbGV0ZS5idXR0b25gKS5hdHRyKCdkYXRhLXZhbHVlJywgcmVzcG9uc2UuZGF0YS5uZXdJZCk7XHJcbiAgICAgICAgICAgICQoYHRyIyR7b2xkSWR9IGRpdmApLnJlbW92ZUNsYXNzKCdjaGFuZ2VkLWZpZWxkIGxvYWRpbmcnKS5hZGRDbGFzcygndHJhbnNwYXJlbnQnKTtcclxuICAgICAgICAgICAgJChgdHIjJHtvbGRJZH0gLnNwaW5uZXIubG9hZGluZ2ApLmFkZENsYXNzKCd1c2VyIGNpcmNsZScpLnJlbW92ZUNsYXNzKCdzcGlubmVyIGxvYWRpbmcnKTtcclxuICAgICAgICAgICAgaWYgKG9sZElkICE9PSByZXNwb25zZS5kYXRhLm5ld0lkKSB7XHJcbiAgICAgICAgICAgICAgICAkKGB0ciMke29sZElkfWApLmF0dHIoJ2lkJywgcmVzcG9uc2UuZGF0YS5uZXdJZCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogRGVsZXRlIGEgcm93IGZyb20gdGhlIHBob25lYm9vayB0YWJsZS5cclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0ge2pRdWVyeX0gJHRhcmdldCAtIFRoZSBkZWxldGUgYnV0dG9uIGVsZW1lbnQuXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaWQgLSBUaGUgSUQgb2YgdGhlIHJlY29yZCB0byBkZWxldGUuXHJcbiAgICAgKi9cclxuICAgIGRlbGV0ZVJvdygkdGFyZ2V0LCBpZCkge1xyXG4gICAgICAgIGlmIChpZCA9PT0gJ25ldycpIHtcclxuICAgICAgICAgICAgJHRhcmdldC5jbG9zZXN0KCd0cicpLnJlbW92ZSgpO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAkLmFwaSh7XHJcbiAgICAgICAgICAgIHVybDogYCR7dGhpcy5kZWxldGVSZWNvcmRBSkFYVXJsfS8ke2lkfWAsXHJcbiAgICAgICAgICAgIG9uOiAnbm93JyxcclxuICAgICAgICAgICAgb25TdWNjZXNzOiAocmVzcG9uc2UpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5zdWNjZXNzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJHRhcmdldC5jbG9zZXN0KCd0cicpLnJlbW92ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLiRyZWNvcmRzVGFibGUuZmluZCgndGJvZHkgPiB0cicpLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLiRyZWNvcmRzVGFibGUuZmluZCgndGJvZHknKS5hcHBlbmQoJzx0ciBjbGFzcz1cIm9kZFwiPjwvdHI+Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgIH0pO1xyXG4gICAgfSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIENsZWFuIG51bWJlciBiZWZvcmUgcGFzdGluZy5cclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFzdGVkVmFsdWUgLSBUaGUgcGFzdGVkIHBob25lIG51bWJlci5cclxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSBjbGVhbmVkIG51bWJlci5cclxuICAgICAqL1xyXG4gICAgY2JPbk51bWJlckJlZm9yZVBhc3RlKHBhc3RlZFZhbHVlKSB7XHJcbiAgICAgICAgcmV0dXJuIHBhc3RlZFZhbHVlLnJlcGxhY2UoL1xcRCsvZywgJycpO1xyXG4gICAgfSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIENhbGN1bGF0ZSB0aGUgbnVtYmVyIG9mIHJvd3MgdGhhdCBjYW4gZml0IG9uIGEgcGFnZSBiYXNlZCBvbiB3aW5kb3cgaGVpZ2h0LlxyXG4gICAgICpcclxuICAgICAqIEByZXR1cm5zIHtudW1iZXJ9IFRoZSBjYWxjdWxhdGVkIG51bWJlciBvZiByb3dzLlxyXG4gICAgICovXHJcbiAgICBjYWxjdWxhdGVQYWdlTGVuZ3RoKCkge1xyXG4gICAgICAgIC8vIENhbGN1bGF0ZSByb3cgaGVpZ2h0XHJcbiAgICAgICAgbGV0IHJvd0hlaWdodCA9IHRoaXMuJHJlY29yZHNUYWJsZS5maW5kKCd0cicpLmZpcnN0KCkub3V0ZXJIZWlnaHQoKTtcclxuXHJcbiAgICAgICAgLy8gQ2FsY3VsYXRlIHdpbmRvdyBoZWlnaHQgYW5kIGF2YWlsYWJsZSBzcGFjZSBmb3IgdGFibGVcclxuICAgICAgICBjb25zdCB3aW5kb3dIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XHJcbiAgICAgICAgY29uc3QgaGVhZGVyRm9vdGVySGVpZ2h0ID0gNTUwOyAvLyBFc3RpbWF0ZSBoZWlnaHQgZm9yIGhlYWRlciwgZm9vdGVyLCBhbmQgb3RoZXIgZWxlbWVudHNcclxuXHJcbiAgICAgICAgLy8gQ2FsY3VsYXRlIG5ldyBwYWdlIGxlbmd0aFxyXG4gICAgICAgIHJldHVybiBNYXRoLm1heChNYXRoLmZsb29yKCh3aW5kb3dIZWlnaHQgLSBoZWFkZXJGb290ZXJIZWlnaHQpIC8gcm93SGVpZ2h0KSwgNSk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogR2V0IHRoZSB2YWx1ZSBvZiBhIHF1ZXJ5IHBhcmFtZXRlciBmcm9tIHRoZSBVUkwuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtIC0gVGhlIG5hbWUgb2YgdGhlIHF1ZXJ5IHBhcmFtZXRlciB0byByZXRyaWV2ZS5cclxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd8bnVsbH0gVGhlIHZhbHVlIG9mIHRoZSBxdWVyeSBwYXJhbWV0ZXIsIG9yIG51bGwgaWYgbm90IGZvdW5kLlxyXG4gICAgICovXHJcbiAgICBnZXRRdWVyeVBhcmFtKHBhcmFtKSB7XHJcbiAgICAgICAgY29uc3QgdXJsUGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcclxuICAgICAgICByZXR1cm4gdXJsUGFyYW1zLmdldChwYXJhbSk7XHJcbiAgICB9LFxyXG59O1xyXG5cclxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xyXG4gICAgTW9kdWxlUGhvbmVCb29rRFQuaW5pdGlhbGl6ZSgpO1xyXG59KTtcclxuIl0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUEsSUFBTUEsaUJBQWlCLEdBQUc7RUFFdEI7QUFDSjtBQUNBO0FBQ0E7RUFDSUMsYUFBYSxFQUFFQyxDQUFDLENBQUMsZ0JBQWdCLENBQUM7RUFFbEM7QUFDSjtBQUNBO0FBQ0E7RUFDSUMsbUJBQW1CLEVBQUNELENBQUMsQ0FBQyxxQkFBcUIsQ0FBQztFQUU1QztBQUNKO0FBQ0E7QUFDQTtFQUNJRSxzQkFBc0IsRUFBRUYsQ0FBQyxDQUFDLDBCQUEwQixDQUFDO0VBR3JEO0FBQ0o7QUFDQTtBQUNBO0VBQ0lHLFNBQVMsRUFBRSxDQUFDLENBQUM7RUFFYjtBQUNKO0FBQ0E7QUFDQTtFQUNJQyxLQUFLLEVBQUVKLENBQUMsQ0FBQyxNQUFNLENBQUM7RUFFaEI7RUFDQUssdUJBQXVCLEVBQUVMLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQztFQUVqRDtBQUNKO0FBQ0E7QUFDQTtFQUNJTSxhQUFhLEVBQUVOLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQztFQUVwQztBQUNKO0FBQ0E7QUFDQTtFQUNJTyxhQUFhLEVBQUVQLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQztFQUVuQztBQUNKO0FBQ0E7QUFDQTtFQUNJUSxnQkFBZ0IsRUFBRSxvQkFBb0I7RUFFdEM7QUFDSjtBQUNBO0FBQ0E7RUFDSUMsU0FBUyxFQUFFLElBQUk7RUFFZjtFQUNBQyxvQkFBb0IsS0FBQUMsTUFBQSxDQUFLQyxhQUFhLG9DQUFpQztFQUV2RUMsbUJBQW1CLEtBQUFGLE1BQUEsQ0FBS0MsYUFBYSw2QkFBMEI7RUFFL0RFLGlCQUFpQixLQUFBSCxNQUFBLENBQUtDLGFBQWEsMkJBQXdCO0VBRTNEO0FBQ0o7QUFDQTtBQUNBO0VBQ0lHLFVBQVUsV0FBVkEsVUFBVUEsQ0FBQSxFQUFHO0lBQ1QsSUFBSSxDQUFDQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBQ3ZCLElBQUksQ0FBQ0MsbUJBQW1CLENBQUMsQ0FBQztJQUMxQixJQUFJLENBQUNDLHdCQUF3QixDQUFDLENBQUM7RUFDbkMsQ0FBQztFQUVEO0FBQ0o7QUFDQTtBQUNBO0VBQ0lGLGdCQUFnQixXQUFoQkEsZ0JBQWdCQSxDQUFBLEVBQUc7SUFBQSxJQUFBRyxLQUFBO0lBQ2YsSUFBSSxDQUFDcEIsYUFBYSxDQUFDcUIsRUFBRSxDQUFDLE9BQU8sRUFBRSxVQUFDQyxDQUFDLEVBQUs7TUFDbEMsSUFBTUMsVUFBVSxHQUFHSCxLQUFJLENBQUNwQixhQUFhLENBQUN3QixHQUFHLENBQUMsQ0FBQyxDQUFDQyxJQUFJLENBQUMsQ0FBQztNQUNsRCxJQUFJSCxDQUFDLENBQUNJLE9BQU8sS0FBSyxFQUFFLElBQUlKLENBQUMsQ0FBQ0ksT0FBTyxLQUFLLENBQUMsSUFBSUgsVUFBVSxDQUFDSSxNQUFNLEtBQUssQ0FBQyxFQUFFO1FBQ2hFUCxLQUFJLENBQUNRLFdBQVcsQ0FBQ0wsVUFBVSxDQUFDO01BQ2hDO0lBQ0osQ0FBQyxDQUFDO0VBQ04sQ0FBQztFQUVEO0FBQ0o7QUFDQTtBQUNBO0VBQ0lKLHdCQUF3QixXQUF4QkEsd0JBQXdCQSxDQUFBLEVBQUc7SUFBQSxJQUFBVSxNQUFBO0lBRXZCO0lBQ0EsSUFBSSxDQUFDeEIsS0FBSyxDQUFDZ0IsRUFBRSxDQUFDLFNBQVMsRUFBRSxpQ0FBaUMsRUFBRSxVQUFDQyxDQUFDLEVBQUs7TUFDL0RPLE1BQUksQ0FBQ0MsWUFBWSxDQUFDN0IsQ0FBQyxDQUFDcUIsQ0FBQyxDQUFDUyxNQUFNLENBQUMsQ0FBQztJQUNsQyxDQUFDLENBQUM7O0lBRUY7SUFDQSxJQUFJLENBQUMxQixLQUFLLENBQUNnQixFQUFFLENBQUMsVUFBVSxFQUFFLGlDQUFpQyxFQUFFLFlBQU07TUFDL0RRLE1BQUksQ0FBQ0cscUJBQXFCLENBQUMsQ0FBQztJQUNoQyxDQUFDLENBQUM7O0lBRUY7SUFDQSxJQUFJLENBQUMzQixLQUFLLENBQUNnQixFQUFFLENBQUMsT0FBTyxFQUFFLFVBQVUsRUFBRSxVQUFDQyxDQUFDLEVBQUs7TUFDdENBLENBQUMsQ0FBQ1csY0FBYyxDQUFDLENBQUM7TUFDbEIsSUFBTUMsRUFBRSxHQUFHakMsQ0FBQyxDQUFDcUIsQ0FBQyxDQUFDUyxNQUFNLENBQUMsQ0FBQ0ksT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDQyxJQUFJLENBQUMsT0FBTyxDQUFDO01BQ2pEUCxNQUFJLENBQUNRLFNBQVMsQ0FBQ3BDLENBQUMsQ0FBQ3FCLENBQUMsQ0FBQ1MsTUFBTSxDQUFDLEVBQUVHLEVBQUUsQ0FBQztJQUNuQyxDQUFDLENBQUM7O0lBRUY7SUFDQWpDLENBQUMsQ0FBQ3FDLFFBQVEsQ0FBQyxDQUFDakIsRUFBRSxDQUFDLFNBQVMsRUFBRSxVQUFDQyxDQUFDLEVBQUs7TUFDN0IsSUFBSUEsQ0FBQyxDQUFDaUIsR0FBRyxLQUFLLE9BQU8sSUFBS2pCLENBQUMsQ0FBQ2lCLEdBQUcsS0FBSyxLQUFLLElBQUksQ0FBQ3RDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQ3VDLFFBQVEsQ0FBQyxlQUFlLENBQUUsRUFBRTtRQUNsRlgsTUFBSSxDQUFDRyxxQkFBcUIsQ0FBQyxDQUFDO01BQ2hDO0lBQ0osQ0FBQyxDQUFDOztJQUVGO0lBQ0EsSUFBSSxDQUFDeEIsYUFBYSxDQUFDYSxFQUFFLENBQUMsT0FBTyxFQUFFLFVBQUNDLENBQUMsRUFBSztNQUNsQ0EsQ0FBQyxDQUFDVyxjQUFjLENBQUMsQ0FBQztNQUNsQkosTUFBSSxDQUFDWSxTQUFTLENBQUMsQ0FBQztJQUNwQixDQUFDLENBQUM7O0lBRUY7SUFDQSxJQUFJLENBQUN2QyxtQkFBbUIsQ0FBQ3dDLFFBQVEsQ0FBQztNQUM5QkMsUUFBUSxXQUFSQSxRQUFRQSxDQUFDQyxVQUFVLEVBQUU7UUFDakIsSUFBSUEsVUFBVSxLQUFHLE1BQU0sRUFBQztVQUNwQkEsVUFBVSxHQUFHLElBQUksQ0FBQ0MsbUJBQW1CLENBQUMsQ0FBQztVQUN2Q0MsWUFBWSxDQUFDQyxVQUFVLENBQUMsMEJBQTBCLENBQUM7UUFDdkQsQ0FBQyxNQUFNO1VBQ0hELFlBQVksQ0FBQ0UsT0FBTyxDQUFDLDBCQUEwQixFQUFFSixVQUFVLENBQUM7UUFDaEU7UUFDQTdDLGlCQUFpQixDQUFDSyxTQUFTLENBQUM2QyxJQUFJLENBQUNDLEdBQUcsQ0FBQ04sVUFBVSxDQUFDLENBQUNPLElBQUksQ0FBQyxDQUFDO01BQzNEO0lBQ0osQ0FBQyxDQUFDOztJQUVGO0lBQ0EsSUFBSSxDQUFDakQsbUJBQW1CLENBQUNtQixFQUFFLENBQUMsT0FBTyxFQUFFLFVBQVMrQixLQUFLLEVBQUU7TUFDakRBLEtBQUssQ0FBQ0MsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzdCLENBQUMsQ0FBQztFQUNOLENBQUM7RUFHRDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0VBQ0l2QixZQUFZLFdBQVpBLFlBQVlBLENBQUN3QixNQUFNLEVBQUU7SUFDakJBLE1BQU0sQ0FBQ0MsVUFBVSxDQUFDLE1BQU0sQ0FBQztJQUN6QkQsTUFBTSxDQUFDbkIsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDcUIsV0FBVyxDQUFDLGFBQWEsQ0FBQyxDQUFDQyxRQUFRLENBQUMsZUFBZSxDQUFDO0lBQzFFSCxNQUFNLENBQUNJLElBQUksQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDO0VBQ2xDLENBQUM7RUFFRDtBQUNKO0FBQ0E7QUFDQTtFQUNJMUIscUJBQXFCLFdBQXJCQSxxQkFBcUJBLENBQUEsRUFBRztJQUFBLElBQUEyQixNQUFBO0lBQ3BCLElBQU1DLEtBQUssR0FBRzNELENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDa0MsT0FBTyxDQUFDLElBQUksQ0FBQztJQUMvQ3lCLEtBQUssQ0FBQ0MsSUFBSSxDQUFDLFVBQUNDLENBQUMsRUFBRUMsR0FBRyxFQUFLO01BQ25CLElBQU1DLEtBQUssR0FBRy9ELENBQUMsQ0FBQzhELEdBQUcsQ0FBQyxDQUFDTCxJQUFJLENBQUMsSUFBSSxDQUFDO01BQy9CLElBQUlNLEtBQUssS0FBS0MsU0FBUyxFQUFFO1FBQ3JCTixNQUFJLENBQUNPLG1CQUFtQixDQUFDRixLQUFLLENBQUM7TUFDbkM7SUFDSixDQUFDLENBQUM7RUFDTixDQUFDO0VBRUQ7QUFDSjtBQUNBO0FBQ0E7RUFDSXZCLFNBQVMsV0FBVEEsU0FBU0EsQ0FBQSxFQUFHO0lBQ1IsSUFBTTBCLFNBQVMsR0FBR2xFLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQztJQUN4QyxJQUFJa0UsU0FBUyxDQUFDeEMsTUFBTSxFQUFFd0MsU0FBUyxDQUFDQyxNQUFNLENBQUMsQ0FBQztJQUV4QyxJQUFJLENBQUNwQyxxQkFBcUIsQ0FBQyxDQUFDO0lBRTVCLElBQU1xQyxLQUFLLFNBQUF6RCxNQUFBLENBQVMwRCxJQUFJLENBQUNDLEtBQUssQ0FBQ0QsSUFBSSxDQUFDRSxNQUFNLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFFO0lBQ3JELElBQU1DLGNBQWMsNkJBQUE3RCxNQUFBLENBQ055RCxLQUFLLGdwQkFTVDtJQUVWLElBQUksQ0FBQzlELGFBQWEsQ0FBQ21FLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQ0MsT0FBTyxDQUFDRixjQUFjLENBQUM7SUFDeEQsSUFBTUcsT0FBTyxHQUFHM0UsQ0FBQyxLQUFBVyxNQUFBLENBQUt5RCxLQUFLLENBQUUsQ0FBQztJQUM5Qk8sT0FBTyxDQUFDRixJQUFJLENBQUMsT0FBTyxDQUFDLENBQUNuQixVQUFVLENBQUMsTUFBTSxDQUFDO0lBQ3hDcUIsT0FBTyxDQUFDRixJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQ0csS0FBSyxDQUFDLENBQUM7SUFDeEMsSUFBSSxDQUFDQyxtQkFBbUIsQ0FBQ0YsT0FBTyxDQUFDRixJQUFJLENBQUMsZUFBZSxDQUFDLENBQUM7RUFDM0QsQ0FBQztFQUVEO0FBQ0o7QUFDQTtFQUNJeEQsbUJBQW1CLFdBQW5CQSxtQkFBbUJBLENBQUEsRUFBRztJQUFBLElBQUE2RCxNQUFBO0lBRWxCO0lBQ0EsSUFBTUMsZUFBZSxHQUFHbEMsWUFBWSxDQUFDbUMsT0FBTyxDQUFDLDBCQUEwQixDQUFDO0lBQ3hFLElBQU1yQyxVQUFVLEdBQUdvQyxlQUFlLEdBQUdBLGVBQWUsR0FBRyxJQUFJLENBQUNuQyxtQkFBbUIsQ0FBQyxDQUFDO0lBRWpGLElBQUksQ0FBQ3RDLGFBQWEsQ0FBQ0gsU0FBUyxDQUFDO01BQ3pCOEUsTUFBTSxFQUFFO1FBQUVBLE1BQU0sRUFBRSxJQUFJLENBQUNsRixhQUFhLENBQUN3QixHQUFHLENBQUM7TUFBRSxDQUFDO01BQzVDMkQsVUFBVSxFQUFFLElBQUk7TUFDaEJDLFVBQVUsRUFBRSxJQUFJO01BQ2hCQyxJQUFJLEVBQUU7UUFDRkMsR0FBRyxFQUFFLElBQUksQ0FBQzNFLG9CQUFvQjtRQUM5QjRFLElBQUksRUFBRSxNQUFNO1FBQ1pDLE9BQU8sRUFBRTtNQUNiLENBQUM7TUFDREMsT0FBTyxFQUFFLENBQ0w7UUFBRXJELElBQUksRUFBRTtNQUFLLENBQUMsRUFDZDtRQUFFQSxJQUFJLEVBQUU7TUFBVSxDQUFDLEVBQ25CO1FBQUVBLElBQUksRUFBRTtNQUFTLENBQUMsRUFDbEI7UUFBRUEsSUFBSSxFQUFFO01BQUssQ0FBQyxDQUNqQjtNQUNEc0QsTUFBTSxFQUFFLElBQUk7TUFDWjlDLFVBQVUsRUFBRUEsVUFBVTtNQUN0QitDLFdBQVcsRUFBRSxJQUFJO01BQ2pCQyxJQUFJLEVBQUUsTUFBTTtNQUNaQyxRQUFRLEVBQUUsS0FBSztNQUNmQyxVQUFVLEVBQUUsU0FBWkEsVUFBVUEsQ0FBRy9CLEdBQUcsRUFBRTNCLElBQUksRUFBSztRQUN2QjJDLE1BQUksQ0FBQ2dCLGdCQUFnQixDQUFDaEMsR0FBRyxFQUFFM0IsSUFBSSxDQUFDO01BQ3BDLENBQUM7TUFDRDRELFlBQVksRUFBRSxTQUFkQSxZQUFZQSxDQUFBLEVBQVE7UUFDaEJqQixNQUFJLENBQUNELG1CQUFtQixDQUFDN0UsQ0FBQyxDQUFDOEUsTUFBSSxDQUFDdEUsZ0JBQWdCLENBQUMsQ0FBQztNQUN0RCxDQUFDO01BQ0R3RixRQUFRLEVBQUVDLG9CQUFvQixDQUFDQztJQUNuQyxDQUFDLENBQUM7SUFFRixJQUFJLENBQUMvRixTQUFTLEdBQUcsSUFBSSxDQUFDRyxhQUFhLENBQUM2RixTQUFTLENBQUMsQ0FBQzs7SUFHL0M7SUFDQSxJQUFJcEIsZUFBZSxFQUFFO01BQ2pCLElBQUksQ0FBQzlFLG1CQUFtQixDQUFDd0MsUUFBUSxDQUFDLFdBQVcsRUFBRXNDLGVBQWUsQ0FBQztJQUNuRTs7SUFHQTtJQUNBLElBQUlxQixtQkFBbUIsR0FBRyxJQUFJO0lBRTlCLElBQUksQ0FBQ3JHLGFBQWEsQ0FBQ3FCLEVBQUUsQ0FBQyxPQUFPLEVBQUUsVUFBQ0MsQ0FBQyxFQUFLO01BQ2xDO01BQ0FnRixZQUFZLENBQUNELG1CQUFtQixDQUFDOztNQUVqQztNQUNBQSxtQkFBbUIsR0FBR0UsVUFBVSxDQUFDLFlBQU07UUFDbkMsSUFBTUMsSUFBSSxHQUFHekIsTUFBSSxDQUFDL0UsYUFBYSxDQUFDd0IsR0FBRyxDQUFDLENBQUM7UUFDckM7UUFDQSxJQUFJRixDQUFDLENBQUNJLE9BQU8sS0FBSyxFQUFFLElBQUlKLENBQUMsQ0FBQ0ksT0FBTyxLQUFLLENBQUMsSUFBSThFLElBQUksQ0FBQzdFLE1BQU0sSUFBSSxDQUFDLEVBQUU7VUFDekRvRCxNQUFJLENBQUNuRCxXQUFXLENBQUM0RSxJQUFJLENBQUM7UUFDMUI7TUFDSixDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUNiLENBQUMsQ0FBQzs7SUFFRjtJQUNBLElBQU1DLEtBQUssR0FBRyxJQUFJLENBQUNyRyxTQUFTLENBQUNxRyxLQUFLLENBQUNDLE1BQU0sQ0FBQyxDQUFDO0lBQzNDLElBQUlELEtBQUssSUFBSUEsS0FBSyxDQUFDdkIsTUFBTSxFQUFFO01BQ3ZCLElBQUksQ0FBQ2xGLGFBQWEsQ0FBQ3dCLEdBQUcsQ0FBQ2lGLEtBQUssQ0FBQ3ZCLE1BQU0sQ0FBQ0EsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUNqRDs7SUFFQTtJQUNBLElBQU15QixXQUFXLEdBQUcsSUFBSSxDQUFDQyxhQUFhLENBQUMsUUFBUSxDQUFDOztJQUVoRDtJQUNBLElBQUlELFdBQVcsRUFBRTtNQUNiLElBQUksQ0FBQzNHLGFBQWEsQ0FBQ3dCLEdBQUcsQ0FBQ21GLFdBQVcsQ0FBQztNQUNuQyxJQUFJLENBQUMvRSxXQUFXLENBQUMrRSxXQUFXLENBQUM7SUFDakM7SUFFQSxJQUFJLENBQUN2RyxTQUFTLENBQUNpQixFQUFFLENBQUMsTUFBTSxFQUFFLFlBQU07TUFDNUIwRCxNQUFJLENBQUMvRSxhQUFhLENBQUNtQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUNxQixXQUFXLENBQUMsU0FBUyxDQUFDO0lBQzVELENBQUMsQ0FBQztFQUNOLENBQUM7RUFFRDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7RUFDSXVDLGdCQUFnQixXQUFoQkEsZ0JBQWdCQSxDQUFDaEMsR0FBRyxFQUFFM0IsSUFBSSxFQUFFO0lBQ3hCLElBQU15RSxjQUFjLEdBQUd6RSxJQUFJLENBQUMwRSxPQUFPLEdBQUcsQ0FBQyxHQUFHLGlCQUFpQixHQUFHLGdCQUFnQjtJQUM5RSxJQUFNQyxZQUFZLG1KQUFBbkcsTUFBQSxDQUUwQ3dCLElBQUksQ0FBQzRFLE9BQU8sOEJBQzdEO0lBQ1gsSUFBTUMsY0FBYywwSUFBQXJHLE1BQUEsQ0FFcUN3QixJQUFJLENBQUM4RSxNQUFNLDhCQUN6RDtJQUNYLElBQU1DLG9CQUFvQiwwSEFBQXZHLE1BQUEsQ0FFUXdCLElBQUksQ0FBQ2dGLFFBQVEscUVBQUF4RyxNQUFBLENBQ3ZCaUcsY0FBYyxzREFFM0I7SUFFWDVHLENBQUMsQ0FBQyxJQUFJLEVBQUU4RCxHQUFHLENBQUMsQ0FBQ3NELEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQ0MsSUFBSSxDQUFDLHFDQUFxQyxDQUFDO0lBQzlEckgsQ0FBQyxDQUFDLElBQUksRUFBRThELEdBQUcsQ0FBQyxDQUFDc0QsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDQyxJQUFJLENBQUNQLFlBQVksQ0FBQztJQUNyQzlHLENBQUMsQ0FBQyxJQUFJLEVBQUU4RCxHQUFHLENBQUMsQ0FBQ3NELEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQ0MsSUFBSSxDQUFDTCxjQUFjLENBQUM7SUFDdkNoSCxDQUFDLENBQUMsSUFBSSxFQUFFOEQsR0FBRyxDQUFDLENBQUNzRCxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUNDLElBQUksQ0FBQ0gsb0JBQW9CLENBQUM7RUFDakQsQ0FBQztFQUVEO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7RUFDSXZGLFdBQVcsV0FBWEEsV0FBV0EsQ0FBQzRFLElBQUksRUFBRTtJQUNkLElBQU1lLGNBQWMsR0FBR3RILENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQztJQUMxQ3NILGNBQWMsQ0FBQzFELElBQUksQ0FBQyxVQUFDQyxDQUFDLEVBQUUwRCxHQUFHLEVBQUs7TUFDNUIsSUFBTWxFLE1BQU0sR0FBR3JELENBQUMsQ0FBQ3VILEdBQUcsQ0FBQyxDQUFDOUMsSUFBSSxDQUFDLE9BQU8sQ0FBQztNQUNuQ3BCLE1BQU0sQ0FBQzlCLEdBQUcsQ0FBQzhCLE1BQU0sQ0FBQ2xCLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztNQUNoQ2tCLE1BQU0sQ0FBQ0ksSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUM7TUFDN0J6RCxDQUFDLENBQUN1SCxHQUFHLENBQUMsQ0FBQ2hFLFdBQVcsQ0FBQyxlQUFlLENBQUMsQ0FBQ0MsUUFBUSxDQUFDLGFBQWEsQ0FBQztJQUMvRCxDQUFDLENBQUM7SUFDRixJQUFJLENBQUNyRCxTQUFTLENBQUM4RSxNQUFNLENBQUNzQixJQUFJLENBQUMsQ0FBQ3JELElBQUksQ0FBQyxDQUFDO0lBQ2xDLElBQUksQ0FBQ25ELGFBQWEsQ0FBQ21DLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQ3NCLFFBQVEsQ0FBQyxTQUFTLENBQUM7RUFDekQsQ0FBQztFQUVEO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7RUFDSXFCLG1CQUFtQixXQUFuQkEsbUJBQW1CQSxDQUFDMkMsR0FBRyxFQUFFO0lBQ3JCLElBQUksSUFBSSxDQUFDbkgsdUJBQXVCLENBQUNvSCxRQUFRLENBQUMsWUFBWSxDQUFDLEVBQUU7SUFFekQsSUFBSSxJQUFJLENBQUNoSCxTQUFTLEtBQUssSUFBSSxFQUFFO01BQ3pCLElBQUksQ0FBQ0EsU0FBUyxHQUFHVCxDQUFDLENBQUMwSCxTQUFTLENBQUNDLGlCQUFpQixFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsU0FBUyxFQUFFLE1BQU0sQ0FBQztJQUM3RTtJQUVBSCxHQUFHLENBQUNJLFVBQVUsQ0FBQztNQUNYQyxTQUFTLEVBQUU7UUFDUEMsV0FBVyxFQUFFO1VBQ1QsR0FBRyxFQUFFO1lBQUVDLFNBQVMsRUFBRSxPQUFPO1lBQUVDLFdBQVcsRUFBRTtVQUFFO1FBQzlDLENBQUM7UUFDREMsZUFBZSxFQUFFLEtBQUs7UUFDdEJDLGFBQWEsRUFBRSxJQUFJLENBQUNDO01BQ3hCLENBQUM7TUFDREMsS0FBSyxFQUFFLE9BQU87TUFDZEMsT0FBTyxFQUFFLEdBQUc7TUFDWkMsSUFBSSxFQUFFLElBQUksQ0FBQzdILFNBQVM7TUFDcEI4SCxPQUFPLEVBQUU7SUFDYixDQUFDLENBQUM7RUFDTixDQUFDO0VBRUQ7QUFDSjtBQUNBO0FBQ0E7QUFDQTtFQUNJdEUsbUJBQW1CLFdBQW5CQSxtQkFBbUJBLENBQUN1RSxRQUFRLEVBQUU7SUFBQSxJQUFBQyxNQUFBO0lBQzFCLElBQU1DLFFBQVEsR0FBRzFJLENBQUMsT0FBQVcsTUFBQSxDQUFPNkgsUUFBUSxzQkFBbUIsQ0FBQyxDQUFDakgsR0FBRyxDQUFDLENBQUM7SUFDM0QsSUFBTW9ILGNBQWMsR0FBRzNJLENBQUMsT0FBQVcsTUFBQSxDQUFPNkgsUUFBUSxtQkFBZ0IsQ0FBQyxDQUFDakgsR0FBRyxDQUFDLENBQUM7SUFFOUQsSUFBSSxDQUFDbUgsUUFBUSxJQUFJLENBQUNDLGNBQWMsRUFBRTtJQUVsQyxJQUFNeEcsSUFBSSxHQUFHO01BQ1Q0RSxPQUFPLEVBQUUyQixRQUFRO01BQ2pCRSxVQUFVLEVBQUVELGNBQWM7TUFDMUIxRyxFQUFFLEVBQUV1RztJQUNSLENBQUM7SUFFRCxJQUFJLENBQUNLLGlCQUFpQixDQUFDTCxRQUFRLENBQUM7SUFFaEN4SSxDQUFDLENBQUM4SSxHQUFHLENBQUM7TUFDRnpELEdBQUcsRUFBRSxJQUFJLENBQUN2RSxpQkFBaUI7TUFDM0JpSSxNQUFNLEVBQUUsTUFBTTtNQUNkM0gsRUFBRSxFQUFFLEtBQUs7TUFDVGUsSUFBSSxFQUFKQSxJQUFJO01BQ0o2RyxXQUFXLEVBQUUsU0FBYkEsV0FBV0EsQ0FBR0MsUUFBUTtRQUFBLE9BQUtBLFFBQVEsSUFBSUEsUUFBUSxDQUFDQyxPQUFPLEtBQUssSUFBSTtNQUFBO01BQ2hFQyxTQUFTLEVBQUUsU0FBWEEsU0FBU0EsQ0FBR0YsUUFBUTtRQUFBLE9BQUtSLE1BQUksQ0FBQ1csYUFBYSxDQUFDSCxRQUFRLEVBQUVULFFBQVEsQ0FBQztNQUFBO01BQy9EYSxTQUFTLEVBQUUsU0FBWEEsU0FBU0EsQ0FBR0osUUFBUTtRQUFBLE9BQUtLLFdBQVcsQ0FBQ0MsZUFBZSxDQUFDTixRQUFRLENBQUNPLE9BQU8sQ0FBQztNQUFBO01BQ3RFQyxPQUFPLEVBQUUsU0FBVEEsT0FBT0EsQ0FBR0MsWUFBWSxFQUFFQyxPQUFPLEVBQUVDLEdBQUcsRUFBSztRQUNyQyxJQUFJQSxHQUFHLENBQUNDLE1BQU0sS0FBSyxHQUFHLEVBQUVDLE1BQU0sQ0FBQ0MsUUFBUSxNQUFBcEosTUFBQSxDQUFNQyxhQUFhLGtCQUFlO01BQzdFO0lBQ0osQ0FBQyxDQUFDO0VBQ04sQ0FBQztFQUVEO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7RUFDSWlJLGlCQUFpQixXQUFqQkEsaUJBQWlCQSxDQUFDTCxRQUFRLEVBQUU7SUFDeEJ4SSxDQUFDLE9BQUFXLE1BQUEsQ0FBTzZILFFBQVEsa0JBQWUsQ0FBQyxDQUMzQmpGLFdBQVcsQ0FBQyxhQUFhLENBQUMsQ0FDMUJDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQztFQUNwQyxDQUFDO0VBRUQ7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0VBQ0k0RixhQUFhLFdBQWJBLGFBQWFBLENBQUNILFFBQVEsRUFBRVQsUUFBUSxFQUFFO0lBQzlCLElBQUlTLFFBQVEsQ0FBQzlHLElBQUksRUFBRTtNQUNmLElBQUk2SCxLQUFLLEdBQUdmLFFBQVEsQ0FBQzlHLElBQUksQ0FBQzZILEtBQUssSUFBSXhCLFFBQVE7TUFDM0N4SSxDQUFDLE9BQUFXLE1BQUEsQ0FBT3FKLEtBQUssV0FBUSxDQUFDLENBQUN2RyxJQUFJLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQztNQUM3Q3pELENBQUMsT0FBQVcsTUFBQSxDQUFPcUosS0FBSyxxQkFBa0IsQ0FBQyxDQUFDdkcsSUFBSSxDQUFDLFlBQVksRUFBRXdGLFFBQVEsQ0FBQzlHLElBQUksQ0FBQ2lDLEtBQUssQ0FBQztNQUN4RXBFLENBQUMsT0FBQVcsTUFBQSxDQUFPcUosS0FBSyxTQUFNLENBQUMsQ0FBQ3pHLFdBQVcsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDQyxRQUFRLENBQUMsYUFBYSxDQUFDO01BQ2pGeEQsQ0FBQyxPQUFBVyxNQUFBLENBQU9xSixLQUFLLHNCQUFtQixDQUFDLENBQUN4RyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUNELFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQztNQUN4RixJQUFJeUcsS0FBSyxLQUFLZixRQUFRLENBQUM5RyxJQUFJLENBQUNpQyxLQUFLLEVBQUU7UUFDL0JwRSxDQUFDLE9BQUFXLE1BQUEsQ0FBT3FKLEtBQUssQ0FBRSxDQUFDLENBQUN2RyxJQUFJLENBQUMsSUFBSSxFQUFFd0YsUUFBUSxDQUFDOUcsSUFBSSxDQUFDaUMsS0FBSyxDQUFDO01BQ3BEO0lBQ0o7RUFDSixDQUFDO0VBRUQ7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0VBQ0loQyxTQUFTLFdBQVRBLFNBQVNBLENBQUM2SCxPQUFPLEVBQUVoSSxFQUFFLEVBQUU7SUFBQSxJQUFBaUksTUFBQTtJQUNuQixJQUFJakksRUFBRSxLQUFLLEtBQUssRUFBRTtNQUNkZ0ksT0FBTyxDQUFDL0gsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDaUMsTUFBTSxDQUFDLENBQUM7TUFDOUI7SUFDSjtJQUVBbkUsQ0FBQyxDQUFDOEksR0FBRyxDQUFDO01BQ0Z6RCxHQUFHLEtBQUExRSxNQUFBLENBQUssSUFBSSxDQUFDRSxtQkFBbUIsT0FBQUYsTUFBQSxDQUFJc0IsRUFBRSxDQUFFO01BQ3hDYixFQUFFLEVBQUUsS0FBSztNQUNUK0gsU0FBUyxFQUFFLFNBQVhBLFNBQVNBLENBQUdGLFFBQVEsRUFBSztRQUNyQixJQUFJQSxRQUFRLENBQUNDLE9BQU8sRUFBRTtVQUNsQmUsT0FBTyxDQUFDL0gsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDaUMsTUFBTSxDQUFDLENBQUM7VUFDOUIsSUFBSStGLE1BQUksQ0FBQzVKLGFBQWEsQ0FBQ21FLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQy9DLE1BQU0sS0FBSyxDQUFDLEVBQUU7WUFDcER3SSxNQUFJLENBQUM1SixhQUFhLENBQUNtRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMwRixNQUFNLENBQUMsdUJBQXVCLENBQUM7VUFDcEU7UUFDSjtNQUNKO0lBQ0osQ0FBQyxDQUFDO0VBQ04sQ0FBQztFQUVEO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtFQUNJaEMscUJBQXFCLFdBQXJCQSxxQkFBcUJBLENBQUNpQyxXQUFXLEVBQUU7SUFDL0IsT0FBT0EsV0FBVyxDQUFDL0IsT0FBTyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUM7RUFDMUMsQ0FBQztFQUVEO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7RUFDSXpGLG1CQUFtQixXQUFuQkEsbUJBQW1CQSxDQUFBLEVBQUc7SUFDbEI7SUFDQSxJQUFJeUgsU0FBUyxHQUFHLElBQUksQ0FBQy9KLGFBQWEsQ0FBQ21FLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQzZGLEtBQUssQ0FBQyxDQUFDLENBQUNDLFdBQVcsQ0FBQyxDQUFDOztJQUVuRTtJQUNBLElBQU1DLFlBQVksR0FBR1YsTUFBTSxDQUFDVyxXQUFXO0lBQ3ZDLElBQU1DLGtCQUFrQixHQUFHLEdBQUcsQ0FBQyxDQUFDOztJQUVoQztJQUNBLE9BQU9yRyxJQUFJLENBQUNzRyxHQUFHLENBQUN0RyxJQUFJLENBQUNDLEtBQUssQ0FBQyxDQUFDa0csWUFBWSxHQUFHRSxrQkFBa0IsSUFBSUwsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0VBQ25GLENBQUM7RUFFRDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7RUFDSTFELGFBQWEsV0FBYkEsYUFBYUEsQ0FBQ2lFLEtBQUssRUFBRTtJQUNqQixJQUFNQyxTQUFTLEdBQUcsSUFBSUMsZUFBZSxDQUFDaEIsTUFBTSxDQUFDQyxRQUFRLENBQUM5RSxNQUFNLENBQUM7SUFDN0QsT0FBTzRGLFNBQVMsQ0FBQ0UsR0FBRyxDQUFDSCxLQUFLLENBQUM7RUFDL0I7QUFDSixDQUFDO0FBRUQ1SyxDQUFDLENBQUNxQyxRQUFRLENBQUMsQ0FBQzJJLEtBQUssQ0FBQyxZQUFNO0VBQ3BCbEwsaUJBQWlCLENBQUNpQixVQUFVLENBQUMsQ0FBQztBQUNsQyxDQUFDLENBQUMiLCJpZ25vcmVMaXN0IjpbXX0=