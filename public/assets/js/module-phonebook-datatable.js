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
    }); // Handle loss of focus on input fields and save changes

    this.$body.on('focusout', '.caller-id-input, .number-input', function () {
      _this2.saveChangesForAllRows();
    }); // Handle delete button click

    this.$body.on('click', 'a.delete', function (e) {
      e.preventDefault();
      var id = $(e.target).closest('a').data('value');

      _this2.deleteRow($(e.target), id);
    }); // Handle Enter or Tab key to trigger form submission

    $(document).on('keydown', function (e) {
      if (e.key === 'Enter' || e.key === 'Tab' && !$(':focus').hasClass('.number-input')) {
        _this2.saveChangesForAllRows();
      }
    }); // Handle adding a new row

    this.$addNewButton.on('click', function (e) {
      e.preventDefault();

      _this2.addNewRow();
    }); // Handle page length selection

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
    }); // Prevent event bubbling on dropdown click

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
    this.dataTable = this.$recordsTable.DataTable(); // Set the select input value to the saved value if it exists

    if (savedPageLength) {
      this.$pageLengthSelector.dropdown('set value', savedPageLength);
    } // Initialize debounce timer variable


    var searchDebounceTimer = null;
    this.$globalSearch.on('keyup', function (e) {
      // Clear previous timer if the user is still typing
      clearTimeout(searchDebounceTimer); // Set a new timer for delayed execution

      searchDebounceTimer = setTimeout(function () {
        var text = _this4.$globalSearch.val(); // Trigger the search if input is valid (Enter, Backspace, or more than 2 characters)


        if (e.keyCode === 13 || e.keyCode === 8 || text.length >= 2) {
          _this4.applyFilter(text);
        }
      }, 500); // 500ms delay before executing the search
    }); // Restore the saved search phrase from DataTables state

    var state = this.dataTable.state.loaded();

    if (state && state.search) {
      this.$globalSearch.val(state.search.search); // Set the search field with the saved value
    } // Retrieves the value of 'search' query parameter from the URL.


    var searchValue = this.getQueryParam('search'); // Sets the global search input value and applies the filter if a search value is provided.

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
    var nameTemplate = "\n            <div class=\"ui transparent fluid input inline-edit\">\n                <input class=\"caller-id-input\" type=\"text\" value=\"".concat(data.call_id, "\" />\n            </div>");
    var numberTemplate = "\n            <div class=\"ui transparent input inline-edit\">\n                <input class=\"number-input\" type=\"text\" value=\"".concat(data.number, "\" />\n            </div>");
    var deleteButtonTemplate = "\n            <div class=\"ui basic icon buttons action-buttons tiny\">\n                <a href=\"#\" data-value=\"".concat(data.DT_RowId, "\" class=\"ui delete button\">\n                    <i class=\"icon trash red\"></i>\n                </a>\n            </div>");
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
    var number = numberInputVal.replace(/\D+/g, '');
    number = "1".concat(number.substr(number.length - 9));
    var data = {
      call_id: callerId,
      number_rep: numberInputVal,
      number: number,
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
    var rowHeight = this.$recordsTable.find('tr').first().outerHeight(); // Calculate window height and available space for table

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9tb2R1bGUtcGhvbmVib29rLWRhdGF0YWJsZS5qcyJdLCJuYW1lcyI6WyJNb2R1bGVQaG9uZUJvb2tEVCIsIiRnbG9iYWxTZWFyY2giLCIkIiwiJHBhZ2VMZW5ndGhTZWxlY3RvciIsIiRzZWFyY2hFeHRlbnNpb25zSW5wdXQiLCJkYXRhVGFibGUiLCIkYm9keSIsIiRkaXNhYmxlSW5wdXRNYXNrVG9nZ2xlIiwiJHJlY29yZHNUYWJsZSIsIiRhZGROZXdCdXR0b24iLCJpbnB1dE51bWJlckpRVFBMIiwiJG1hc2tMaXN0IiwiZ2V0TmV3UmVjb3Jkc0FKQVhVcmwiLCJnbG9iYWxSb290VXJsIiwiZGVsZXRlUmVjb3JkQUpBWFVybCIsInNhdmVSZWNvcmRBSkFYVXJsIiwiaW5pdGlhbGl6ZSIsImluaXRpYWxpemVTZWFyY2giLCJpbml0aWFsaXplRGF0YVRhYmxlIiwiaW5pdGlhbGl6ZUV2ZW50TGlzdGVuZXJzIiwib24iLCJlIiwic2VhcmNoVGV4dCIsInZhbCIsInRyaW0iLCJrZXlDb2RlIiwibGVuZ3RoIiwiYXBwbHlGaWx0ZXIiLCJvbkZpZWxkRm9jdXMiLCJ0YXJnZXQiLCJzYXZlQ2hhbmdlc0ZvckFsbFJvd3MiLCJwcmV2ZW50RGVmYXVsdCIsImlkIiwiY2xvc2VzdCIsImRhdGEiLCJkZWxldGVSb3ciLCJkb2N1bWVudCIsImtleSIsImhhc0NsYXNzIiwiYWRkTmV3Um93IiwiZHJvcGRvd24iLCJvbkNoYW5nZSIsInBhZ2VMZW5ndGgiLCJjYWxjdWxhdGVQYWdlTGVuZ3RoIiwibG9jYWxTdG9yYWdlIiwicmVtb3ZlSXRlbSIsInNldEl0ZW0iLCJwYWdlIiwibGVuIiwiZHJhdyIsImV2ZW50Iiwic3RvcFByb3BhZ2F0aW9uIiwiJGlucHV0IiwidHJhbnNpdGlvbiIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJhdHRyIiwiJHJvd3MiLCJlYWNoIiwiXyIsInJvdyIsInJvd0lkIiwidW5kZWZpbmVkIiwic2VuZENoYW5nZXNUb1NlcnZlciIsIiRlbXB0eVJvdyIsInJlbW92ZSIsIm5ld0lkIiwiTWF0aCIsImZsb29yIiwicmFuZG9tIiwibmV3Um93VGVtcGxhdGUiLCJmaW5kIiwicHJlcGVuZCIsIiRuZXdSb3ciLCJmb2N1cyIsImluaXRpYWxpemVJbnB1dG1hc2siLCJzYXZlZFBhZ2VMZW5ndGgiLCJnZXRJdGVtIiwic2VhcmNoIiwic2VydmVyU2lkZSIsInByb2Nlc3NpbmciLCJhamF4IiwidXJsIiwidHlwZSIsImRhdGFTcmMiLCJjb2x1bW5zIiwicGFnaW5nIiwiZGVmZXJSZW5kZXIiLCJzRG9tIiwib3JkZXJpbmciLCJjcmVhdGVkUm93IiwiYnVpbGRSb3dUZW1wbGF0ZSIsImRyYXdDYWxsYmFjayIsImxhbmd1YWdlIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJkYXRhVGFibGVMb2NhbGlzYXRpb24iLCJEYXRhVGFibGUiLCJzZWFyY2hEZWJvdW5jZVRpbWVyIiwiY2xlYXJUaW1lb3V0Iiwic2V0VGltZW91dCIsInRleHQiLCJzdGF0ZSIsImxvYWRlZCIsInNlYXJjaFZhbHVlIiwiZ2V0UXVlcnlQYXJhbSIsIm5hbWVUZW1wbGF0ZSIsImNhbGxfaWQiLCJudW1iZXJUZW1wbGF0ZSIsIm51bWJlciIsImRlbGV0ZUJ1dHRvblRlbXBsYXRlIiwiRFRfUm93SWQiLCJlcSIsImh0bWwiLCIkY2hhbmdlZEZpZWxkcyIsIm9iaiIsIiRlbCIsImNoZWNrYm94IiwibWFza3NTb3J0IiwiSW5wdXRNYXNrUGF0dGVybnMiLCJpbnB1dG1hc2tzIiwiaW5wdXRtYXNrIiwiZGVmaW5pdGlvbnMiLCJ2YWxpZGF0b3IiLCJjYXJkaW5hbGl0eSIsInNob3dNYXNrT25Ib3ZlciIsIm9uQmVmb3JlUGFzdGUiLCJjYk9uTnVtYmVyQmVmb3JlUGFzdGUiLCJtYXRjaCIsInJlcGxhY2UiLCJsaXN0IiwibGlzdEtleSIsInJlY29yZElkIiwiY2FsbGVySWQiLCJudW1iZXJJbnB1dFZhbCIsInN1YnN0ciIsIm51bWJlcl9yZXAiLCJkaXNwbGF5U2F2aW5nSWNvbiIsImFwaSIsIm1ldGhvZCIsInN1Y2Nlc3NUZXN0IiwicmVzcG9uc2UiLCJzdWNjZXNzIiwib25TdWNjZXNzIiwib25TYXZlU3VjY2VzcyIsIm9uRmFpbHVyZSIsIlVzZXJNZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwibWVzc2FnZSIsIm9uRXJyb3IiLCJlcnJvck1lc3NhZ2UiLCJlbGVtZW50IiwieGhyIiwic3RhdHVzIiwid2luZG93IiwibG9jYXRpb24iLCJvbGRJZCIsIiR0YXJnZXQiLCJhcHBlbmQiLCJwYXN0ZWRWYWx1ZSIsInJvd0hlaWdodCIsImZpcnN0Iiwib3V0ZXJIZWlnaHQiLCJ3aW5kb3dIZWlnaHQiLCJpbm5lckhlaWdodCIsImhlYWRlckZvb3RlckhlaWdodCIsIm1heCIsInBhcmFtIiwidXJsUGFyYW1zIiwiVVJMU2VhcmNoUGFyYW1zIiwiZ2V0IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUVBLElBQU1BLGlCQUFpQixHQUFHO0FBRXRCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGFBQWEsRUFBRUMsQ0FBQyxDQUFDLGdCQUFELENBTk07O0FBUXRCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLG1CQUFtQixFQUFDRCxDQUFDLENBQUMscUJBQUQsQ0FaQzs7QUFjdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUUsRUFBQUEsc0JBQXNCLEVBQUVGLENBQUMsQ0FBQywwQkFBRCxDQWxCSDs7QUFxQnRCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lHLEVBQUFBLFNBQVMsRUFBRSxFQXpCVzs7QUEyQnRCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLEtBQUssRUFBRUosQ0FBQyxDQUFDLE1BQUQsQ0EvQmM7QUFpQ3RCO0FBQ0FLLEVBQUFBLHVCQUF1QixFQUFFTCxDQUFDLENBQUMscUJBQUQsQ0FsQ0o7O0FBb0N0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJTSxFQUFBQSxhQUFhLEVBQUVOLENBQUMsQ0FBQyxrQkFBRCxDQXhDTTs7QUEwQ3RCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lPLEVBQUFBLGFBQWEsRUFBRVAsQ0FBQyxDQUFDLGlCQUFELENBOUNNOztBQWdEdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSVEsRUFBQUEsZ0JBQWdCLEVBQUUsb0JBcERJOztBQXNEdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsU0FBUyxFQUFFLElBMURXO0FBNER0QjtBQUNBQyxFQUFBQSxvQkFBb0IsWUFBS0MsYUFBTCxvQ0E3REU7QUErRHRCQyxFQUFBQSxtQkFBbUIsWUFBS0QsYUFBTCw2QkEvREc7QUFpRXRCRSxFQUFBQSxpQkFBaUIsWUFBS0YsYUFBTCwyQkFqRUs7O0FBbUV0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJRyxFQUFBQSxVQXZFc0Isd0JBdUVUO0FBQ1QsU0FBS0MsZ0JBQUw7QUFDQSxTQUFLQyxtQkFBTDtBQUNBLFNBQUtDLHdCQUFMO0FBQ0gsR0EzRXFCOztBQTZFdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUYsRUFBQUEsZ0JBakZzQiw4QkFpRkg7QUFBQTs7QUFDZixTQUFLaEIsYUFBTCxDQUFtQm1CLEVBQW5CLENBQXNCLE9BQXRCLEVBQStCLFVBQUNDLENBQUQsRUFBTztBQUNsQyxVQUFNQyxVQUFVLEdBQUcsS0FBSSxDQUFDckIsYUFBTCxDQUFtQnNCLEdBQW5CLEdBQXlCQyxJQUF6QixFQUFuQjs7QUFDQSxVQUFJSCxDQUFDLENBQUNJLE9BQUYsS0FBYyxFQUFkLElBQW9CSixDQUFDLENBQUNJLE9BQUYsS0FBYyxDQUFsQyxJQUF1Q0gsVUFBVSxDQUFDSSxNQUFYLEtBQXNCLENBQWpFLEVBQW9FO0FBQ2hFLFFBQUEsS0FBSSxDQUFDQyxXQUFMLENBQWlCTCxVQUFqQjtBQUNIO0FBQ0osS0FMRDtBQU1ILEdBeEZxQjs7QUEwRnRCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lILEVBQUFBLHdCQTlGc0Isc0NBOEZLO0FBQUE7O0FBRXZCO0FBQ0EsU0FBS2IsS0FBTCxDQUFXYyxFQUFYLENBQWMsU0FBZCxFQUF5QixpQ0FBekIsRUFBNEQsVUFBQ0MsQ0FBRCxFQUFPO0FBQy9ELE1BQUEsTUFBSSxDQUFDTyxZQUFMLENBQWtCMUIsQ0FBQyxDQUFDbUIsQ0FBQyxDQUFDUSxNQUFILENBQW5CO0FBQ0gsS0FGRCxFQUh1QixDQU92Qjs7QUFDQSxTQUFLdkIsS0FBTCxDQUFXYyxFQUFYLENBQWMsVUFBZCxFQUEwQixpQ0FBMUIsRUFBNkQsWUFBTTtBQUMvRCxNQUFBLE1BQUksQ0FBQ1UscUJBQUw7QUFDSCxLQUZELEVBUnVCLENBWXZCOztBQUNBLFNBQUt4QixLQUFMLENBQVdjLEVBQVgsQ0FBYyxPQUFkLEVBQXVCLFVBQXZCLEVBQW1DLFVBQUNDLENBQUQsRUFBTztBQUN0Q0EsTUFBQUEsQ0FBQyxDQUFDVSxjQUFGO0FBQ0EsVUFBTUMsRUFBRSxHQUFHOUIsQ0FBQyxDQUFDbUIsQ0FBQyxDQUFDUSxNQUFILENBQUQsQ0FBWUksT0FBWixDQUFvQixHQUFwQixFQUF5QkMsSUFBekIsQ0FBOEIsT0FBOUIsQ0FBWDs7QUFDQSxNQUFBLE1BQUksQ0FBQ0MsU0FBTCxDQUFlakMsQ0FBQyxDQUFDbUIsQ0FBQyxDQUFDUSxNQUFILENBQWhCLEVBQTRCRyxFQUE1QjtBQUNILEtBSkQsRUFidUIsQ0FtQnZCOztBQUNBOUIsSUFBQUEsQ0FBQyxDQUFDa0MsUUFBRCxDQUFELENBQVloQixFQUFaLENBQWUsU0FBZixFQUEwQixVQUFDQyxDQUFELEVBQU87QUFDN0IsVUFBSUEsQ0FBQyxDQUFDZ0IsR0FBRixLQUFVLE9BQVYsSUFBc0JoQixDQUFDLENBQUNnQixHQUFGLEtBQVUsS0FBVixJQUFtQixDQUFDbkMsQ0FBQyxDQUFDLFFBQUQsQ0FBRCxDQUFZb0MsUUFBWixDQUFxQixlQUFyQixDQUE5QyxFQUFzRjtBQUNsRixRQUFBLE1BQUksQ0FBQ1IscUJBQUw7QUFDSDtBQUNKLEtBSkQsRUFwQnVCLENBMEJ2Qjs7QUFDQSxTQUFLckIsYUFBTCxDQUFtQlcsRUFBbkIsQ0FBc0IsT0FBdEIsRUFBK0IsVUFBQ0MsQ0FBRCxFQUFPO0FBQ2xDQSxNQUFBQSxDQUFDLENBQUNVLGNBQUY7O0FBQ0EsTUFBQSxNQUFJLENBQUNRLFNBQUw7QUFDSCxLQUhELEVBM0J1QixDQWdDdkI7O0FBQ0EsU0FBS3BDLG1CQUFMLENBQXlCcUMsUUFBekIsQ0FBa0M7QUFDOUJDLE1BQUFBLFFBRDhCLG9CQUNyQkMsVUFEcUIsRUFDVDtBQUNqQixZQUFJQSxVQUFVLEtBQUcsTUFBakIsRUFBd0I7QUFDcEJBLFVBQUFBLFVBQVUsR0FBRyxLQUFLQyxtQkFBTCxFQUFiO0FBQ0FDLFVBQUFBLFlBQVksQ0FBQ0MsVUFBYixDQUF3QiwwQkFBeEI7QUFDSCxTQUhELE1BR087QUFDSEQsVUFBQUEsWUFBWSxDQUFDRSxPQUFiLENBQXFCLDBCQUFyQixFQUFpREosVUFBakQ7QUFDSDs7QUFDRDFDLFFBQUFBLGlCQUFpQixDQUFDSyxTQUFsQixDQUE0QjBDLElBQTVCLENBQWlDQyxHQUFqQyxDQUFxQ04sVUFBckMsRUFBaURPLElBQWpEO0FBQ0g7QUFUNkIsS0FBbEMsRUFqQ3VCLENBNkN2Qjs7QUFDQSxTQUFLOUMsbUJBQUwsQ0FBeUJpQixFQUF6QixDQUE0QixPQUE1QixFQUFxQyxVQUFTOEIsS0FBVCxFQUFnQjtBQUNqREEsTUFBQUEsS0FBSyxDQUFDQyxlQUFOLEdBRGlELENBQ3hCO0FBQzVCLEtBRkQ7QUFHSCxHQS9JcUI7O0FBa0p0QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0l2QixFQUFBQSxZQXZKc0Isd0JBdUpUd0IsTUF2SlMsRUF1SkQ7QUFDakJBLElBQUFBLE1BQU0sQ0FBQ0MsVUFBUCxDQUFrQixNQUFsQjtBQUNBRCxJQUFBQSxNQUFNLENBQUNuQixPQUFQLENBQWUsS0FBZixFQUFzQnFCLFdBQXRCLENBQWtDLGFBQWxDLEVBQWlEQyxRQUFqRCxDQUEwRCxlQUExRDtBQUNBSCxJQUFBQSxNQUFNLENBQUNJLElBQVAsQ0FBWSxVQUFaLEVBQXdCLEtBQXhCO0FBQ0gsR0EzSnFCOztBQTZKdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSTFCLEVBQUFBLHFCQWpLc0IsbUNBaUtFO0FBQUE7O0FBQ3BCLFFBQU0yQixLQUFLLEdBQUd2RCxDQUFDLENBQUMsZ0JBQUQsQ0FBRCxDQUFvQitCLE9BQXBCLENBQTRCLElBQTVCLENBQWQ7QUFDQXdCLElBQUFBLEtBQUssQ0FBQ0MsSUFBTixDQUFXLFVBQUNDLENBQUQsRUFBSUMsR0FBSixFQUFZO0FBQ25CLFVBQU1DLEtBQUssR0FBRzNELENBQUMsQ0FBQzBELEdBQUQsQ0FBRCxDQUFPSixJQUFQLENBQVksSUFBWixDQUFkOztBQUNBLFVBQUlLLEtBQUssS0FBS0MsU0FBZCxFQUF5QjtBQUNyQixRQUFBLE1BQUksQ0FBQ0MsbUJBQUwsQ0FBeUJGLEtBQXpCO0FBQ0g7QUFDSixLQUxEO0FBTUgsR0F6S3FCOztBQTJLdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSXRCLEVBQUFBLFNBL0tzQix1QkErS1Y7QUFDUixRQUFNeUIsU0FBUyxHQUFHOUQsQ0FBQyxDQUFDLG1CQUFELENBQW5CO0FBQ0EsUUFBSThELFNBQVMsQ0FBQ3RDLE1BQWQsRUFBc0JzQyxTQUFTLENBQUNDLE1BQVY7QUFFdEIsU0FBS25DLHFCQUFMO0FBRUEsUUFBTW9DLEtBQUssZ0JBQVNDLElBQUksQ0FBQ0MsS0FBTCxDQUFXRCxJQUFJLENBQUNFLE1BQUwsS0FBZ0IsR0FBM0IsQ0FBVCxDQUFYO0FBQ0EsUUFBTUMsY0FBYyxvQ0FDTkosS0FETSxncEJBQXBCO0FBWUEsU0FBSzFELGFBQUwsQ0FBbUIrRCxJQUFuQixDQUF3QixPQUF4QixFQUFpQ0MsT0FBakMsQ0FBeUNGLGNBQXpDO0FBQ0EsUUFBTUcsT0FBTyxHQUFHdkUsQ0FBQyxZQUFLZ0UsS0FBTCxFQUFqQjtBQUNBTyxJQUFBQSxPQUFPLENBQUNGLElBQVIsQ0FBYSxPQUFiLEVBQXNCbEIsVUFBdEIsQ0FBaUMsTUFBakM7QUFDQW9CLElBQUFBLE9BQU8sQ0FBQ0YsSUFBUixDQUFhLGtCQUFiLEVBQWlDRyxLQUFqQztBQUNBLFNBQUtDLG1CQUFMLENBQXlCRixPQUFPLENBQUNGLElBQVIsQ0FBYSxlQUFiLENBQXpCO0FBQ0gsR0F2TXFCOztBQXlNdEI7QUFDSjtBQUNBO0FBQ0lyRCxFQUFBQSxtQkE1TXNCLGlDQTRNQTtBQUFBOztBQUVsQjtBQUNBLFFBQU0wRCxlQUFlLEdBQUdoQyxZQUFZLENBQUNpQyxPQUFiLENBQXFCLDBCQUFyQixDQUF4QjtBQUNBLFFBQU1uQyxVQUFVLEdBQUdrQyxlQUFlLEdBQUdBLGVBQUgsR0FBcUIsS0FBS2pDLG1CQUFMLEVBQXZEO0FBRUEsU0FBS25DLGFBQUwsQ0FBbUJILFNBQW5CLENBQTZCO0FBQ3pCeUUsTUFBQUEsTUFBTSxFQUFFO0FBQUVBLFFBQUFBLE1BQU0sRUFBRSxLQUFLN0UsYUFBTCxDQUFtQnNCLEdBQW5CO0FBQVYsT0FEaUI7QUFFekJ3RCxNQUFBQSxVQUFVLEVBQUUsSUFGYTtBQUd6QkMsTUFBQUEsVUFBVSxFQUFFLElBSGE7QUFJekJDLE1BQUFBLElBQUksRUFBRTtBQUNGQyxRQUFBQSxHQUFHLEVBQUUsS0FBS3RFLG9CQURSO0FBRUZ1RSxRQUFBQSxJQUFJLEVBQUUsTUFGSjtBQUdGQyxRQUFBQSxPQUFPLEVBQUU7QUFIUCxPQUptQjtBQVN6QkMsTUFBQUEsT0FBTyxFQUFFLENBQ0w7QUFBRW5ELFFBQUFBLElBQUksRUFBRTtBQUFSLE9BREssRUFFTDtBQUFFQSxRQUFBQSxJQUFJLEVBQUU7QUFBUixPQUZLLEVBR0w7QUFBRUEsUUFBQUEsSUFBSSxFQUFFO0FBQVIsT0FISyxFQUlMO0FBQUVBLFFBQUFBLElBQUksRUFBRTtBQUFSLE9BSkssQ0FUZ0I7QUFlekJvRCxNQUFBQSxNQUFNLEVBQUUsSUFmaUI7QUFnQnpCNUMsTUFBQUEsVUFBVSxFQUFFQSxVQWhCYTtBQWlCekI2QyxNQUFBQSxXQUFXLEVBQUUsSUFqQlk7QUFrQnpCQyxNQUFBQSxJQUFJLEVBQUUsTUFsQm1CO0FBbUJ6QkMsTUFBQUEsUUFBUSxFQUFFLEtBbkJlO0FBb0J6QkMsTUFBQUEsVUFBVSxFQUFFLG9CQUFDOUIsR0FBRCxFQUFNMUIsSUFBTixFQUFlO0FBQ3ZCLFFBQUEsTUFBSSxDQUFDeUQsZ0JBQUwsQ0FBc0IvQixHQUF0QixFQUEyQjFCLElBQTNCO0FBQ0gsT0F0QndCO0FBdUJ6QjBELE1BQUFBLFlBQVksRUFBRSx3QkFBTTtBQUNoQixRQUFBLE1BQUksQ0FBQ2pCLG1CQUFMLENBQXlCekUsQ0FBQyxDQUFDLE1BQUksQ0FBQ1EsZ0JBQU4sQ0FBMUI7QUFDSCxPQXpCd0I7QUEwQnpCbUYsTUFBQUEsUUFBUSxFQUFFQyxvQkFBb0IsQ0FBQ0M7QUExQk4sS0FBN0I7QUE2QkEsU0FBSzFGLFNBQUwsR0FBaUIsS0FBS0csYUFBTCxDQUFtQndGLFNBQW5CLEVBQWpCLENBbkNrQixDQXNDbEI7O0FBQ0EsUUFBSXBCLGVBQUosRUFBcUI7QUFDakIsV0FBS3pFLG1CQUFMLENBQXlCcUMsUUFBekIsQ0FBa0MsV0FBbEMsRUFBK0NvQyxlQUEvQztBQUNILEtBekNpQixDQTRDbEI7OztBQUNBLFFBQUlxQixtQkFBbUIsR0FBRyxJQUExQjtBQUVBLFNBQUtoRyxhQUFMLENBQW1CbUIsRUFBbkIsQ0FBc0IsT0FBdEIsRUFBK0IsVUFBQ0MsQ0FBRCxFQUFPO0FBQ2xDO0FBQ0E2RSxNQUFBQSxZQUFZLENBQUNELG1CQUFELENBQVosQ0FGa0MsQ0FJbEM7O0FBQ0FBLE1BQUFBLG1CQUFtQixHQUFHRSxVQUFVLENBQUMsWUFBTTtBQUNuQyxZQUFNQyxJQUFJLEdBQUcsTUFBSSxDQUFDbkcsYUFBTCxDQUFtQnNCLEdBQW5CLEVBQWIsQ0FEbUMsQ0FFbkM7OztBQUNBLFlBQUlGLENBQUMsQ0FBQ0ksT0FBRixLQUFjLEVBQWQsSUFBb0JKLENBQUMsQ0FBQ0ksT0FBRixLQUFjLENBQWxDLElBQXVDMkUsSUFBSSxDQUFDMUUsTUFBTCxJQUFlLENBQTFELEVBQTZEO0FBQ3pELFVBQUEsTUFBSSxDQUFDQyxXQUFMLENBQWlCeUUsSUFBakI7QUFDSDtBQUNKLE9BTitCLEVBTTdCLEdBTjZCLENBQWhDLENBTGtDLENBV3pCO0FBQ1osS0FaRCxFQS9Da0IsQ0E2RGxCOztBQUNBLFFBQU1DLEtBQUssR0FBRyxLQUFLaEcsU0FBTCxDQUFlZ0csS0FBZixDQUFxQkMsTUFBckIsRUFBZDs7QUFDQSxRQUFJRCxLQUFLLElBQUlBLEtBQUssQ0FBQ3ZCLE1BQW5CLEVBQTJCO0FBQ3ZCLFdBQUs3RSxhQUFMLENBQW1Cc0IsR0FBbkIsQ0FBdUI4RSxLQUFLLENBQUN2QixNQUFOLENBQWFBLE1BQXBDLEVBRHVCLENBQ3NCO0FBQ2hELEtBakVpQixDQW1FbEI7OztBQUNBLFFBQU15QixXQUFXLEdBQUcsS0FBS0MsYUFBTCxDQUFtQixRQUFuQixDQUFwQixDQXBFa0IsQ0FzRWxCOztBQUNBLFFBQUlELFdBQUosRUFBaUI7QUFDYixXQUFLdEcsYUFBTCxDQUFtQnNCLEdBQW5CLENBQXVCZ0YsV0FBdkI7QUFDQSxXQUFLNUUsV0FBTCxDQUFpQjRFLFdBQWpCO0FBQ0g7O0FBRUQsU0FBS2xHLFNBQUwsQ0FBZWUsRUFBZixDQUFrQixNQUFsQixFQUEwQixZQUFNO0FBQzVCLE1BQUEsTUFBSSxDQUFDbkIsYUFBTCxDQUFtQmdDLE9BQW5CLENBQTJCLEtBQTNCLEVBQWtDcUIsV0FBbEMsQ0FBOEMsU0FBOUM7QUFDSCxLQUZEO0FBR0gsR0EzUnFCOztBQTZSdEI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lxQyxFQUFBQSxnQkFuU3NCLDRCQW1TTC9CLEdBblNLLEVBbVNBMUIsSUFuU0EsRUFtU007QUFDeEIsUUFBTXVFLFlBQVksMEpBRTBDdkUsSUFBSSxDQUFDd0UsT0FGL0MsOEJBQWxCO0FBSUEsUUFBTUMsY0FBYyxpSkFFcUN6RSxJQUFJLENBQUMwRSxNQUYxQyw4QkFBcEI7QUFJQSxRQUFNQyxvQkFBb0IsaUlBRVEzRSxJQUFJLENBQUM0RSxRQUZiLG1JQUExQjtBQU9BNUcsSUFBQUEsQ0FBQyxDQUFDLElBQUQsRUFBTzBELEdBQVAsQ0FBRCxDQUFhbUQsRUFBYixDQUFnQixDQUFoQixFQUFtQkMsSUFBbkIsQ0FBd0IscUNBQXhCO0FBQ0E5RyxJQUFBQSxDQUFDLENBQUMsSUFBRCxFQUFPMEQsR0FBUCxDQUFELENBQWFtRCxFQUFiLENBQWdCLENBQWhCLEVBQW1CQyxJQUFuQixDQUF3QlAsWUFBeEI7QUFDQXZHLElBQUFBLENBQUMsQ0FBQyxJQUFELEVBQU8wRCxHQUFQLENBQUQsQ0FBYW1ELEVBQWIsQ0FBZ0IsQ0FBaEIsRUFBbUJDLElBQW5CLENBQXdCTCxjQUF4QjtBQUNBekcsSUFBQUEsQ0FBQyxDQUFDLElBQUQsRUFBTzBELEdBQVAsQ0FBRCxDQUFhbUQsRUFBYixDQUFnQixDQUFoQixFQUFtQkMsSUFBbkIsQ0FBd0JILG9CQUF4QjtBQUNILEdBdlRxQjs7QUF5VHRCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSWxGLEVBQUFBLFdBOVRzQix1QkE4VFZ5RSxJQTlUVSxFQThUSjtBQUNkLFFBQU1hLGNBQWMsR0FBRy9HLENBQUMsQ0FBQyxnQkFBRCxDQUF4QjtBQUNBK0csSUFBQUEsY0FBYyxDQUFDdkQsSUFBZixDQUFvQixVQUFDQyxDQUFELEVBQUl1RCxHQUFKLEVBQVk7QUFDNUIsVUFBTTlELE1BQU0sR0FBR2xELENBQUMsQ0FBQ2dILEdBQUQsQ0FBRCxDQUFPM0MsSUFBUCxDQUFZLE9BQVosQ0FBZjtBQUNBbkIsTUFBQUEsTUFBTSxDQUFDN0IsR0FBUCxDQUFXNkIsTUFBTSxDQUFDbEIsSUFBUCxDQUFZLE9BQVosQ0FBWDtBQUNBa0IsTUFBQUEsTUFBTSxDQUFDSSxJQUFQLENBQVksVUFBWixFQUF3QixJQUF4QjtBQUNBdEQsTUFBQUEsQ0FBQyxDQUFDZ0gsR0FBRCxDQUFELENBQU81RCxXQUFQLENBQW1CLGVBQW5CLEVBQW9DQyxRQUFwQyxDQUE2QyxhQUE3QztBQUNILEtBTEQ7QUFNQSxTQUFLbEQsU0FBTCxDQUFleUUsTUFBZixDQUFzQnNCLElBQXRCLEVBQTRCbkQsSUFBNUI7QUFDQSxTQUFLaEQsYUFBTCxDQUFtQmdDLE9BQW5CLENBQTJCLEtBQTNCLEVBQWtDc0IsUUFBbEMsQ0FBMkMsU0FBM0M7QUFDSCxHQXhVcUI7O0FBMFV0QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lvQixFQUFBQSxtQkEvVXNCLCtCQStVRndDLEdBL1VFLEVBK1VHO0FBQ3JCLFFBQUksS0FBSzVHLHVCQUFMLENBQTZCNkcsUUFBN0IsQ0FBc0MsWUFBdEMsQ0FBSixFQUF5RDs7QUFFekQsUUFBSSxLQUFLekcsU0FBTCxLQUFtQixJQUF2QixFQUE2QjtBQUN6QixXQUFLQSxTQUFMLEdBQWlCVCxDQUFDLENBQUNtSCxTQUFGLENBQVlDLGlCQUFaLEVBQStCLENBQUMsR0FBRCxDQUEvQixFQUFzQyxTQUF0QyxFQUFpRCxNQUFqRCxDQUFqQjtBQUNIOztBQUVESCxJQUFBQSxHQUFHLENBQUNJLFVBQUosQ0FBZTtBQUNYQyxNQUFBQSxTQUFTLEVBQUU7QUFDUEMsUUFBQUEsV0FBVyxFQUFFO0FBQ1QsZUFBSztBQUFFQyxZQUFBQSxTQUFTLEVBQUUsT0FBYjtBQUFzQkMsWUFBQUEsV0FBVyxFQUFFO0FBQW5DO0FBREksU0FETjtBQUlQQyxRQUFBQSxlQUFlLEVBQUUsS0FKVjtBQUtQQyxRQUFBQSxhQUFhLEVBQUUsS0FBS0M7QUFMYixPQURBO0FBUVhDLE1BQUFBLEtBQUssRUFBRSxPQVJJO0FBU1hDLE1BQUFBLE9BQU8sRUFBRSxHQVRFO0FBVVhDLE1BQUFBLElBQUksRUFBRSxLQUFLdEgsU0FWQTtBQVdYdUgsTUFBQUEsT0FBTyxFQUFFO0FBWEUsS0FBZjtBQWFILEdBbldxQjs7QUFxV3RCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSW5FLEVBQUFBLG1CQTFXc0IsK0JBMFdGb0UsUUExV0UsRUEwV1E7QUFBQTs7QUFDMUIsUUFBTUMsUUFBUSxHQUFHbEksQ0FBQyxjQUFPaUksUUFBUCx1QkFBRCxDQUFxQzVHLEdBQXJDLEVBQWpCO0FBQ0EsUUFBTThHLGNBQWMsR0FBR25JLENBQUMsY0FBT2lJLFFBQVAsb0JBQUQsQ0FBa0M1RyxHQUFsQyxFQUF2QjtBQUVBLFFBQUksQ0FBQzZHLFFBQUQsSUFBYSxDQUFDQyxjQUFsQixFQUFrQztBQUVsQyxRQUFJekIsTUFBTSxHQUFHeUIsY0FBYyxDQUFDTCxPQUFmLENBQXVCLE1BQXZCLEVBQStCLEVBQS9CLENBQWI7QUFDQXBCLElBQUFBLE1BQU0sY0FBT0EsTUFBTSxDQUFDMEIsTUFBUCxDQUFjMUIsTUFBTSxDQUFDbEYsTUFBUCxHQUFnQixDQUE5QixDQUFQLENBQU47QUFFQSxRQUFNUSxJQUFJLEdBQUc7QUFDVHdFLE1BQUFBLE9BQU8sRUFBRTBCLFFBREE7QUFFVEcsTUFBQUEsVUFBVSxFQUFFRixjQUZIO0FBR1R6QixNQUFBQSxNQUFNLEVBQU5BLE1BSFM7QUFJVDVFLE1BQUFBLEVBQUUsRUFBRW1HO0FBSkssS0FBYjtBQU9BLFNBQUtLLGlCQUFMLENBQXVCTCxRQUF2QjtBQUVBakksSUFBQUEsQ0FBQyxDQUFDdUksR0FBRixDQUFNO0FBQ0Z2RCxNQUFBQSxHQUFHLEVBQUUsS0FBS25FLGlCQURSO0FBRUYySCxNQUFBQSxNQUFNLEVBQUUsTUFGTjtBQUdGdEgsTUFBQUEsRUFBRSxFQUFFLEtBSEY7QUFJRmMsTUFBQUEsSUFBSSxFQUFKQSxJQUpFO0FBS0Z5RyxNQUFBQSxXQUFXLEVBQUUscUJBQUNDLFFBQUQ7QUFBQSxlQUFjQSxRQUFRLElBQUlBLFFBQVEsQ0FBQ0MsT0FBVCxLQUFxQixJQUEvQztBQUFBLE9BTFg7QUFNRkMsTUFBQUEsU0FBUyxFQUFFLG1CQUFDRixRQUFEO0FBQUEsZUFBYyxNQUFJLENBQUNHLGFBQUwsQ0FBbUJILFFBQW5CLEVBQTZCVCxRQUE3QixDQUFkO0FBQUEsT0FOVDtBQU9GYSxNQUFBQSxTQUFTLEVBQUUsbUJBQUNKLFFBQUQ7QUFBQSxlQUFjSyxXQUFXLENBQUNDLGVBQVosQ0FBNEJOLFFBQVEsQ0FBQ08sT0FBckMsQ0FBZDtBQUFBLE9BUFQ7QUFRRkMsTUFBQUEsT0FBTyxFQUFFLGlCQUFDQyxZQUFELEVBQWVDLE9BQWYsRUFBd0JDLEdBQXhCLEVBQWdDO0FBQ3JDLFlBQUlBLEdBQUcsQ0FBQ0MsTUFBSixLQUFlLEdBQW5CLEVBQXdCQyxNQUFNLENBQUNDLFFBQVAsYUFBcUI3SSxhQUFyQjtBQUMzQjtBQVZDLEtBQU47QUFZSCxHQXhZcUI7O0FBMFl0QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0kySCxFQUFBQSxpQkEvWXNCLDZCQStZSkwsUUEvWUksRUErWU07QUFDeEJqSSxJQUFBQSxDQUFDLGNBQU9pSSxRQUFQLG1CQUFELENBQ0s3RSxXQURMLENBQ2lCLGFBRGpCLEVBRUtDLFFBRkwsQ0FFYyxpQkFGZDtBQUdILEdBblpxQjs7QUFxWnRCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJd0YsRUFBQUEsYUEzWnNCLHlCQTJaUkgsUUEzWlEsRUEyWkVULFFBM1pGLEVBMlpZO0FBQzlCLFFBQUlTLFFBQVEsQ0FBQzFHLElBQWIsRUFBbUI7QUFDZixVQUFJeUgsS0FBSyxHQUFHZixRQUFRLENBQUMxRyxJQUFULENBQWN5SCxLQUFkLElBQXVCeEIsUUFBbkM7QUFDQWpJLE1BQUFBLENBQUMsY0FBT3lKLEtBQVAsWUFBRCxDQUF1Qm5HLElBQXZCLENBQTRCLFVBQTVCLEVBQXdDLElBQXhDO0FBQ0F0RCxNQUFBQSxDQUFDLGNBQU95SixLQUFQLFVBQUQsQ0FBcUJyRyxXQUFyQixDQUFpQyx1QkFBakMsRUFBMERDLFFBQTFELENBQW1FLGFBQW5FO0FBQ0FyRCxNQUFBQSxDQUFDLGNBQU95SixLQUFQLHVCQUFELENBQWtDcEcsUUFBbEMsQ0FBMkMsYUFBM0MsRUFBMERELFdBQTFELENBQXNFLGlCQUF0RTs7QUFDQSxVQUFJcUcsS0FBSyxLQUFLZixRQUFRLENBQUMxRyxJQUFULENBQWNnQyxLQUE1QixFQUFtQztBQUMvQmhFLFFBQUFBLENBQUMsY0FBT3lKLEtBQVAsRUFBRCxDQUFpQm5HLElBQWpCLENBQXNCLElBQXRCLEVBQTRCb0YsUUFBUSxDQUFDMUcsSUFBVCxDQUFjZ0MsS0FBMUM7QUFDSDtBQUNKO0FBQ0osR0FyYXFCOztBQXVhdEI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0kvQixFQUFBQSxTQTdhc0IscUJBNmFaeUgsT0E3YVksRUE2YUg1SCxFQTdhRyxFQTZhQztBQUFBOztBQUNuQixRQUFJQSxFQUFFLEtBQUssS0FBWCxFQUFrQjtBQUNkNEgsTUFBQUEsT0FBTyxDQUFDM0gsT0FBUixDQUFnQixJQUFoQixFQUFzQmdDLE1BQXRCO0FBQ0E7QUFDSDs7QUFFRC9ELElBQUFBLENBQUMsQ0FBQ3VJLEdBQUYsQ0FBTTtBQUNGdkQsTUFBQUEsR0FBRyxZQUFLLEtBQUtwRSxtQkFBVixjQUFpQ2tCLEVBQWpDLENBREQ7QUFFRlosTUFBQUEsRUFBRSxFQUFFLEtBRkY7QUFHRjBILE1BQUFBLFNBQVMsRUFBRSxtQkFBQ0YsUUFBRCxFQUFjO0FBQ3JCLFlBQUlBLFFBQVEsQ0FBQ0MsT0FBYixFQUFzQjtBQUNsQmUsVUFBQUEsT0FBTyxDQUFDM0gsT0FBUixDQUFnQixJQUFoQixFQUFzQmdDLE1BQXRCOztBQUNBLGNBQUksTUFBSSxDQUFDekQsYUFBTCxDQUFtQitELElBQW5CLENBQXdCLFlBQXhCLEVBQXNDN0MsTUFBdEMsS0FBaUQsQ0FBckQsRUFBd0Q7QUFDcEQsWUFBQSxNQUFJLENBQUNsQixhQUFMLENBQW1CK0QsSUFBbkIsQ0FBd0IsT0FBeEIsRUFBaUNzRixNQUFqQyxDQUF3Qyx1QkFBeEM7QUFDSDtBQUNKO0FBQ0o7QUFWQyxLQUFOO0FBWUgsR0EvYnFCOztBQWljdEI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0kvQixFQUFBQSxxQkF2Y3NCLGlDQXVjQWdDLFdBdmNBLEVBdWNhO0FBQy9CLFdBQU9BLFdBQVcsQ0FBQzlCLE9BQVosQ0FBb0IsTUFBcEIsRUFBNEIsRUFBNUIsQ0FBUDtBQUNILEdBemNxQjs7QUEyY3RCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSXJGLEVBQUFBLG1CQWhkc0IsaUNBZ2RBO0FBQ2xCO0FBQ0EsUUFBSW9ILFNBQVMsR0FBRyxLQUFLdkosYUFBTCxDQUFtQitELElBQW5CLENBQXdCLElBQXhCLEVBQThCeUYsS0FBOUIsR0FBc0NDLFdBQXRDLEVBQWhCLENBRmtCLENBSWxCOztBQUNBLFFBQU1DLFlBQVksR0FBR1QsTUFBTSxDQUFDVSxXQUE1QjtBQUNBLFFBQU1DLGtCQUFrQixHQUFHLEdBQTNCLENBTmtCLENBTWM7QUFFaEM7O0FBQ0EsV0FBT2pHLElBQUksQ0FBQ2tHLEdBQUwsQ0FBU2xHLElBQUksQ0FBQ0MsS0FBTCxDQUFXLENBQUM4RixZQUFZLEdBQUdFLGtCQUFoQixJQUFzQ0wsU0FBakQsQ0FBVCxFQUFzRSxDQUF0RSxDQUFQO0FBQ0gsR0ExZHFCOztBQTRkdEI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0l2RCxFQUFBQSxhQWxlc0IseUJBa2VSOEQsS0FsZVEsRUFrZUQ7QUFDakIsUUFBTUMsU0FBUyxHQUFHLElBQUlDLGVBQUosQ0FBb0JmLE1BQU0sQ0FBQ0MsUUFBUCxDQUFnQjVFLE1BQXBDLENBQWxCO0FBQ0EsV0FBT3lGLFNBQVMsQ0FBQ0UsR0FBVixDQUFjSCxLQUFkLENBQVA7QUFDSDtBQXJlcUIsQ0FBMUI7QUF3ZUFwSyxDQUFDLENBQUNrQyxRQUFELENBQUQsQ0FBWXNJLEtBQVosQ0FBa0IsWUFBTTtBQUNwQjFLLEVBQUFBLGlCQUFpQixDQUFDZ0IsVUFBbEI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjQgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgU2VtYW50aWNMb2NhbGl6YXRpb24sIFVzZXJNZXNzYWdlLCBJbnB1dE1hc2tQYXR0ZXJucyAqL1xuXG5jb25zdCBNb2R1bGVQaG9uZUJvb2tEVCA9IHtcblxuICAgIC8qKlxuICAgICAqIFRoZSBnbG9iYWwgc2VhcmNoIGlucHV0IGVsZW1lbnQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZ2xvYmFsU2VhcmNoOiAkKCcjZ2xvYmFsLXNlYXJjaCcpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIHBhZ2UgbGVuZ3RoIHNlbGVjdG9yLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHBhZ2VMZW5ndGhTZWxlY3RvcjokKCcjcGFnZS1sZW5ndGgtc2VsZWN0JyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgcGFnZSBsZW5ndGggc2VsZWN0b3IuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc2VhcmNoRXh0ZW5zaW9uc0lucHV0OiAkKCcjc2VhcmNoLWV4dGVuc2lvbnMtaW5wdXQnKSxcblxuXG4gICAgLyoqXG4gICAgICogVGhlIGRhdGEgdGFibGUgb2JqZWN0LlxuICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICovXG4gICAgZGF0YVRhYmxlOiB7fSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBkb2N1bWVudCBib2R5LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGJvZHk6ICQoJ2JvZHknKSxcblxuICAgIC8vIENhY2hlZCBET00gZWxlbWVudHNcbiAgICAkZGlzYWJsZUlucHV0TWFza1RvZ2dsZTogJCgnI2Rpc2FibGUtaW5wdXQtbWFzaycpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGV4dGVuc2lvbnMgdGFibGUgZWxlbWVudC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRyZWNvcmRzVGFibGU6ICQoJyNwaG9uZWJvb2stdGFibGUnKSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBhZGQgbmV3IGJ1dHRvbiBlbGVtZW50LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGFkZE5ld0J1dHRvbjogJCgnI2FkZC1uZXctYnV0dG9uJyksXG5cbiAgICAvKipcbiAgICAgKiBTZWxlY3RvciBmb3IgbnVtYmVyIGlucHV0IGZpZWxkcy5cbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIGlucHV0TnVtYmVySlFUUEw6ICdpbnB1dC5udW1iZXItaW5wdXQnLFxuXG4gICAgLyoqXG4gICAgICogTGlzdCBvZiBpbnB1dCBtYXNrcy5cbiAgICAgKiBAdHlwZSB7bnVsbHxBcnJheX1cbiAgICAgKi9cbiAgICAkbWFza0xpc3Q6IG51bGwsXG5cbiAgICAvLyBVUkxzIGZvciBBSkFYIHJlcXVlc3RzXG4gICAgZ2V0TmV3UmVjb3Jkc0FKQVhVcmw6IGAke2dsb2JhbFJvb3RVcmx9bW9kdWxlLXBob25lLWJvb2svZ2V0TmV3UmVjb3Jkc2AsXG5cbiAgICBkZWxldGVSZWNvcmRBSkFYVXJsOiBgJHtnbG9iYWxSb290VXJsfW1vZHVsZS1waG9uZS1ib29rL2RlbGV0ZWAsXG5cbiAgICBzYXZlUmVjb3JkQUpBWFVybDogYCR7Z2xvYmFsUm9vdFVybH1tb2R1bGUtcGhvbmUtYm9vay9zYXZlYCxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIG1vZHVsZS5cbiAgICAgKiBUaGlzIGluY2x1ZGVzIHNldHRpbmcgdXAgZXZlbnQgbGlzdGVuZXJzIGFuZCBpbml0aWFsaXppbmcgdGhlIERhdGFUYWJsZS5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICB0aGlzLmluaXRpYWxpemVTZWFyY2goKTtcbiAgICAgICAgdGhpcy5pbml0aWFsaXplRGF0YVRhYmxlKCk7XG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUV2ZW50TGlzdGVuZXJzKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIHNlYXJjaCBmdW5jdGlvbmFsaXR5LlxuICAgICAqIEl0IGxpc3RlbnMgZm9yIGtleSBldmVudHMgYW5kIGFwcGxpZXMgYSBmaWx0ZXIgYmFzZWQgb24gdGhlIHVzZXIncyBpbnB1dC5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplU2VhcmNoKCkge1xuICAgICAgICB0aGlzLiRnbG9iYWxTZWFyY2gub24oJ2tleXVwJywgKGUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHNlYXJjaFRleHQgPSB0aGlzLiRnbG9iYWxTZWFyY2gudmFsKCkudHJpbSgpO1xuICAgICAgICAgICAgaWYgKGUua2V5Q29kZSA9PT0gMTMgfHwgZS5rZXlDb2RlID09PSA4IHx8IHNlYXJjaFRleHQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5hcHBseUZpbHRlcihzZWFyY2hUZXh0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgYWxsIGV2ZW50IGxpc3RlbmVycy5cbiAgICAgKiBIYW5kbGVzIGlucHV0IGZvY3VzLCBmb3JtIHN1Ym1pc3Npb24sIGFkZGluZyBuZXcgcm93cywgYW5kIGRlbGV0ZSBhY3Rpb25zLlxuICAgICAqL1xuICAgIGluaXRpYWxpemVFdmVudExpc3RlbmVycygpIHtcblxuICAgICAgICAvLyBIYW5kbGUgZm9jdXMgb24gaW5wdXQgZmllbGRzIGZvciBlZGl0aW5nXG4gICAgICAgIHRoaXMuJGJvZHkub24oJ2ZvY3VzaW4nLCAnLmNhbGxlci1pZC1pbnB1dCwgLm51bWJlci1pbnB1dCcsIChlKSA9PiB7XG4gICAgICAgICAgICB0aGlzLm9uRmllbGRGb2N1cygkKGUudGFyZ2V0KSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEhhbmRsZSBsb3NzIG9mIGZvY3VzIG9uIGlucHV0IGZpZWxkcyBhbmQgc2F2ZSBjaGFuZ2VzXG4gICAgICAgIHRoaXMuJGJvZHkub24oJ2ZvY3Vzb3V0JywgJy5jYWxsZXItaWQtaW5wdXQsIC5udW1iZXItaW5wdXQnLCAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnNhdmVDaGFuZ2VzRm9yQWxsUm93cygpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBIYW5kbGUgZGVsZXRlIGJ1dHRvbiBjbGlja1xuICAgICAgICB0aGlzLiRib2R5Lm9uKCdjbGljaycsICdhLmRlbGV0ZScsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCBpZCA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ2EnKS5kYXRhKCd2YWx1ZScpO1xuICAgICAgICAgICAgdGhpcy5kZWxldGVSb3coJChlLnRhcmdldCksIGlkKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSGFuZGxlIEVudGVyIG9yIFRhYiBrZXkgdG8gdHJpZ2dlciBmb3JtIHN1Ym1pc3Npb25cbiAgICAgICAgJChkb2N1bWVudCkub24oJ2tleWRvd24nLCAoZSkgPT4ge1xuICAgICAgICAgICAgaWYgKGUua2V5ID09PSAnRW50ZXInIHx8IChlLmtleSA9PT0gJ1RhYicgJiYgISQoJzpmb2N1cycpLmhhc0NsYXNzKCcubnVtYmVyLWlucHV0JykpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zYXZlQ2hhbmdlc0ZvckFsbFJvd3MoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSGFuZGxlIGFkZGluZyBhIG5ldyByb3dcbiAgICAgICAgdGhpcy4kYWRkTmV3QnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICB0aGlzLmFkZE5ld1JvdygpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBIYW5kbGUgcGFnZSBsZW5ndGggc2VsZWN0aW9uXG4gICAgICAgIHRoaXMuJHBhZ2VMZW5ndGhTZWxlY3Rvci5kcm9wZG93bih7XG4gICAgICAgICAgICBvbkNoYW5nZShwYWdlTGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgaWYgKHBhZ2VMZW5ndGg9PT0nYXV0bycpe1xuICAgICAgICAgICAgICAgICAgICBwYWdlTGVuZ3RoID0gdGhpcy5jYWxjdWxhdGVQYWdlTGVuZ3RoKCk7XG4gICAgICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKCdwaG9uZWJvb2tUYWJsZVBhZ2VMZW5ndGgnKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgncGhvbmVib29rVGFibGVQYWdlTGVuZ3RoJywgcGFnZUxlbmd0aCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIE1vZHVsZVBob25lQm9va0RULmRhdGFUYWJsZS5wYWdlLmxlbihwYWdlTGVuZ3RoKS5kcmF3KCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBQcmV2ZW50IGV2ZW50IGJ1YmJsaW5nIG9uIGRyb3Bkb3duIGNsaWNrXG4gICAgICAgIHRoaXMuJHBhZ2VMZW5ndGhTZWxlY3Rvci5vbignY2xpY2snLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7IC8vIFByZXZlbnQgdGhlIGV2ZW50IGZyb20gYnViYmxpbmdcbiAgICAgICAgfSk7XG4gICAgfSxcblxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIGZvY3VzIGV2ZW50IG9uIGEgZmllbGQgYnkgYWRkaW5nIGEgZ2xvd2luZyBlZmZlY3QgYW5kIGVuYWJsaW5nIGVkaXRpbmcuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2pRdWVyeX0gJGlucHV0IC0gVGhlIGlucHV0IGZpZWxkIHRoYXQgcmVjZWl2ZWQgZm9jdXMuXG4gICAgICovXG4gICAgb25GaWVsZEZvY3VzKCRpbnB1dCkge1xuICAgICAgICAkaW5wdXQudHJhbnNpdGlvbignZ2xvdycpO1xuICAgICAgICAkaW5wdXQuY2xvc2VzdCgnZGl2JykucmVtb3ZlQ2xhc3MoJ3RyYW5zcGFyZW50JykuYWRkQ2xhc3MoJ2NoYW5nZWQtZmllbGQnKTtcbiAgICAgICAgJGlucHV0LmF0dHIoJ3JlYWRvbmx5JywgZmFsc2UpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTYXZlIGNoYW5nZXMgZm9yIGFsbCBtb2RpZmllZCByb3dzLlxuICAgICAqIEl0IHNlbmRzIHRoZSBjaGFuZ2VzIGZvciBlYWNoIG1vZGlmaWVkIHJvdyB0byB0aGUgc2VydmVyLlxuICAgICAqL1xuICAgIHNhdmVDaGFuZ2VzRm9yQWxsUm93cygpIHtcbiAgICAgICAgY29uc3QgJHJvd3MgPSAkKCcuY2hhbmdlZC1maWVsZCcpLmNsb3Nlc3QoJ3RyJyk7XG4gICAgICAgICRyb3dzLmVhY2goKF8sIHJvdykgPT4ge1xuICAgICAgICAgICAgY29uc3Qgcm93SWQgPSAkKHJvdykuYXR0cignaWQnKTtcbiAgICAgICAgICAgIGlmIChyb3dJZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZW5kQ2hhbmdlc1RvU2VydmVyKHJvd0lkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFkZCBhIG5ldyByb3cgdG8gdGhlIHBob25lYm9vayB0YWJsZS5cbiAgICAgKiBUaGUgcm93IGlzIGVkaXRhYmxlIGFuZCBhbGxvd3MgZm9yIGlucHV0IG9mIG5ldyBjb250YWN0IGluZm9ybWF0aW9uLlxuICAgICAqL1xuICAgIGFkZE5ld1JvdygpIHtcbiAgICAgICAgY29uc3QgJGVtcHR5Um93ID0gJCgnLmRhdGFUYWJsZXNfZW1wdHknKTtcbiAgICAgICAgaWYgKCRlbXB0eVJvdy5sZW5ndGgpICRlbXB0eVJvdy5yZW1vdmUoKTtcblxuICAgICAgICB0aGlzLnNhdmVDaGFuZ2VzRm9yQWxsUm93cygpO1xuXG4gICAgICAgIGNvbnN0IG5ld0lkID0gYG5ldyR7TWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogNTAwKX1gO1xuICAgICAgICBjb25zdCBuZXdSb3dUZW1wbGF0ZSA9IGBcbiAgICAgICAgICAgIDx0ciBpZD1cIiR7bmV3SWR9XCI+XG4gICAgICAgICAgICAgICAgPHRkPjxpIGNsYXNzPVwidWkgdXNlciBjaXJjbGUgaWNvblwiPjwvaT48L3RkPlxuICAgICAgICAgICAgICAgIDx0ZD48ZGl2IGNsYXNzPVwidWkgZmx1aWQgaW5wdXQgaW5saW5lLWVkaXQgY2hhbmdlZC1maWVsZFwiPjxpbnB1dCBjbGFzcz1cImNhbGxlci1pZC1pbnB1dFwiIHR5cGU9XCJ0ZXh0XCIgdmFsdWU9XCJcIj48L2Rpdj48L3RkPlxuICAgICAgICAgICAgICAgIDx0ZD48ZGl2IGNsYXNzPVwidWkgZmx1aWQgaW5wdXQgaW5saW5lLWVkaXQgY2hhbmdlZC1maWVsZFwiPjxpbnB1dCBjbGFzcz1cIm51bWJlci1pbnB1dFwiIHR5cGU9XCJ0ZXh0XCIgdmFsdWU9XCJcIj48L2Rpdj48L3RkPlxuICAgICAgICAgICAgICAgIDx0ZD48ZGl2IGNsYXNzPVwidWkgYmFzaWMgaWNvbiBidXR0b25zIGFjdGlvbi1idXR0b25zIHRpbnlcIj5cbiAgICAgICAgICAgICAgICAgICAgPGEgaHJlZj1cIiNcIiBjbGFzcz1cInVpIGJ1dHRvbiBkZWxldGVcIiBkYXRhLXZhbHVlPVwibmV3XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImljb24gdHJhc2ggcmVkXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICA8L2E+XG4gICAgICAgICAgICAgICAgPC9kaXY+PC90ZD5cbiAgICAgICAgICAgIDwvdHI+YDtcblxuICAgICAgICB0aGlzLiRyZWNvcmRzVGFibGUuZmluZCgndGJvZHknKS5wcmVwZW5kKG5ld1Jvd1RlbXBsYXRlKTtcbiAgICAgICAgY29uc3QgJG5ld1JvdyA9ICQoYCMke25ld0lkfWApO1xuICAgICAgICAkbmV3Um93LmZpbmQoJ2lucHV0JykudHJhbnNpdGlvbignZ2xvdycpO1xuICAgICAgICAkbmV3Um93LmZpbmQoJy5jYWxsZXItaWQtaW5wdXQnKS5mb2N1cygpO1xuICAgICAgICB0aGlzLmluaXRpYWxpemVJbnB1dG1hc2soJG5ld1Jvdy5maW5kKCcubnVtYmVyLWlucHV0JykpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBEYXRhVGFibGUgaW5zdGFuY2Ugd2l0aCB0aGUgcmVxdWlyZWQgc2V0dGluZ3MgYW5kIG9wdGlvbnMuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURhdGFUYWJsZSgpIHtcblxuICAgICAgICAvLyBHZXQgdGhlIHVzZXIncyBzYXZlZCB2YWx1ZSBvciB1c2UgdGhlIGF1dG9tYXRpY2FsbHkgY2FsY3VsYXRlZCB2YWx1ZSBpZiBub25lIGV4aXN0c1xuICAgICAgICBjb25zdCBzYXZlZFBhZ2VMZW5ndGggPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgncGhvbmVib29rVGFibGVQYWdlTGVuZ3RoJyk7XG4gICAgICAgIGNvbnN0IHBhZ2VMZW5ndGggPSBzYXZlZFBhZ2VMZW5ndGggPyBzYXZlZFBhZ2VMZW5ndGggOiB0aGlzLmNhbGN1bGF0ZVBhZ2VMZW5ndGgoKTtcblxuICAgICAgICB0aGlzLiRyZWNvcmRzVGFibGUuZGF0YVRhYmxlKHtcbiAgICAgICAgICAgIHNlYXJjaDogeyBzZWFyY2g6IHRoaXMuJGdsb2JhbFNlYXJjaC52YWwoKSB9LFxuICAgICAgICAgICAgc2VydmVyU2lkZTogdHJ1ZSxcbiAgICAgICAgICAgIHByb2Nlc3Npbmc6IHRydWUsXG4gICAgICAgICAgICBhamF4OiB7XG4gICAgICAgICAgICAgICAgdXJsOiB0aGlzLmdldE5ld1JlY29yZHNBSkFYVXJsLFxuICAgICAgICAgICAgICAgIHR5cGU6ICdQT1NUJyxcbiAgICAgICAgICAgICAgICBkYXRhU3JjOiAnZGF0YScsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY29sdW1uczogW1xuICAgICAgICAgICAgICAgIHsgZGF0YTogbnVsbCB9LFxuICAgICAgICAgICAgICAgIHsgZGF0YTogJ2NhbGxfaWQnIH0sXG4gICAgICAgICAgICAgICAgeyBkYXRhOiAnbnVtYmVyJyB9LFxuICAgICAgICAgICAgICAgIHsgZGF0YTogbnVsbCB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIHBhZ2luZzogdHJ1ZSxcbiAgICAgICAgICAgIHBhZ2VMZW5ndGg6IHBhZ2VMZW5ndGgsXG4gICAgICAgICAgICBkZWZlclJlbmRlcjogdHJ1ZSxcbiAgICAgICAgICAgIHNEb206ICdydGlwJyxcbiAgICAgICAgICAgIG9yZGVyaW5nOiBmYWxzZSxcbiAgICAgICAgICAgIGNyZWF0ZWRSb3c6IChyb3csIGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLmJ1aWxkUm93VGVtcGxhdGUocm93LCBkYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkcmF3Q2FsbGJhY2s6ICgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLmluaXRpYWxpemVJbnB1dG1hc2soJCh0aGlzLmlucHV0TnVtYmVySlFUUEwpKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBsYW5ndWFnZTogU2VtYW50aWNMb2NhbGl6YXRpb24uZGF0YVRhYmxlTG9jYWxpc2F0aW9uLFxuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmRhdGFUYWJsZSA9IHRoaXMuJHJlY29yZHNUYWJsZS5EYXRhVGFibGUoKTtcblxuXG4gICAgICAgIC8vIFNldCB0aGUgc2VsZWN0IGlucHV0IHZhbHVlIHRvIHRoZSBzYXZlZCB2YWx1ZSBpZiBpdCBleGlzdHNcbiAgICAgICAgaWYgKHNhdmVkUGFnZUxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy4kcGFnZUxlbmd0aFNlbGVjdG9yLmRyb3Bkb3duKCdzZXQgdmFsdWUnLCBzYXZlZFBhZ2VMZW5ndGgpO1xuICAgICAgICB9XG5cblxuICAgICAgICAvLyBJbml0aWFsaXplIGRlYm91bmNlIHRpbWVyIHZhcmlhYmxlXG4gICAgICAgIGxldCBzZWFyY2hEZWJvdW5jZVRpbWVyID0gbnVsbDtcblxuICAgICAgICB0aGlzLiRnbG9iYWxTZWFyY2gub24oJ2tleXVwJywgKGUpID0+IHtcbiAgICAgICAgICAgIC8vIENsZWFyIHByZXZpb3VzIHRpbWVyIGlmIHRoZSB1c2VyIGlzIHN0aWxsIHR5cGluZ1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHNlYXJjaERlYm91bmNlVGltZXIpO1xuXG4gICAgICAgICAgICAvLyBTZXQgYSBuZXcgdGltZXIgZm9yIGRlbGF5ZWQgZXhlY3V0aW9uXG4gICAgICAgICAgICBzZWFyY2hEZWJvdW5jZVRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgdGV4dCA9IHRoaXMuJGdsb2JhbFNlYXJjaC52YWwoKTtcbiAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIHRoZSBzZWFyY2ggaWYgaW5wdXQgaXMgdmFsaWQgKEVudGVyLCBCYWNrc3BhY2UsIG9yIG1vcmUgdGhhbiAyIGNoYXJhY3RlcnMpXG4gICAgICAgICAgICAgICAgaWYgKGUua2V5Q29kZSA9PT0gMTMgfHwgZS5rZXlDb2RlID09PSA4IHx8IHRleHQubGVuZ3RoID49IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hcHBseUZpbHRlcih0ZXh0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCA1MDApOyAvLyA1MDBtcyBkZWxheSBiZWZvcmUgZXhlY3V0aW5nIHRoZSBzZWFyY2hcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUmVzdG9yZSB0aGUgc2F2ZWQgc2VhcmNoIHBocmFzZSBmcm9tIERhdGFUYWJsZXMgc3RhdGVcbiAgICAgICAgY29uc3Qgc3RhdGUgPSB0aGlzLmRhdGFUYWJsZS5zdGF0ZS5sb2FkZWQoKTtcbiAgICAgICAgaWYgKHN0YXRlICYmIHN0YXRlLnNlYXJjaCkge1xuICAgICAgICAgICAgdGhpcy4kZ2xvYmFsU2VhcmNoLnZhbChzdGF0ZS5zZWFyY2guc2VhcmNoKTsgLy8gU2V0IHRoZSBzZWFyY2ggZmllbGQgd2l0aCB0aGUgc2F2ZWQgdmFsdWVcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJldHJpZXZlcyB0aGUgdmFsdWUgb2YgJ3NlYXJjaCcgcXVlcnkgcGFyYW1ldGVyIGZyb20gdGhlIFVSTC5cbiAgICAgICAgY29uc3Qgc2VhcmNoVmFsdWUgPSB0aGlzLmdldFF1ZXJ5UGFyYW0oJ3NlYXJjaCcpO1xuXG4gICAgICAgIC8vIFNldHMgdGhlIGdsb2JhbCBzZWFyY2ggaW5wdXQgdmFsdWUgYW5kIGFwcGxpZXMgdGhlIGZpbHRlciBpZiBhIHNlYXJjaCB2YWx1ZSBpcyBwcm92aWRlZC5cbiAgICAgICAgaWYgKHNlYXJjaFZhbHVlKSB7XG4gICAgICAgICAgICB0aGlzLiRnbG9iYWxTZWFyY2gudmFsKHNlYXJjaFZhbHVlKTtcbiAgICAgICAgICAgIHRoaXMuYXBwbHlGaWx0ZXIoc2VhcmNoVmFsdWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5kYXRhVGFibGUub24oJ2RyYXcnLCAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLiRnbG9iYWxTZWFyY2guY2xvc2VzdCgnZGl2JykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEJ1aWxkIHRoZSBIVE1MIHRlbXBsYXRlIGZvciBlYWNoIHJvdyBpbiB0aGUgRGF0YVRhYmxlLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtIVE1MRWxlbWVudH0gcm93IC0gVGhlIHJvdyBlbGVtZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gVGhlIGRhdGEgb2JqZWN0IGZvciB0aGUgcm93LlxuICAgICAqL1xuICAgIGJ1aWxkUm93VGVtcGxhdGUocm93LCBkYXRhKSB7XG4gICAgICAgIGNvbnN0IG5hbWVUZW1wbGF0ZSA9IGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0cmFuc3BhcmVudCBmbHVpZCBpbnB1dCBpbmxpbmUtZWRpdFwiPlxuICAgICAgICAgICAgICAgIDxpbnB1dCBjbGFzcz1cImNhbGxlci1pZC1pbnB1dFwiIHR5cGU9XCJ0ZXh0XCIgdmFsdWU9XCIke2RhdGEuY2FsbF9pZH1cIiAvPlxuICAgICAgICAgICAgPC9kaXY+YDtcbiAgICAgICAgY29uc3QgbnVtYmVyVGVtcGxhdGUgPSBgXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdHJhbnNwYXJlbnQgaW5wdXQgaW5saW5lLWVkaXRcIj5cbiAgICAgICAgICAgICAgICA8aW5wdXQgY2xhc3M9XCJudW1iZXItaW5wdXRcIiB0eXBlPVwidGV4dFwiIHZhbHVlPVwiJHtkYXRhLm51bWJlcn1cIiAvPlxuICAgICAgICAgICAgPC9kaXY+YDtcbiAgICAgICAgY29uc3QgZGVsZXRlQnV0dG9uVGVtcGxhdGUgPSBgXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgYmFzaWMgaWNvbiBidXR0b25zIGFjdGlvbi1idXR0b25zIHRpbnlcIj5cbiAgICAgICAgICAgICAgICA8YSBocmVmPVwiI1wiIGRhdGEtdmFsdWU9XCIke2RhdGEuRFRfUm93SWR9XCIgY2xhc3M9XCJ1aSBkZWxldGUgYnV0dG9uXCI+XG4gICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaWNvbiB0cmFzaCByZWRcIj48L2k+XG4gICAgICAgICAgICAgICAgPC9hPlxuICAgICAgICAgICAgPC9kaXY+YDtcblxuICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMCkuaHRtbCgnPGkgY2xhc3M9XCJ1aSB1c2VyIGNpcmNsZSBpY29uXCI+PC9pPicpO1xuICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMSkuaHRtbChuYW1lVGVtcGxhdGUpO1xuICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMikuaHRtbChudW1iZXJUZW1wbGF0ZSk7XG4gICAgICAgICQoJ3RkJywgcm93KS5lcSgzKS5odG1sKGRlbGV0ZUJ1dHRvblRlbXBsYXRlKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQXBwbHkgYSBzZWFyY2ggZmlsdGVyIHRvIHRoZSBEYXRhVGFibGUuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIFRoZSBzZWFyY2ggdGV4dCB0byBhcHBseS5cbiAgICAgKi9cbiAgICBhcHBseUZpbHRlcih0ZXh0KSB7XG4gICAgICAgIGNvbnN0ICRjaGFuZ2VkRmllbGRzID0gJCgnLmNoYW5nZWQtZmllbGQnKTtcbiAgICAgICAgJGNoYW5nZWRGaWVsZHMuZWFjaCgoXywgb2JqKSA9PiB7XG4gICAgICAgICAgICBjb25zdCAkaW5wdXQgPSAkKG9iaikuZmluZCgnaW5wdXQnKTtcbiAgICAgICAgICAgICRpbnB1dC52YWwoJGlucHV0LmRhdGEoJ3ZhbHVlJykpO1xuICAgICAgICAgICAgJGlucHV0LmF0dHIoJ3JlYWRvbmx5JywgdHJ1ZSk7XG4gICAgICAgICAgICAkKG9iaikucmVtb3ZlQ2xhc3MoJ2NoYW5nZWQtZmllbGQnKS5hZGRDbGFzcygndHJhbnNwYXJlbnQnKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuZGF0YVRhYmxlLnNlYXJjaCh0ZXh0KS5kcmF3KCk7XG4gICAgICAgIHRoaXMuJGdsb2JhbFNlYXJjaC5jbG9zZXN0KCdkaXYnKS5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGlucHV0IG1hc2tzIGZvciBwaG9uZSBudW1iZXIgZmllbGRzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICRlbCAtIFRoZSBpbnB1dCBlbGVtZW50cyB0byBhcHBseSBtYXNrcyB0by5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplSW5wdXRtYXNrKCRlbCkge1xuICAgICAgICBpZiAodGhpcy4kZGlzYWJsZUlucHV0TWFza1RvZ2dsZS5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSByZXR1cm47XG5cbiAgICAgICAgaWYgKHRoaXMuJG1hc2tMaXN0ID09PSBudWxsKSB7XG4gICAgICAgICAgICB0aGlzLiRtYXNrTGlzdCA9ICQubWFza3NTb3J0KElucHV0TWFza1BhdHRlcm5zLCBbJyMnXSwgL1swLTldfCMvLCAnbWFzaycpO1xuICAgICAgICB9XG5cbiAgICAgICAgJGVsLmlucHV0bWFza3Moe1xuICAgICAgICAgICAgaW5wdXRtYXNrOiB7XG4gICAgICAgICAgICAgICAgZGVmaW5pdGlvbnM6IHtcbiAgICAgICAgICAgICAgICAgICAgJyMnOiB7IHZhbGlkYXRvcjogJ1swLTldJywgY2FyZGluYWxpdHk6IDEgfSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHNob3dNYXNrT25Ib3ZlcjogZmFsc2UsXG4gICAgICAgICAgICAgICAgb25CZWZvcmVQYXN0ZTogdGhpcy5jYk9uTnVtYmVyQmVmb3JlUGFzdGUsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbWF0Y2g6IC9bMC05XS8sXG4gICAgICAgICAgICByZXBsYWNlOiAnOScsXG4gICAgICAgICAgICBsaXN0OiB0aGlzLiRtYXNrTGlzdCxcbiAgICAgICAgICAgIGxpc3RLZXk6ICdtYXNrJyxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNlbmQgdGhlIGNoYW5nZXMgZm9yIGEgc3BlY2lmaWMgcm93IHRvIHRoZSBzZXJ2ZXIuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcmVjb3JkSWQgLSBUaGUgSUQgb2YgdGhlIHJlY29yZCB0byBzYXZlLlxuICAgICAqL1xuICAgIHNlbmRDaGFuZ2VzVG9TZXJ2ZXIocmVjb3JkSWQpIHtcbiAgICAgICAgY29uc3QgY2FsbGVySWQgPSAkKGB0ciMke3JlY29yZElkfSAuY2FsbGVyLWlkLWlucHV0YCkudmFsKCk7XG4gICAgICAgIGNvbnN0IG51bWJlcklucHV0VmFsID0gJChgdHIjJHtyZWNvcmRJZH0gLm51bWJlci1pbnB1dGApLnZhbCgpO1xuXG4gICAgICAgIGlmICghY2FsbGVySWQgfHwgIW51bWJlcklucHV0VmFsKSByZXR1cm47XG5cbiAgICAgICAgbGV0IG51bWJlciA9IG51bWJlcklucHV0VmFsLnJlcGxhY2UoL1xcRCsvZywgJycpO1xuICAgICAgICBudW1iZXIgPSBgMSR7bnVtYmVyLnN1YnN0cihudW1iZXIubGVuZ3RoIC0gOSl9YDtcblxuICAgICAgICBjb25zdCBkYXRhID0ge1xuICAgICAgICAgICAgY2FsbF9pZDogY2FsbGVySWQsXG4gICAgICAgICAgICBudW1iZXJfcmVwOiBudW1iZXJJbnB1dFZhbCxcbiAgICAgICAgICAgIG51bWJlcixcbiAgICAgICAgICAgIGlkOiByZWNvcmRJZCxcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmRpc3BsYXlTYXZpbmdJY29uKHJlY29yZElkKTtcblxuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IHRoaXMuc2F2ZVJlY29yZEFKQVhVcmwsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIGRhdGEsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogKHJlc3BvbnNlKSA9PiByZXNwb25zZSAmJiByZXNwb25zZS5zdWNjZXNzID09PSB0cnVlLFxuICAgICAgICAgICAgb25TdWNjZXNzOiAocmVzcG9uc2UpID0+IHRoaXMub25TYXZlU3VjY2VzcyhyZXNwb25zZSwgcmVjb3JkSWQpLFxuICAgICAgICAgICAgb25GYWlsdXJlOiAocmVzcG9uc2UpID0+IFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlKSxcbiAgICAgICAgICAgIG9uRXJyb3I6IChlcnJvck1lc3NhZ2UsIGVsZW1lbnQsIHhocikgPT4ge1xuICAgICAgICAgICAgICAgIGlmICh4aHIuc3RhdHVzID09PSA0MDMpIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9pbmRleGA7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRGlzcGxheSBhIHNhdmluZyBpY29uIGZvciB0aGUgZ2l2ZW4gcmVjb3JkLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHJlY29yZElkIC0gVGhlIElEIG9mIHRoZSByZWNvcmQgYmVpbmcgc2F2ZWQuXG4gICAgICovXG4gICAgZGlzcGxheVNhdmluZ0ljb24ocmVjb3JkSWQpIHtcbiAgICAgICAgJChgdHIjJHtyZWNvcmRJZH0gLnVzZXIuY2lyY2xlYClcbiAgICAgICAgICAgIC5yZW1vdmVDbGFzcygndXNlciBjaXJjbGUnKVxuICAgICAgICAgICAgLmFkZENsYXNzKCdzcGlubmVyIGxvYWRpbmcnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIHN1Y2Nlc3NmdWwgc2F2aW5nIG9mIGEgcmVjb3JkLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHNlcnZlciByZXNwb25zZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcmVjb3JkSWQgLSBUaGUgSUQgb2YgdGhlIHJlY29yZCB0aGF0IHdhcyBzYXZlZC5cbiAgICAgKi9cbiAgICBvblNhdmVTdWNjZXNzKHJlc3BvbnNlLCByZWNvcmRJZCkge1xuICAgICAgICBpZiAocmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgbGV0IG9sZElkID0gcmVzcG9uc2UuZGF0YS5vbGRJZCB8fCByZWNvcmRJZDtcbiAgICAgICAgICAgICQoYHRyIyR7b2xkSWR9IGlucHV0YCkuYXR0cigncmVhZG9ubHknLCB0cnVlKTtcbiAgICAgICAgICAgICQoYHRyIyR7b2xkSWR9IGRpdmApLnJlbW92ZUNsYXNzKCdjaGFuZ2VkLWZpZWxkIGxvYWRpbmcnKS5hZGRDbGFzcygndHJhbnNwYXJlbnQnKTtcbiAgICAgICAgICAgICQoYHRyIyR7b2xkSWR9IC5zcGlubmVyLmxvYWRpbmdgKS5hZGRDbGFzcygndXNlciBjaXJjbGUnKS5yZW1vdmVDbGFzcygnc3Bpbm5lciBsb2FkaW5nJyk7XG4gICAgICAgICAgICBpZiAob2xkSWQgIT09IHJlc3BvbnNlLmRhdGEubmV3SWQpIHtcbiAgICAgICAgICAgICAgICAkKGB0ciMke29sZElkfWApLmF0dHIoJ2lkJywgcmVzcG9uc2UuZGF0YS5uZXdJZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRGVsZXRlIGEgcm93IGZyb20gdGhlIHBob25lYm9vayB0YWJsZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSAkdGFyZ2V0IC0gVGhlIGRlbGV0ZSBidXR0b24gZWxlbWVudC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaWQgLSBUaGUgSUQgb2YgdGhlIHJlY29yZCB0byBkZWxldGUuXG4gICAgICovXG4gICAgZGVsZXRlUm93KCR0YXJnZXQsIGlkKSB7XG4gICAgICAgIGlmIChpZCA9PT0gJ25ldycpIHtcbiAgICAgICAgICAgICR0YXJnZXQuY2xvc2VzdCgndHInKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogYCR7dGhpcy5kZWxldGVSZWNvcmRBSkFYVXJsfS8ke2lkfWAsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBvblN1Y2Nlc3M6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5zdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgICR0YXJnZXQuY2xvc2VzdCgndHInKS5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuJHJlY29yZHNUYWJsZS5maW5kKCd0Ym9keSA+IHRyJykubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLiRyZWNvcmRzVGFibGUuZmluZCgndGJvZHknKS5hcHBlbmQoJzx0ciBjbGFzcz1cIm9kZFwiPjwvdHI+Jyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2xlYW4gbnVtYmVyIGJlZm9yZSBwYXN0aW5nLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhc3RlZFZhbHVlIC0gVGhlIHBhc3RlZCBwaG9uZSBudW1iZXIuXG4gICAgICogQHJldHVybnMge3N0cmluZ30gVGhlIGNsZWFuZWQgbnVtYmVyLlxuICAgICAqL1xuICAgIGNiT25OdW1iZXJCZWZvcmVQYXN0ZShwYXN0ZWRWYWx1ZSkge1xuICAgICAgICByZXR1cm4gcGFzdGVkVmFsdWUucmVwbGFjZSgvXFxEKy9nLCAnJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZSB0aGUgbnVtYmVyIG9mIHJvd3MgdGhhdCBjYW4gZml0IG9uIGEgcGFnZSBiYXNlZCBvbiB3aW5kb3cgaGVpZ2h0LlxuICAgICAqXG4gICAgICogQHJldHVybnMge251bWJlcn0gVGhlIGNhbGN1bGF0ZWQgbnVtYmVyIG9mIHJvd3MuXG4gICAgICovXG4gICAgY2FsY3VsYXRlUGFnZUxlbmd0aCgpIHtcbiAgICAgICAgLy8gQ2FsY3VsYXRlIHJvdyBoZWlnaHRcbiAgICAgICAgbGV0IHJvd0hlaWdodCA9IHRoaXMuJHJlY29yZHNUYWJsZS5maW5kKCd0cicpLmZpcnN0KCkub3V0ZXJIZWlnaHQoKTtcblxuICAgICAgICAvLyBDYWxjdWxhdGUgd2luZG93IGhlaWdodCBhbmQgYXZhaWxhYmxlIHNwYWNlIGZvciB0YWJsZVxuICAgICAgICBjb25zdCB3aW5kb3dIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XG4gICAgICAgIGNvbnN0IGhlYWRlckZvb3RlckhlaWdodCA9IDU1MDsgLy8gRXN0aW1hdGUgaGVpZ2h0IGZvciBoZWFkZXIsIGZvb3RlciwgYW5kIG90aGVyIGVsZW1lbnRzXG5cbiAgICAgICAgLy8gQ2FsY3VsYXRlIG5ldyBwYWdlIGxlbmd0aFxuICAgICAgICByZXR1cm4gTWF0aC5tYXgoTWF0aC5mbG9vcigod2luZG93SGVpZ2h0IC0gaGVhZGVyRm9vdGVySGVpZ2h0KSAvIHJvd0hlaWdodCksIDUpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgdGhlIHZhbHVlIG9mIGEgcXVlcnkgcGFyYW1ldGVyIGZyb20gdGhlIFVSTC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbSAtIFRoZSBuYW1lIG9mIHRoZSBxdWVyeSBwYXJhbWV0ZXIgdG8gcmV0cmlldmUuXG4gICAgICogQHJldHVybnMge3N0cmluZ3xudWxsfSBUaGUgdmFsdWUgb2YgdGhlIHF1ZXJ5IHBhcmFtZXRlciwgb3IgbnVsbCBpZiBub3QgZm91bmQuXG4gICAgICovXG4gICAgZ2V0UXVlcnlQYXJhbShwYXJhbSkge1xuICAgICAgICBjb25zdCB1cmxQYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuICAgICAgICByZXR1cm4gdXJsUGFyYW1zLmdldChwYXJhbSk7XG4gICAgfSxcbn07XG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBNb2R1bGVQaG9uZUJvb2tEVC5pbml0aWFsaXplKCk7XG59KTsiXX0=