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
    var btnDeleteColor = data.created > 0 ? "blue" : "red";
    var nameTemplate = "\n            <div class=\"ui transparent fluid input inline-edit\">\n                <input class=\"caller-id-input\" type=\"text\" value=\"".concat(data.call_id, "\" />\n            </div>");
    var numberTemplate = "\n            <div class=\"ui transparent input inline-edit\">\n                <input class=\"number-input\" type=\"text\" value=\"".concat(data.number, "\" />\n            </div>");
    var deleteButtonTemplate = "\n            <div class=\"ui basic icon buttons action-buttons tiny\">\n                <a href=\"#\" data-value=\"".concat(data.DT_RowId, "\" class=\"ui delete button\">\n                    <i class=\"icon trash ").concat(btnDeleteColor, "\"></i>\n                </a>\n            </div>");
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJNb2R1bGVQaG9uZUJvb2tEVCIsIiRnbG9iYWxTZWFyY2giLCIkIiwiJHBhZ2VMZW5ndGhTZWxlY3RvciIsIiRzZWFyY2hFeHRlbnNpb25zSW5wdXQiLCJkYXRhVGFibGUiLCIkYm9keSIsIiRkaXNhYmxlSW5wdXRNYXNrVG9nZ2xlIiwiJHJlY29yZHNUYWJsZSIsIiRhZGROZXdCdXR0b24iLCJpbnB1dE51bWJlckpRVFBMIiwiJG1hc2tMaXN0IiwiZ2V0TmV3UmVjb3Jkc0FKQVhVcmwiLCJjb25jYXQiLCJnbG9iYWxSb290VXJsIiwiZGVsZXRlUmVjb3JkQUpBWFVybCIsInNhdmVSZWNvcmRBSkFYVXJsIiwiaW5pdGlhbGl6ZSIsImluaXRpYWxpemVTZWFyY2giLCJpbml0aWFsaXplRGF0YVRhYmxlIiwiaW5pdGlhbGl6ZUV2ZW50TGlzdGVuZXJzIiwiX3RoaXMiLCJvbiIsImUiLCJzZWFyY2hUZXh0IiwidmFsIiwidHJpbSIsImtleUNvZGUiLCJsZW5ndGgiLCJhcHBseUZpbHRlciIsIl90aGlzMiIsIm9uRmllbGRGb2N1cyIsInRhcmdldCIsInNhdmVDaGFuZ2VzRm9yQWxsUm93cyIsInByZXZlbnREZWZhdWx0IiwiaWQiLCJjbG9zZXN0IiwiZGF0YSIsImRlbGV0ZVJvdyIsImRvY3VtZW50Iiwia2V5IiwiaGFzQ2xhc3MiLCJhZGROZXdSb3ciLCJkcm9wZG93biIsIm9uQ2hhbmdlIiwicGFnZUxlbmd0aCIsImNhbGN1bGF0ZVBhZ2VMZW5ndGgiLCJsb2NhbFN0b3JhZ2UiLCJyZW1vdmVJdGVtIiwic2V0SXRlbSIsInBhZ2UiLCJsZW4iLCJkcmF3IiwiZXZlbnQiLCJzdG9wUHJvcGFnYXRpb24iLCIkaW5wdXQiLCJ0cmFuc2l0aW9uIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsImF0dHIiLCJfdGhpczMiLCIkcm93cyIsImVhY2giLCJfIiwicm93Iiwicm93SWQiLCJ1bmRlZmluZWQiLCJzZW5kQ2hhbmdlc1RvU2VydmVyIiwiJGVtcHR5Um93IiwicmVtb3ZlIiwibmV3SWQiLCJNYXRoIiwiZmxvb3IiLCJyYW5kb20iLCJuZXdSb3dUZW1wbGF0ZSIsImZpbmQiLCJwcmVwZW5kIiwiJG5ld1JvdyIsImZvY3VzIiwiaW5pdGlhbGl6ZUlucHV0bWFzayIsIl90aGlzNCIsInNhdmVkUGFnZUxlbmd0aCIsImdldEl0ZW0iLCJzZWFyY2giLCJzZXJ2ZXJTaWRlIiwicHJvY2Vzc2luZyIsImFqYXgiLCJ1cmwiLCJ0eXBlIiwiZGF0YVNyYyIsImNvbHVtbnMiLCJwYWdpbmciLCJkZWZlclJlbmRlciIsInNEb20iLCJvcmRlcmluZyIsImNyZWF0ZWRSb3ciLCJidWlsZFJvd1RlbXBsYXRlIiwiZHJhd0NhbGxiYWNrIiwibGFuZ3VhZ2UiLCJTZW1hbnRpY0xvY2FsaXphdGlvbiIsImRhdGFUYWJsZUxvY2FsaXNhdGlvbiIsIkRhdGFUYWJsZSIsInNlYXJjaERlYm91bmNlVGltZXIiLCJjbGVhclRpbWVvdXQiLCJzZXRUaW1lb3V0IiwidGV4dCIsInN0YXRlIiwibG9hZGVkIiwic2VhcmNoVmFsdWUiLCJnZXRRdWVyeVBhcmFtIiwiYnRuRGVsZXRlQ29sb3IiLCJjcmVhdGVkIiwibmFtZVRlbXBsYXRlIiwiY2FsbF9pZCIsIm51bWJlclRlbXBsYXRlIiwibnVtYmVyIiwiZGVsZXRlQnV0dG9uVGVtcGxhdGUiLCJEVF9Sb3dJZCIsImVxIiwiaHRtbCIsIiRjaGFuZ2VkRmllbGRzIiwib2JqIiwiJGVsIiwiY2hlY2tib3giLCJtYXNrc1NvcnQiLCJJbnB1dE1hc2tQYXR0ZXJucyIsImlucHV0bWFza3MiLCJpbnB1dG1hc2siLCJkZWZpbml0aW9ucyIsInZhbGlkYXRvciIsImNhcmRpbmFsaXR5Iiwic2hvd01hc2tPbkhvdmVyIiwib25CZWZvcmVQYXN0ZSIsImNiT25OdW1iZXJCZWZvcmVQYXN0ZSIsIm1hdGNoIiwicmVwbGFjZSIsImxpc3QiLCJsaXN0S2V5IiwicmVjb3JkSWQiLCJfdGhpczUiLCJjYWxsZXJJZCIsIm51bWJlcklucHV0VmFsIiwibnVtYmVyX3JlcCIsImRpc3BsYXlTYXZpbmdJY29uIiwiYXBpIiwibWV0aG9kIiwic3VjY2Vzc1Rlc3QiLCJyZXNwb25zZSIsInN1Y2Nlc3MiLCJvblN1Y2Nlc3MiLCJvblNhdmVTdWNjZXNzIiwib25GYWlsdXJlIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJtZXNzYWdlIiwib25FcnJvciIsImVycm9yTWVzc2FnZSIsImVsZW1lbnQiLCJ4aHIiLCJzdGF0dXMiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsIm9sZElkIiwiJHRhcmdldCIsIl90aGlzNiIsImFwcGVuZCIsInBhc3RlZFZhbHVlIiwicm93SGVpZ2h0IiwiZmlyc3QiLCJvdXRlckhlaWdodCIsIndpbmRvd0hlaWdodCIsImlubmVySGVpZ2h0IiwiaGVhZGVyRm9vdGVySGVpZ2h0IiwibWF4IiwicGFyYW0iLCJ1cmxQYXJhbXMiLCJVUkxTZWFyY2hQYXJhbXMiLCJnZXQiLCJyZWFkeSJdLCJzb3VyY2VzIjpbInNyYy9tb2R1bGUtcGhvbmVib29rLWRhdGF0YWJsZS5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKlxyXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXHJcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjQgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxyXG4gKlxyXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxyXG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxyXG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxyXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxyXG4gKlxyXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcclxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcclxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxyXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxyXG4gKlxyXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cclxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cclxuICovXHJcblxyXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBTZW1hbnRpY0xvY2FsaXphdGlvbiwgVXNlck1lc3NhZ2UsIElucHV0TWFza1BhdHRlcm5zICovXHJcblxyXG5jb25zdCBNb2R1bGVQaG9uZUJvb2tEVCA9IHtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFRoZSBnbG9iYWwgc2VhcmNoIGlucHV0IGVsZW1lbnQuXHJcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxyXG4gICAgICovXHJcbiAgICAkZ2xvYmFsU2VhcmNoOiAkKCcjZ2xvYmFsLXNlYXJjaCcpLFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogVGhlIHBhZ2UgbGVuZ3RoIHNlbGVjdG9yLlxyXG4gICAgICogQHR5cGUge2pRdWVyeX1cclxuICAgICAqL1xyXG4gICAgJHBhZ2VMZW5ndGhTZWxlY3RvcjokKCcjcGFnZS1sZW5ndGgtc2VsZWN0JyksXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBUaGUgcGFnZSBsZW5ndGggc2VsZWN0b3IuXHJcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxyXG4gICAgICovXHJcbiAgICAkc2VhcmNoRXh0ZW5zaW9uc0lucHV0OiAkKCcjc2VhcmNoLWV4dGVuc2lvbnMtaW5wdXQnKSxcclxuXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBUaGUgZGF0YSB0YWJsZSBvYmplY3QuXHJcbiAgICAgKiBAdHlwZSB7T2JqZWN0fVxyXG4gICAgICovXHJcbiAgICBkYXRhVGFibGU6IHt9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogVGhlIGRvY3VtZW50IGJvZHkuXHJcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxyXG4gICAgICovXHJcbiAgICAkYm9keTogJCgnYm9keScpLFxyXG5cclxuICAgIC8vIENhY2hlZCBET00gZWxlbWVudHNcclxuICAgICRkaXNhYmxlSW5wdXRNYXNrVG9nZ2xlOiAkKCcjZGlzYWJsZS1pbnB1dC1tYXNrJyksXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBUaGUgZXh0ZW5zaW9ucyB0YWJsZSBlbGVtZW50LlxyXG4gICAgICogQHR5cGUge2pRdWVyeX1cclxuICAgICAqL1xyXG4gICAgJHJlY29yZHNUYWJsZTogJCgnI3Bob25lYm9vay10YWJsZScpLFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogVGhlIGFkZCBuZXcgYnV0dG9uIGVsZW1lbnQuXHJcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxyXG4gICAgICovXHJcbiAgICAkYWRkTmV3QnV0dG9uOiAkKCcjYWRkLW5ldy1idXR0b24nKSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIFNlbGVjdG9yIGZvciBudW1iZXIgaW5wdXQgZmllbGRzLlxyXG4gICAgICogQHR5cGUge3N0cmluZ31cclxuICAgICAqL1xyXG4gICAgaW5wdXROdW1iZXJKUVRQTDogJ2lucHV0Lm51bWJlci1pbnB1dCcsXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBMaXN0IG9mIGlucHV0IG1hc2tzLlxyXG4gICAgICogQHR5cGUge251bGx8QXJyYXl9XHJcbiAgICAgKi9cclxuICAgICRtYXNrTGlzdDogbnVsbCxcclxuXHJcbiAgICAvLyBVUkxzIGZvciBBSkFYIHJlcXVlc3RzXHJcbiAgICBnZXROZXdSZWNvcmRzQUpBWFVybDogYCR7Z2xvYmFsUm9vdFVybH1tb2R1bGUtcGhvbmUtYm9vay9nZXROZXdSZWNvcmRzYCxcclxuXHJcbiAgICBkZWxldGVSZWNvcmRBSkFYVXJsOiBgJHtnbG9iYWxSb290VXJsfW1vZHVsZS1waG9uZS1ib29rL2RlbGV0ZWAsXHJcblxyXG4gICAgc2F2ZVJlY29yZEFKQVhVcmw6IGAke2dsb2JhbFJvb3RVcmx9bW9kdWxlLXBob25lLWJvb2svc2F2ZWAsXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBJbml0aWFsaXplIHRoZSBtb2R1bGUuXHJcbiAgICAgKiBUaGlzIGluY2x1ZGVzIHNldHRpbmcgdXAgZXZlbnQgbGlzdGVuZXJzIGFuZCBpbml0aWFsaXppbmcgdGhlIERhdGFUYWJsZS5cclxuICAgICAqL1xyXG4gICAgaW5pdGlhbGl6ZSgpIHtcclxuICAgICAgICB0aGlzLmluaXRpYWxpemVTZWFyY2goKTtcclxuICAgICAgICB0aGlzLmluaXRpYWxpemVEYXRhVGFibGUoKTtcclxuICAgICAgICB0aGlzLmluaXRpYWxpemVFdmVudExpc3RlbmVycygpO1xyXG4gICAgfSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIEluaXRpYWxpemUgdGhlIHNlYXJjaCBmdW5jdGlvbmFsaXR5LlxyXG4gICAgICogSXQgbGlzdGVucyBmb3Iga2V5IGV2ZW50cyBhbmQgYXBwbGllcyBhIGZpbHRlciBiYXNlZCBvbiB0aGUgdXNlcidzIGlucHV0LlxyXG4gICAgICovXHJcbiAgICBpbml0aWFsaXplU2VhcmNoKCkge1xyXG4gICAgICAgIHRoaXMuJGdsb2JhbFNlYXJjaC5vbigna2V5dXAnLCAoZSkgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBzZWFyY2hUZXh0ID0gdGhpcy4kZ2xvYmFsU2VhcmNoLnZhbCgpLnRyaW0oKTtcclxuICAgICAgICAgICAgaWYgKGUua2V5Q29kZSA9PT0gMTMgfHwgZS5rZXlDb2RlID09PSA4IHx8IHNlYXJjaFRleHQubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmFwcGx5RmlsdGVyKHNlYXJjaFRleHQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogSW5pdGlhbGl6ZSBhbGwgZXZlbnQgbGlzdGVuZXJzLlxyXG4gICAgICogSGFuZGxlcyBpbnB1dCBmb2N1cywgZm9ybSBzdWJtaXNzaW9uLCBhZGRpbmcgbmV3IHJvd3MsIGFuZCBkZWxldGUgYWN0aW9ucy5cclxuICAgICAqL1xyXG4gICAgaW5pdGlhbGl6ZUV2ZW50TGlzdGVuZXJzKCkge1xyXG5cclxuICAgICAgICAvLyBIYW5kbGUgZm9jdXMgb24gaW5wdXQgZmllbGRzIGZvciBlZGl0aW5nXHJcbiAgICAgICAgdGhpcy4kYm9keS5vbignZm9jdXNpbicsICcuY2FsbGVyLWlkLWlucHV0LCAubnVtYmVyLWlucHV0JywgKGUpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5vbkZpZWxkRm9jdXMoJChlLnRhcmdldCkpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBIYW5kbGUgbG9zcyBvZiBmb2N1cyBvbiBpbnB1dCBmaWVsZHMgYW5kIHNhdmUgY2hhbmdlc1xyXG4gICAgICAgIHRoaXMuJGJvZHkub24oJ2ZvY3Vzb3V0JywgJy5jYWxsZXItaWQtaW5wdXQsIC5udW1iZXItaW5wdXQnLCAoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuc2F2ZUNoYW5nZXNGb3JBbGxSb3dzKCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIEhhbmRsZSBkZWxldGUgYnV0dG9uIGNsaWNrXHJcbiAgICAgICAgdGhpcy4kYm9keS5vbignY2xpY2snLCAnYS5kZWxldGUnLCAoZSkgPT4ge1xyXG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgIGNvbnN0IGlkID0gJChlLnRhcmdldCkuY2xvc2VzdCgnYScpLmRhdGEoJ3ZhbHVlJyk7XHJcbiAgICAgICAgICAgIHRoaXMuZGVsZXRlUm93KCQoZS50YXJnZXQpLCBpZCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIEhhbmRsZSBFbnRlciBvciBUYWIga2V5IHRvIHRyaWdnZXIgZm9ybSBzdWJtaXNzaW9uXHJcbiAgICAgICAgJChkb2N1bWVudCkub24oJ2tleWRvd24nLCAoZSkgPT4ge1xyXG4gICAgICAgICAgICBpZiAoZS5rZXkgPT09ICdFbnRlcicgfHwgKGUua2V5ID09PSAnVGFiJyAmJiAhJCgnOmZvY3VzJykuaGFzQ2xhc3MoJy5udW1iZXItaW5wdXQnKSkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2F2ZUNoYW5nZXNGb3JBbGxSb3dzKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gSGFuZGxlIGFkZGluZyBhIG5ldyByb3dcclxuICAgICAgICB0aGlzLiRhZGROZXdCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcclxuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZE5ld1JvdygpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBIYW5kbGUgcGFnZSBsZW5ndGggc2VsZWN0aW9uXHJcbiAgICAgICAgdGhpcy4kcGFnZUxlbmd0aFNlbGVjdG9yLmRyb3Bkb3duKHtcclxuICAgICAgICAgICAgb25DaGFuZ2UocGFnZUxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHBhZ2VMZW5ndGg9PT0nYXV0bycpe1xyXG4gICAgICAgICAgICAgICAgICAgIHBhZ2VMZW5ndGggPSB0aGlzLmNhbGN1bGF0ZVBhZ2VMZW5ndGgoKTtcclxuICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSgncGhvbmVib29rVGFibGVQYWdlTGVuZ3RoJyk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdwaG9uZWJvb2tUYWJsZVBhZ2VMZW5ndGgnLCBwYWdlTGVuZ3RoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIE1vZHVsZVBob25lQm9va0RULmRhdGFUYWJsZS5wYWdlLmxlbihwYWdlTGVuZ3RoKS5kcmF3KCk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIFByZXZlbnQgZXZlbnQgYnViYmxpbmcgb24gZHJvcGRvd24gY2xpY2tcclxuICAgICAgICB0aGlzLiRwYWdlTGVuZ3RoU2VsZWN0b3Iub24oJ2NsaWNrJywgZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgICAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7IC8vIFByZXZlbnQgdGhlIGV2ZW50IGZyb20gYnViYmxpbmdcclxuICAgICAgICB9KTtcclxuICAgIH0sXHJcblxyXG5cclxuICAgIC8qKlxyXG4gICAgICogSGFuZGxlIGZvY3VzIGV2ZW50IG9uIGEgZmllbGQgYnkgYWRkaW5nIGEgZ2xvd2luZyBlZmZlY3QgYW5kIGVuYWJsaW5nIGVkaXRpbmcuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICRpbnB1dCAtIFRoZSBpbnB1dCBmaWVsZCB0aGF0IHJlY2VpdmVkIGZvY3VzLlxyXG4gICAgICovXHJcbiAgICBvbkZpZWxkRm9jdXMoJGlucHV0KSB7XHJcbiAgICAgICAgJGlucHV0LnRyYW5zaXRpb24oJ2dsb3cnKTtcclxuICAgICAgICAkaW5wdXQuY2xvc2VzdCgnZGl2JykucmVtb3ZlQ2xhc3MoJ3RyYW5zcGFyZW50JykuYWRkQ2xhc3MoJ2NoYW5nZWQtZmllbGQnKTtcclxuICAgICAgICAkaW5wdXQuYXR0cigncmVhZG9ubHknLCBmYWxzZSk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogU2F2ZSBjaGFuZ2VzIGZvciBhbGwgbW9kaWZpZWQgcm93cy5cclxuICAgICAqIEl0IHNlbmRzIHRoZSBjaGFuZ2VzIGZvciBlYWNoIG1vZGlmaWVkIHJvdyB0byB0aGUgc2VydmVyLlxyXG4gICAgICovXHJcbiAgICBzYXZlQ2hhbmdlc0ZvckFsbFJvd3MoKSB7XHJcbiAgICAgICAgY29uc3QgJHJvd3MgPSAkKCcuY2hhbmdlZC1maWVsZCcpLmNsb3Nlc3QoJ3RyJyk7XHJcbiAgICAgICAgJHJvd3MuZWFjaCgoXywgcm93KSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJvd0lkID0gJChyb3cpLmF0dHIoJ2lkJyk7XHJcbiAgICAgICAgICAgIGlmIChyb3dJZCAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNlbmRDaGFuZ2VzVG9TZXJ2ZXIocm93SWQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQWRkIGEgbmV3IHJvdyB0byB0aGUgcGhvbmVib29rIHRhYmxlLlxyXG4gICAgICogVGhlIHJvdyBpcyBlZGl0YWJsZSBhbmQgYWxsb3dzIGZvciBpbnB1dCBvZiBuZXcgY29udGFjdCBpbmZvcm1hdGlvbi5cclxuICAgICAqL1xyXG4gICAgYWRkTmV3Um93KCkge1xyXG4gICAgICAgIGNvbnN0ICRlbXB0eVJvdyA9ICQoJy5kYXRhVGFibGVzX2VtcHR5Jyk7XHJcbiAgICAgICAgaWYgKCRlbXB0eVJvdy5sZW5ndGgpICRlbXB0eVJvdy5yZW1vdmUoKTtcclxuXHJcbiAgICAgICAgdGhpcy5zYXZlQ2hhbmdlc0ZvckFsbFJvd3MoKTtcclxuXHJcbiAgICAgICAgY29uc3QgbmV3SWQgPSBgbmV3JHtNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiA1MDApfWA7XHJcbiAgICAgICAgY29uc3QgbmV3Um93VGVtcGxhdGUgPSBgXHJcbiAgICAgICAgICAgIDx0ciBpZD1cIiR7bmV3SWR9XCI+XHJcbiAgICAgICAgICAgICAgICA8dGQ+PGkgY2xhc3M9XCJ1aSB1c2VyIGNpcmNsZSBpY29uXCI+PC9pPjwvdGQ+XHJcbiAgICAgICAgICAgICAgICA8dGQ+PGRpdiBjbGFzcz1cInVpIGZsdWlkIGlucHV0IGlubGluZS1lZGl0IGNoYW5nZWQtZmllbGRcIj48aW5wdXQgY2xhc3M9XCJjYWxsZXItaWQtaW5wdXRcIiB0eXBlPVwidGV4dFwiIHZhbHVlPVwiXCI+PC9kaXY+PC90ZD5cclxuICAgICAgICAgICAgICAgIDx0ZD48ZGl2IGNsYXNzPVwidWkgZmx1aWQgaW5wdXQgaW5saW5lLWVkaXQgY2hhbmdlZC1maWVsZFwiPjxpbnB1dCBjbGFzcz1cIm51bWJlci1pbnB1dFwiIHR5cGU9XCJ0ZXh0XCIgdmFsdWU9XCJcIj48L2Rpdj48L3RkPlxyXG4gICAgICAgICAgICAgICAgPHRkPjxkaXYgY2xhc3M9XCJ1aSBiYXNpYyBpY29uIGJ1dHRvbnMgYWN0aW9uLWJ1dHRvbnMgdGlueVwiPlxyXG4gICAgICAgICAgICAgICAgICAgIDxhIGhyZWY9XCIjXCIgY2xhc3M9XCJ1aSBidXR0b24gZGVsZXRlXCIgZGF0YS12YWx1ZT1cIm5ld1wiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImljb24gdHJhc2ggcmVkXCI+PC9pPlxyXG4gICAgICAgICAgICAgICAgICAgIDwvYT5cclxuICAgICAgICAgICAgICAgIDwvZGl2PjwvdGQ+XHJcbiAgICAgICAgICAgIDwvdHI+YDtcclxuXHJcbiAgICAgICAgdGhpcy4kcmVjb3Jkc1RhYmxlLmZpbmQoJ3Rib2R5JykucHJlcGVuZChuZXdSb3dUZW1wbGF0ZSk7XHJcbiAgICAgICAgY29uc3QgJG5ld1JvdyA9ICQoYCMke25ld0lkfWApO1xyXG4gICAgICAgICRuZXdSb3cuZmluZCgnaW5wdXQnKS50cmFuc2l0aW9uKCdnbG93Jyk7XHJcbiAgICAgICAgJG5ld1Jvdy5maW5kKCcuY2FsbGVyLWlkLWlucHV0JykuZm9jdXMoKTtcclxuICAgICAgICB0aGlzLmluaXRpYWxpemVJbnB1dG1hc2soJG5ld1Jvdy5maW5kKCcubnVtYmVyLWlucHV0JykpO1xyXG4gICAgfSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIEluaXRpYWxpemUgdGhlIERhdGFUYWJsZSBpbnN0YW5jZSB3aXRoIHRoZSByZXF1aXJlZCBzZXR0aW5ncyBhbmQgb3B0aW9ucy5cclxuICAgICAqL1xyXG4gICAgaW5pdGlhbGl6ZURhdGFUYWJsZSgpIHtcclxuXHJcbiAgICAgICAgLy8gR2V0IHRoZSB1c2VyJ3Mgc2F2ZWQgdmFsdWUgb3IgdXNlIHRoZSBhdXRvbWF0aWNhbGx5IGNhbGN1bGF0ZWQgdmFsdWUgaWYgbm9uZSBleGlzdHNcclxuICAgICAgICBjb25zdCBzYXZlZFBhZ2VMZW5ndGggPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgncGhvbmVib29rVGFibGVQYWdlTGVuZ3RoJyk7XHJcbiAgICAgICAgY29uc3QgcGFnZUxlbmd0aCA9IHNhdmVkUGFnZUxlbmd0aCA/IHNhdmVkUGFnZUxlbmd0aCA6IHRoaXMuY2FsY3VsYXRlUGFnZUxlbmd0aCgpO1xyXG5cclxuICAgICAgICB0aGlzLiRyZWNvcmRzVGFibGUuZGF0YVRhYmxlKHtcclxuICAgICAgICAgICAgc2VhcmNoOiB7IHNlYXJjaDogdGhpcy4kZ2xvYmFsU2VhcmNoLnZhbCgpIH0sXHJcbiAgICAgICAgICAgIHNlcnZlclNpZGU6IHRydWUsXHJcbiAgICAgICAgICAgIHByb2Nlc3Npbmc6IHRydWUsXHJcbiAgICAgICAgICAgIGFqYXg6IHtcclxuICAgICAgICAgICAgICAgIHVybDogdGhpcy5nZXROZXdSZWNvcmRzQUpBWFVybCxcclxuICAgICAgICAgICAgICAgIHR5cGU6ICdQT1NUJyxcclxuICAgICAgICAgICAgICAgIGRhdGFTcmM6ICdkYXRhJyxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgY29sdW1uczogW1xyXG4gICAgICAgICAgICAgICAgeyBkYXRhOiBudWxsIH0sXHJcbiAgICAgICAgICAgICAgICB7IGRhdGE6ICdjYWxsX2lkJyB9LFxyXG4gICAgICAgICAgICAgICAgeyBkYXRhOiAnbnVtYmVyJyB9LFxyXG4gICAgICAgICAgICAgICAgeyBkYXRhOiBudWxsIH0sXHJcbiAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgIHBhZ2luZzogdHJ1ZSxcclxuICAgICAgICAgICAgcGFnZUxlbmd0aDogcGFnZUxlbmd0aCxcclxuICAgICAgICAgICAgZGVmZXJSZW5kZXI6IHRydWUsXHJcbiAgICAgICAgICAgIHNEb206ICdydGlwJyxcclxuICAgICAgICAgICAgb3JkZXJpbmc6IGZhbHNlLFxyXG4gICAgICAgICAgICBjcmVhdGVkUm93OiAocm93LCBkYXRhKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmJ1aWxkUm93VGVtcGxhdGUocm93LCBkYXRhKTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZHJhd0NhbGxiYWNrOiAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmluaXRpYWxpemVJbnB1dG1hc2soJCh0aGlzLmlucHV0TnVtYmVySlFUUEwpKTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgbGFuZ3VhZ2U6IFNlbWFudGljTG9jYWxpemF0aW9uLmRhdGFUYWJsZUxvY2FsaXNhdGlvbixcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGhpcy5kYXRhVGFibGUgPSB0aGlzLiRyZWNvcmRzVGFibGUuRGF0YVRhYmxlKCk7XHJcblxyXG5cclxuICAgICAgICAvLyBTZXQgdGhlIHNlbGVjdCBpbnB1dCB2YWx1ZSB0byB0aGUgc2F2ZWQgdmFsdWUgaWYgaXQgZXhpc3RzXHJcbiAgICAgICAgaWYgKHNhdmVkUGFnZUxlbmd0aCkge1xyXG4gICAgICAgICAgICB0aGlzLiRwYWdlTGVuZ3RoU2VsZWN0b3IuZHJvcGRvd24oJ3NldCB2YWx1ZScsIHNhdmVkUGFnZUxlbmd0aCk7XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkZWJvdW5jZSB0aW1lciB2YXJpYWJsZVxyXG4gICAgICAgIGxldCBzZWFyY2hEZWJvdW5jZVRpbWVyID0gbnVsbDtcclxuXHJcbiAgICAgICAgdGhpcy4kZ2xvYmFsU2VhcmNoLm9uKCdrZXl1cCcsIChlKSA9PiB7XHJcbiAgICAgICAgICAgIC8vIENsZWFyIHByZXZpb3VzIHRpbWVyIGlmIHRoZSB1c2VyIGlzIHN0aWxsIHR5cGluZ1xyXG4gICAgICAgICAgICBjbGVhclRpbWVvdXQoc2VhcmNoRGVib3VuY2VUaW1lcik7XHJcblxyXG4gICAgICAgICAgICAvLyBTZXQgYSBuZXcgdGltZXIgZm9yIGRlbGF5ZWQgZXhlY3V0aW9uXHJcbiAgICAgICAgICAgIHNlYXJjaERlYm91bmNlVGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRleHQgPSB0aGlzLiRnbG9iYWxTZWFyY2gudmFsKCk7XHJcbiAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIHRoZSBzZWFyY2ggaWYgaW5wdXQgaXMgdmFsaWQgKEVudGVyLCBCYWNrc3BhY2UsIG9yIG1vcmUgdGhhbiAyIGNoYXJhY3RlcnMpXHJcbiAgICAgICAgICAgICAgICBpZiAoZS5rZXlDb2RlID09PSAxMyB8fCBlLmtleUNvZGUgPT09IDggfHwgdGV4dC5sZW5ndGggPj0gMikge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYXBwbHlGaWx0ZXIodGV4dCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sIDUwMCk7IC8vIDUwMG1zIGRlbGF5IGJlZm9yZSBleGVjdXRpbmcgdGhlIHNlYXJjaFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBSZXN0b3JlIHRoZSBzYXZlZCBzZWFyY2ggcGhyYXNlIGZyb20gRGF0YVRhYmxlcyBzdGF0ZVxyXG4gICAgICAgIGNvbnN0IHN0YXRlID0gdGhpcy5kYXRhVGFibGUuc3RhdGUubG9hZGVkKCk7XHJcbiAgICAgICAgaWYgKHN0YXRlICYmIHN0YXRlLnNlYXJjaCkge1xyXG4gICAgICAgICAgICB0aGlzLiRnbG9iYWxTZWFyY2gudmFsKHN0YXRlLnNlYXJjaC5zZWFyY2gpOyAvLyBTZXQgdGhlIHNlYXJjaCBmaWVsZCB3aXRoIHRoZSBzYXZlZCB2YWx1ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gUmV0cmlldmVzIHRoZSB2YWx1ZSBvZiAnc2VhcmNoJyBxdWVyeSBwYXJhbWV0ZXIgZnJvbSB0aGUgVVJMLlxyXG4gICAgICAgIGNvbnN0IHNlYXJjaFZhbHVlID0gdGhpcy5nZXRRdWVyeVBhcmFtKCdzZWFyY2gnKTtcclxuXHJcbiAgICAgICAgLy8gU2V0cyB0aGUgZ2xvYmFsIHNlYXJjaCBpbnB1dCB2YWx1ZSBhbmQgYXBwbGllcyB0aGUgZmlsdGVyIGlmIGEgc2VhcmNoIHZhbHVlIGlzIHByb3ZpZGVkLlxyXG4gICAgICAgIGlmIChzZWFyY2hWYWx1ZSkge1xyXG4gICAgICAgICAgICB0aGlzLiRnbG9iYWxTZWFyY2gudmFsKHNlYXJjaFZhbHVlKTtcclxuICAgICAgICAgICAgdGhpcy5hcHBseUZpbHRlcihzZWFyY2hWYWx1ZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmRhdGFUYWJsZS5vbignZHJhdycsICgpID0+IHtcclxuICAgICAgICAgICAgdGhpcy4kZ2xvYmFsU2VhcmNoLmNsb3Nlc3QoJ2RpdicpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQnVpbGQgdGhlIEhUTUwgdGVtcGxhdGUgZm9yIGVhY2ggcm93IGluIHRoZSBEYXRhVGFibGUuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtIVE1MRWxlbWVudH0gcm93IC0gVGhlIHJvdyBlbGVtZW50LlxyXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBUaGUgZGF0YSBvYmplY3QgZm9yIHRoZSByb3cuXHJcbiAgICAgKi9cclxuICAgIGJ1aWxkUm93VGVtcGxhdGUocm93LCBkYXRhKSB7XHJcbiAgICAgICAgY29uc3QgYnRuRGVsZXRlQ29sb3IgPSBkYXRhLmNyZWF0ZWQgPiAwID8gYGJsdWVgIDogYHJlZGA7XHJcbiAgICAgICAgY29uc3QgbmFtZVRlbXBsYXRlID0gYFxyXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdHJhbnNwYXJlbnQgZmx1aWQgaW5wdXQgaW5saW5lLWVkaXRcIj5cclxuICAgICAgICAgICAgICAgIDxpbnB1dCBjbGFzcz1cImNhbGxlci1pZC1pbnB1dFwiIHR5cGU9XCJ0ZXh0XCIgdmFsdWU9XCIke2RhdGEuY2FsbF9pZH1cIiAvPlxyXG4gICAgICAgICAgICA8L2Rpdj5gO1xyXG4gICAgICAgIGNvbnN0IG51bWJlclRlbXBsYXRlID0gYFxyXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdHJhbnNwYXJlbnQgaW5wdXQgaW5saW5lLWVkaXRcIj5cclxuICAgICAgICAgICAgICAgIDxpbnB1dCBjbGFzcz1cIm51bWJlci1pbnB1dFwiIHR5cGU9XCJ0ZXh0XCIgdmFsdWU9XCIke2RhdGEubnVtYmVyfVwiIC8+XHJcbiAgICAgICAgICAgIDwvZGl2PmA7XHJcbiAgICAgICAgY29uc3QgZGVsZXRlQnV0dG9uVGVtcGxhdGUgPSBgXHJcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBiYXNpYyBpY29uIGJ1dHRvbnMgYWN0aW9uLWJ1dHRvbnMgdGlueVwiPlxyXG4gICAgICAgICAgICAgICAgPGEgaHJlZj1cIiNcIiBkYXRhLXZhbHVlPVwiJHtkYXRhLkRUX1Jvd0lkfVwiIGNsYXNzPVwidWkgZGVsZXRlIGJ1dHRvblwiPlxyXG4gICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaWNvbiB0cmFzaCAke2J0bkRlbGV0ZUNvbG9yfVwiPjwvaT5cclxuICAgICAgICAgICAgICAgIDwvYT5cclxuICAgICAgICAgICAgPC9kaXY+YDtcclxuXHJcbiAgICAgICAgJCgndGQnLCByb3cpLmVxKDApLmh0bWwoJzxpIGNsYXNzPVwidWkgdXNlciBjaXJjbGUgaWNvblwiPjwvaT4nKTtcclxuICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMSkuaHRtbChuYW1lVGVtcGxhdGUpO1xyXG4gICAgICAgICQoJ3RkJywgcm93KS5lcSgyKS5odG1sKG51bWJlclRlbXBsYXRlKTtcclxuICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMykuaHRtbChkZWxldGVCdXR0b25UZW1wbGF0ZSk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQXBwbHkgYSBzZWFyY2ggZmlsdGVyIHRvIHRoZSBEYXRhVGFibGUuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgLSBUaGUgc2VhcmNoIHRleHQgdG8gYXBwbHkuXHJcbiAgICAgKi9cclxuICAgIGFwcGx5RmlsdGVyKHRleHQpIHtcclxuICAgICAgICBjb25zdCAkY2hhbmdlZEZpZWxkcyA9ICQoJy5jaGFuZ2VkLWZpZWxkJyk7XHJcbiAgICAgICAgJGNoYW5nZWRGaWVsZHMuZWFjaCgoXywgb2JqKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0ICRpbnB1dCA9ICQob2JqKS5maW5kKCdpbnB1dCcpO1xyXG4gICAgICAgICAgICAkaW5wdXQudmFsKCRpbnB1dC5kYXRhKCd2YWx1ZScpKTtcclxuICAgICAgICAgICAgJGlucHV0LmF0dHIoJ3JlYWRvbmx5JywgdHJ1ZSk7XHJcbiAgICAgICAgICAgICQob2JqKS5yZW1vdmVDbGFzcygnY2hhbmdlZC1maWVsZCcpLmFkZENsYXNzKCd0cmFuc3BhcmVudCcpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHRoaXMuZGF0YVRhYmxlLnNlYXJjaCh0ZXh0KS5kcmF3KCk7XHJcbiAgICAgICAgdGhpcy4kZ2xvYmFsU2VhcmNoLmNsb3Nlc3QoJ2RpdicpLmFkZENsYXNzKCdsb2FkaW5nJyk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogSW5pdGlhbGl6ZSBpbnB1dCBtYXNrcyBmb3IgcGhvbmUgbnVtYmVyIGZpZWxkcy5cclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0ge2pRdWVyeX0gJGVsIC0gVGhlIGlucHV0IGVsZW1lbnRzIHRvIGFwcGx5IG1hc2tzIHRvLlxyXG4gICAgICovXHJcbiAgICBpbml0aWFsaXplSW5wdXRtYXNrKCRlbCkge1xyXG4gICAgICAgIGlmICh0aGlzLiRkaXNhYmxlSW5wdXRNYXNrVG9nZ2xlLmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHJldHVybjtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuJG1hc2tMaXN0ID09PSBudWxsKSB7XHJcbiAgICAgICAgICAgIHRoaXMuJG1hc2tMaXN0ID0gJC5tYXNrc1NvcnQoSW5wdXRNYXNrUGF0dGVybnMsIFsnIyddLCAvWzAtOV18Iy8sICdtYXNrJyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAkZWwuaW5wdXRtYXNrcyh7XHJcbiAgICAgICAgICAgIGlucHV0bWFzazoge1xyXG4gICAgICAgICAgICAgICAgZGVmaW5pdGlvbnM6IHtcclxuICAgICAgICAgICAgICAgICAgICAnIyc6IHsgdmFsaWRhdG9yOiAnWzAtOV0nLCBjYXJkaW5hbGl0eTogMSB9LFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHNob3dNYXNrT25Ib3ZlcjogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICBvbkJlZm9yZVBhc3RlOiB0aGlzLmNiT25OdW1iZXJCZWZvcmVQYXN0ZSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgbWF0Y2g6IC9bMC05XS8sXHJcbiAgICAgICAgICAgIHJlcGxhY2U6ICc5JyxcclxuICAgICAgICAgICAgbGlzdDogdGhpcy4kbWFza0xpc3QsXHJcbiAgICAgICAgICAgIGxpc3RLZXk6ICdtYXNrJyxcclxuICAgICAgICB9KTtcclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBTZW5kIHRoZSBjaGFuZ2VzIGZvciBhIHNwZWNpZmljIHJvdyB0byB0aGUgc2VydmVyLlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSByZWNvcmRJZCAtIFRoZSBJRCBvZiB0aGUgcmVjb3JkIHRvIHNhdmUuXHJcbiAgICAgKi9cclxuICAgIHNlbmRDaGFuZ2VzVG9TZXJ2ZXIocmVjb3JkSWQpIHtcclxuICAgICAgICBjb25zdCBjYWxsZXJJZCA9ICQoYHRyIyR7cmVjb3JkSWR9IC5jYWxsZXItaWQtaW5wdXRgKS52YWwoKTtcclxuICAgICAgICBjb25zdCBudW1iZXJJbnB1dFZhbCA9ICQoYHRyIyR7cmVjb3JkSWR9IC5udW1iZXItaW5wdXRgKS52YWwoKTtcclxuXHJcbiAgICAgICAgaWYgKCFjYWxsZXJJZCB8fCAhbnVtYmVySW5wdXRWYWwpIHJldHVybjtcclxuXHJcbiAgICAgICAgY29uc3QgZGF0YSA9IHtcclxuICAgICAgICAgICAgY2FsbF9pZDogY2FsbGVySWQsXHJcbiAgICAgICAgICAgIG51bWJlcl9yZXA6IG51bWJlcklucHV0VmFsLFxyXG4gICAgICAgICAgICBpZDogcmVjb3JkSWRcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB0aGlzLmRpc3BsYXlTYXZpbmdJY29uKHJlY29yZElkKTtcclxuXHJcbiAgICAgICAgJC5hcGkoe1xyXG4gICAgICAgICAgICB1cmw6IHRoaXMuc2F2ZVJlY29yZEFKQVhVcmwsXHJcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxyXG4gICAgICAgICAgICBvbjogJ25vdycsXHJcbiAgICAgICAgICAgIGRhdGEsXHJcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiAocmVzcG9uc2UpID0+IHJlc3BvbnNlICYmIHJlc3BvbnNlLnN1Y2Nlc3MgPT09IHRydWUsXHJcbiAgICAgICAgICAgIG9uU3VjY2VzczogKHJlc3BvbnNlKSA9PiB0aGlzLm9uU2F2ZVN1Y2Nlc3MocmVzcG9uc2UsIHJlY29yZElkKSxcclxuICAgICAgICAgICAgb25GYWlsdXJlOiAocmVzcG9uc2UpID0+IFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlKSxcclxuICAgICAgICAgICAgb25FcnJvcjogKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoeGhyLnN0YXR1cyA9PT0gNDAzKSB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgIH0pO1xyXG4gICAgfSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIERpc3BsYXkgYSBzYXZpbmcgaWNvbiBmb3IgdGhlIGdpdmVuIHJlY29yZC5cclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcmVjb3JkSWQgLSBUaGUgSUQgb2YgdGhlIHJlY29yZCBiZWluZyBzYXZlZC5cclxuICAgICAqL1xyXG4gICAgZGlzcGxheVNhdmluZ0ljb24ocmVjb3JkSWQpIHtcclxuICAgICAgICAkKGB0ciMke3JlY29yZElkfSAudXNlci5jaXJjbGVgKVxyXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ3VzZXIgY2lyY2xlJylcclxuICAgICAgICAgICAgLmFkZENsYXNzKCdzcGlubmVyIGxvYWRpbmcnKTtcclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBIYW5kbGUgc3VjY2Vzc2Z1bCBzYXZpbmcgb2YgYSByZWNvcmQuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHNlcnZlciByZXNwb25zZS5cclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSByZWNvcmRJZCAtIFRoZSBJRCBvZiB0aGUgcmVjb3JkIHRoYXQgd2FzIHNhdmVkLlxyXG4gICAgICovXHJcbiAgICBvblNhdmVTdWNjZXNzKHJlc3BvbnNlLCByZWNvcmRJZCkge1xyXG4gICAgICAgIGlmIChyZXNwb25zZS5kYXRhKSB7XHJcbiAgICAgICAgICAgIGxldCBvbGRJZCA9IHJlc3BvbnNlLmRhdGEub2xkSWQgfHwgcmVjb3JkSWQ7XHJcbiAgICAgICAgICAgICQoYHRyIyR7b2xkSWR9IGlucHV0YCkuYXR0cigncmVhZG9ubHknLCB0cnVlKTtcclxuICAgICAgICAgICAgJChgdHIjJHtvbGRJZH0gYS5kZWxldGUuYnV0dG9uYCkuYXR0cignZGF0YS12YWx1ZScsIHJlc3BvbnNlLmRhdGEubmV3SWQpO1xyXG4gICAgICAgICAgICAkKGB0ciMke29sZElkfSBkaXZgKS5yZW1vdmVDbGFzcygnY2hhbmdlZC1maWVsZCBsb2FkaW5nJykuYWRkQ2xhc3MoJ3RyYW5zcGFyZW50Jyk7XHJcbiAgICAgICAgICAgICQoYHRyIyR7b2xkSWR9IC5zcGlubmVyLmxvYWRpbmdgKS5hZGRDbGFzcygndXNlciBjaXJjbGUnKS5yZW1vdmVDbGFzcygnc3Bpbm5lciBsb2FkaW5nJyk7XHJcbiAgICAgICAgICAgIGlmIChvbGRJZCAhPT0gcmVzcG9uc2UuZGF0YS5uZXdJZCkge1xyXG4gICAgICAgICAgICAgICAgJChgdHIjJHtvbGRJZH1gKS5hdHRyKCdpZCcsIHJlc3BvbnNlLmRhdGEubmV3SWQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIERlbGV0ZSBhIHJvdyBmcm9tIHRoZSBwaG9uZWJvb2sgdGFibGUuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICR0YXJnZXQgLSBUaGUgZGVsZXRlIGJ1dHRvbiBlbGVtZW50LlxyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGlkIC0gVGhlIElEIG9mIHRoZSByZWNvcmQgdG8gZGVsZXRlLlxyXG4gICAgICovXHJcbiAgICBkZWxldGVSb3coJHRhcmdldCwgaWQpIHtcclxuICAgICAgICBpZiAoaWQgPT09ICduZXcnKSB7XHJcbiAgICAgICAgICAgICR0YXJnZXQuY2xvc2VzdCgndHInKS5yZW1vdmUoKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgJC5hcGkoe1xyXG4gICAgICAgICAgICB1cmw6IGAke3RoaXMuZGVsZXRlUmVjb3JkQUpBWFVybH0vJHtpZH1gLFxyXG4gICAgICAgICAgICBvbjogJ25vdycsXHJcbiAgICAgICAgICAgIG9uU3VjY2VzczogKHJlc3BvbnNlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2Uuc3VjY2Vzcykge1xyXG4gICAgICAgICAgICAgICAgICAgICR0YXJnZXQuY2xvc2VzdCgndHInKS5yZW1vdmUoKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy4kcmVjb3Jkc1RhYmxlLmZpbmQoJ3Rib2R5ID4gdHInKS5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy4kcmVjb3Jkc1RhYmxlLmZpbmQoJ3Rib2R5JykuYXBwZW5kKCc8dHIgY2xhc3M9XCJvZGRcIj48L3RyPicpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSxcclxuICAgICAgICB9KTtcclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDbGVhbiBudW1iZXIgYmVmb3JlIHBhc3RpbmcuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhc3RlZFZhbHVlIC0gVGhlIHBhc3RlZCBwaG9uZSBudW1iZXIuXHJcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgY2xlYW5lZCBudW1iZXIuXHJcbiAgICAgKi9cclxuICAgIGNiT25OdW1iZXJCZWZvcmVQYXN0ZShwYXN0ZWRWYWx1ZSkge1xyXG4gICAgICAgIHJldHVybiBwYXN0ZWRWYWx1ZS5yZXBsYWNlKC9cXEQrL2csICcnKTtcclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDYWxjdWxhdGUgdGhlIG51bWJlciBvZiByb3dzIHRoYXQgY2FuIGZpdCBvbiBhIHBhZ2UgYmFzZWQgb24gd2luZG93IGhlaWdodC5cclxuICAgICAqXHJcbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfSBUaGUgY2FsY3VsYXRlZCBudW1iZXIgb2Ygcm93cy5cclxuICAgICAqL1xyXG4gICAgY2FsY3VsYXRlUGFnZUxlbmd0aCgpIHtcclxuICAgICAgICAvLyBDYWxjdWxhdGUgcm93IGhlaWdodFxyXG4gICAgICAgIGxldCByb3dIZWlnaHQgPSB0aGlzLiRyZWNvcmRzVGFibGUuZmluZCgndHInKS5maXJzdCgpLm91dGVySGVpZ2h0KCk7XHJcblxyXG4gICAgICAgIC8vIENhbGN1bGF0ZSB3aW5kb3cgaGVpZ2h0IGFuZCBhdmFpbGFibGUgc3BhY2UgZm9yIHRhYmxlXHJcbiAgICAgICAgY29uc3Qgd2luZG93SGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0O1xyXG4gICAgICAgIGNvbnN0IGhlYWRlckZvb3RlckhlaWdodCA9IDU1MDsgLy8gRXN0aW1hdGUgaGVpZ2h0IGZvciBoZWFkZXIsIGZvb3RlciwgYW5kIG90aGVyIGVsZW1lbnRzXHJcblxyXG4gICAgICAgIC8vIENhbGN1bGF0ZSBuZXcgcGFnZSBsZW5ndGhcclxuICAgICAgICByZXR1cm4gTWF0aC5tYXgoTWF0aC5mbG9vcigod2luZG93SGVpZ2h0IC0gaGVhZGVyRm9vdGVySGVpZ2h0KSAvIHJvd0hlaWdodCksIDUpO1xyXG4gICAgfSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIEdldCB0aGUgdmFsdWUgb2YgYSBxdWVyeSBwYXJhbWV0ZXIgZnJvbSB0aGUgVVJMLlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbSAtIFRoZSBuYW1lIG9mIHRoZSBxdWVyeSBwYXJhbWV0ZXIgdG8gcmV0cmlldmUuXHJcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfG51bGx9IFRoZSB2YWx1ZSBvZiB0aGUgcXVlcnkgcGFyYW1ldGVyLCBvciBudWxsIGlmIG5vdCBmb3VuZC5cclxuICAgICAqL1xyXG4gICAgZ2V0UXVlcnlQYXJhbShwYXJhbSkge1xyXG4gICAgICAgIGNvbnN0IHVybFBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMod2luZG93LmxvY2F0aW9uLnNlYXJjaCk7XHJcbiAgICAgICAgcmV0dXJuIHVybFBhcmFtcy5nZXQocGFyYW0pO1xyXG4gICAgfSxcclxufTtcclxuXHJcbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcclxuICAgIE1vZHVsZVBob25lQm9va0RULmluaXRpYWxpemUoKTtcclxufSk7XHJcbiJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBLElBQU1BLGlCQUFpQixHQUFHO0VBRXRCO0FBQ0o7QUFDQTtBQUNBO0VBQ0lDLGFBQWEsRUFBRUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDO0VBRWxDO0FBQ0o7QUFDQTtBQUNBO0VBQ0lDLG1CQUFtQixFQUFDRCxDQUFDLENBQUMscUJBQXFCLENBQUM7RUFFNUM7QUFDSjtBQUNBO0FBQ0E7RUFDSUUsc0JBQXNCLEVBQUVGLENBQUMsQ0FBQywwQkFBMEIsQ0FBQztFQUdyRDtBQUNKO0FBQ0E7QUFDQTtFQUNJRyxTQUFTLEVBQUUsQ0FBQyxDQUFDO0VBRWI7QUFDSjtBQUNBO0FBQ0E7RUFDSUMsS0FBSyxFQUFFSixDQUFDLENBQUMsTUFBTSxDQUFDO0VBRWhCO0VBQ0FLLHVCQUF1QixFQUFFTCxDQUFDLENBQUMscUJBQXFCLENBQUM7RUFFakQ7QUFDSjtBQUNBO0FBQ0E7RUFDSU0sYUFBYSxFQUFFTixDQUFDLENBQUMsa0JBQWtCLENBQUM7RUFFcEM7QUFDSjtBQUNBO0FBQ0E7RUFDSU8sYUFBYSxFQUFFUCxDQUFDLENBQUMsaUJBQWlCLENBQUM7RUFFbkM7QUFDSjtBQUNBO0FBQ0E7RUFDSVEsZ0JBQWdCLEVBQUUsb0JBQW9CO0VBRXRDO0FBQ0o7QUFDQTtBQUNBO0VBQ0lDLFNBQVMsRUFBRSxJQUFJO0VBRWY7RUFDQUMsb0JBQW9CLEtBQUFDLE1BQUEsQ0FBS0MsYUFBYSxv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