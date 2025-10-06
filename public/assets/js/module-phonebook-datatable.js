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
    var nameTemplate = "\n            <div class=\"ui transparent fluid input inline-edit\">\n                <input class=\"caller-id-input\" type=\"text\" value=\"".concat(data.call_id, "\" />\n            </div>");
    var numberTemplate = "\n            <div class=\"ui transparent input inline-edit\">\n                <input class=\"number-input\" type=\"text\" value=\"".concat(data.number, "\" />\n            </div>");
    var deleteButtonTemplate = "\n            <div class=\"ui basic icon buttons action-buttons tiny\">\n                <a href=\"#\" data-value=\"".concat(data.DT_RowId, "\" class=\"ui delete button\">\n                    <i class=\"icon trash ").concat(data.created > 0 ? "blue" : "red", "\"></i>\n                </a>\n            </div>");
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

    // let number = numberInputVal.replace(/\D+/g, '');
    // number = `1${number.substr(number.length - 9)}`;

    var data = {
      call_id: callerId,
      number_rep: numberInputVal,
      // number,
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJNb2R1bGVQaG9uZUJvb2tEVCIsIiRnbG9iYWxTZWFyY2giLCIkIiwiJHBhZ2VMZW5ndGhTZWxlY3RvciIsIiRzZWFyY2hFeHRlbnNpb25zSW5wdXQiLCJkYXRhVGFibGUiLCIkYm9keSIsIiRkaXNhYmxlSW5wdXRNYXNrVG9nZ2xlIiwiJHJlY29yZHNUYWJsZSIsIiRhZGROZXdCdXR0b24iLCJpbnB1dE51bWJlckpRVFBMIiwiJG1hc2tMaXN0IiwiZ2V0TmV3UmVjb3Jkc0FKQVhVcmwiLCJjb25jYXQiLCJnbG9iYWxSb290VXJsIiwiZGVsZXRlUmVjb3JkQUpBWFVybCIsInNhdmVSZWNvcmRBSkFYVXJsIiwiaW5pdGlhbGl6ZSIsImluaXRpYWxpemVTZWFyY2giLCJpbml0aWFsaXplRGF0YVRhYmxlIiwiaW5pdGlhbGl6ZUV2ZW50TGlzdGVuZXJzIiwiX3RoaXMiLCJvbiIsImUiLCJzZWFyY2hUZXh0IiwidmFsIiwidHJpbSIsImtleUNvZGUiLCJsZW5ndGgiLCJhcHBseUZpbHRlciIsIl90aGlzMiIsIm9uRmllbGRGb2N1cyIsInRhcmdldCIsInNhdmVDaGFuZ2VzRm9yQWxsUm93cyIsInByZXZlbnREZWZhdWx0IiwiaWQiLCJjbG9zZXN0IiwiZGF0YSIsImRlbGV0ZVJvdyIsImRvY3VtZW50Iiwia2V5IiwiaGFzQ2xhc3MiLCJhZGROZXdSb3ciLCJkcm9wZG93biIsIm9uQ2hhbmdlIiwicGFnZUxlbmd0aCIsImNhbGN1bGF0ZVBhZ2VMZW5ndGgiLCJsb2NhbFN0b3JhZ2UiLCJyZW1vdmVJdGVtIiwic2V0SXRlbSIsInBhZ2UiLCJsZW4iLCJkcmF3IiwiZXZlbnQiLCJzdG9wUHJvcGFnYXRpb24iLCIkaW5wdXQiLCJ0cmFuc2l0aW9uIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsImF0dHIiLCJfdGhpczMiLCIkcm93cyIsImVhY2giLCJfIiwicm93Iiwicm93SWQiLCJ1bmRlZmluZWQiLCJzZW5kQ2hhbmdlc1RvU2VydmVyIiwiJGVtcHR5Um93IiwicmVtb3ZlIiwibmV3SWQiLCJNYXRoIiwiZmxvb3IiLCJyYW5kb20iLCJuZXdSb3dUZW1wbGF0ZSIsImZpbmQiLCJwcmVwZW5kIiwiJG5ld1JvdyIsImZvY3VzIiwiaW5pdGlhbGl6ZUlucHV0bWFzayIsIl90aGlzNCIsInNhdmVkUGFnZUxlbmd0aCIsImdldEl0ZW0iLCJzZWFyY2giLCJzZXJ2ZXJTaWRlIiwicHJvY2Vzc2luZyIsImFqYXgiLCJ1cmwiLCJ0eXBlIiwiZGF0YVNyYyIsImNvbHVtbnMiLCJwYWdpbmciLCJkZWZlclJlbmRlciIsInNEb20iLCJvcmRlcmluZyIsImNyZWF0ZWRSb3ciLCJidWlsZFJvd1RlbXBsYXRlIiwiZHJhd0NhbGxiYWNrIiwibGFuZ3VhZ2UiLCJTZW1hbnRpY0xvY2FsaXphdGlvbiIsImRhdGFUYWJsZUxvY2FsaXNhdGlvbiIsIkRhdGFUYWJsZSIsInNlYXJjaERlYm91bmNlVGltZXIiLCJjbGVhclRpbWVvdXQiLCJzZXRUaW1lb3V0IiwidGV4dCIsInN0YXRlIiwibG9hZGVkIiwic2VhcmNoVmFsdWUiLCJnZXRRdWVyeVBhcmFtIiwibmFtZVRlbXBsYXRlIiwiY2FsbF9pZCIsIm51bWJlclRlbXBsYXRlIiwibnVtYmVyIiwiZGVsZXRlQnV0dG9uVGVtcGxhdGUiLCJEVF9Sb3dJZCIsImNyZWF0ZWQiLCJlcSIsImh0bWwiLCIkY2hhbmdlZEZpZWxkcyIsIm9iaiIsIiRlbCIsImNoZWNrYm94IiwibWFza3NTb3J0IiwiSW5wdXRNYXNrUGF0dGVybnMiLCJpbnB1dG1hc2tzIiwiaW5wdXRtYXNrIiwiZGVmaW5pdGlvbnMiLCJ2YWxpZGF0b3IiLCJjYXJkaW5hbGl0eSIsInNob3dNYXNrT25Ib3ZlciIsIm9uQmVmb3JlUGFzdGUiLCJjYk9uTnVtYmVyQmVmb3JlUGFzdGUiLCJtYXRjaCIsInJlcGxhY2UiLCJsaXN0IiwibGlzdEtleSIsInJlY29yZElkIiwiX3RoaXM1IiwiY2FsbGVySWQiLCJudW1iZXJJbnB1dFZhbCIsIm51bWJlcl9yZXAiLCJkaXNwbGF5U2F2aW5nSWNvbiIsImFwaSIsIm1ldGhvZCIsInN1Y2Nlc3NUZXN0IiwicmVzcG9uc2UiLCJzdWNjZXNzIiwib25TdWNjZXNzIiwib25TYXZlU3VjY2VzcyIsIm9uRmFpbHVyZSIsIlVzZXJNZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwibWVzc2FnZSIsIm9uRXJyb3IiLCJlcnJvck1lc3NhZ2UiLCJlbGVtZW50IiwieGhyIiwic3RhdHVzIiwid2luZG93IiwibG9jYXRpb24iLCJvbGRJZCIsIiR0YXJnZXQiLCJfdGhpczYiLCJhcHBlbmQiLCJwYXN0ZWRWYWx1ZSIsInJvd0hlaWdodCIsImZpcnN0Iiwib3V0ZXJIZWlnaHQiLCJ3aW5kb3dIZWlnaHQiLCJpbm5lckhlaWdodCIsImhlYWRlckZvb3RlckhlaWdodCIsIm1heCIsInBhcmFtIiwidXJsUGFyYW1zIiwiVVJMU2VhcmNoUGFyYW1zIiwiZ2V0IiwicmVhZHkiXSwic291cmNlcyI6WyJzcmMvbW9kdWxlLXBob25lYm9vay1kYXRhdGFibGUuanMiXSwic291cmNlc0NvbnRlbnQiOlsiLypcclxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xyXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI0IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcclxuICpcclxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcclxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcclxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cclxuICpcclxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXHJcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXHJcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcclxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cclxuICpcclxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXHJcbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXHJcbiAqL1xyXG5cclxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgU2VtYW50aWNMb2NhbGl6YXRpb24sIFVzZXJNZXNzYWdlLCBJbnB1dE1hc2tQYXR0ZXJucyAqL1xyXG5cclxuY29uc3QgTW9kdWxlUGhvbmVCb29rRFQgPSB7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBUaGUgZ2xvYmFsIHNlYXJjaCBpbnB1dCBlbGVtZW50LlxyXG4gICAgICogQHR5cGUge2pRdWVyeX1cclxuICAgICAqL1xyXG4gICAgJGdsb2JhbFNlYXJjaDogJCgnI2dsb2JhbC1zZWFyY2gnKSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIFRoZSBwYWdlIGxlbmd0aCBzZWxlY3Rvci5cclxuICAgICAqIEB0eXBlIHtqUXVlcnl9XHJcbiAgICAgKi9cclxuICAgICRwYWdlTGVuZ3RoU2VsZWN0b3I6JCgnI3BhZ2UtbGVuZ3RoLXNlbGVjdCcpLFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogVGhlIHBhZ2UgbGVuZ3RoIHNlbGVjdG9yLlxyXG4gICAgICogQHR5cGUge2pRdWVyeX1cclxuICAgICAqL1xyXG4gICAgJHNlYXJjaEV4dGVuc2lvbnNJbnB1dDogJCgnI3NlYXJjaC1leHRlbnNpb25zLWlucHV0JyksXHJcblxyXG5cclxuICAgIC8qKlxyXG4gICAgICogVGhlIGRhdGEgdGFibGUgb2JqZWN0LlxyXG4gICAgICogQHR5cGUge09iamVjdH1cclxuICAgICAqL1xyXG4gICAgZGF0YVRhYmxlOiB7fSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIFRoZSBkb2N1bWVudCBib2R5LlxyXG4gICAgICogQHR5cGUge2pRdWVyeX1cclxuICAgICAqL1xyXG4gICAgJGJvZHk6ICQoJ2JvZHknKSxcclxuXHJcbiAgICAvLyBDYWNoZWQgRE9NIGVsZW1lbnRzXHJcbiAgICAkZGlzYWJsZUlucHV0TWFza1RvZ2dsZTogJCgnI2Rpc2FibGUtaW5wdXQtbWFzaycpLFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogVGhlIGV4dGVuc2lvbnMgdGFibGUgZWxlbWVudC5cclxuICAgICAqIEB0eXBlIHtqUXVlcnl9XHJcbiAgICAgKi9cclxuICAgICRyZWNvcmRzVGFibGU6ICQoJyNwaG9uZWJvb2stdGFibGUnKSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIFRoZSBhZGQgbmV3IGJ1dHRvbiBlbGVtZW50LlxyXG4gICAgICogQHR5cGUge2pRdWVyeX1cclxuICAgICAqL1xyXG4gICAgJGFkZE5ld0J1dHRvbjogJCgnI2FkZC1uZXctYnV0dG9uJyksXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBTZWxlY3RvciBmb3IgbnVtYmVyIGlucHV0IGZpZWxkcy5cclxuICAgICAqIEB0eXBlIHtzdHJpbmd9XHJcbiAgICAgKi9cclxuICAgIGlucHV0TnVtYmVySlFUUEw6ICdpbnB1dC5udW1iZXItaW5wdXQnLFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogTGlzdCBvZiBpbnB1dCBtYXNrcy5cclxuICAgICAqIEB0eXBlIHtudWxsfEFycmF5fVxyXG4gICAgICovXHJcbiAgICAkbWFza0xpc3Q6IG51bGwsXHJcblxyXG4gICAgLy8gVVJMcyBmb3IgQUpBWCByZXF1ZXN0c1xyXG4gICAgZ2V0TmV3UmVjb3Jkc0FKQVhVcmw6IGAke2dsb2JhbFJvb3RVcmx9bW9kdWxlLXBob25lLWJvb2svZ2V0TmV3UmVjb3Jkc2AsXHJcblxyXG4gICAgZGVsZXRlUmVjb3JkQUpBWFVybDogYCR7Z2xvYmFsUm9vdFVybH1tb2R1bGUtcGhvbmUtYm9vay9kZWxldGVgLFxyXG5cclxuICAgIHNhdmVSZWNvcmRBSkFYVXJsOiBgJHtnbG9iYWxSb290VXJsfW1vZHVsZS1waG9uZS1ib29rL3NhdmVgLFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgbW9kdWxlLlxyXG4gICAgICogVGhpcyBpbmNsdWRlcyBzZXR0aW5nIHVwIGV2ZW50IGxpc3RlbmVycyBhbmQgaW5pdGlhbGl6aW5nIHRoZSBEYXRhVGFibGUuXHJcbiAgICAgKi9cclxuICAgIGluaXRpYWxpemUoKSB7XHJcbiAgICAgICAgdGhpcy5pbml0aWFsaXplU2VhcmNoKCk7XHJcbiAgICAgICAgdGhpcy5pbml0aWFsaXplRGF0YVRhYmxlKCk7XHJcbiAgICAgICAgdGhpcy5pbml0aWFsaXplRXZlbnRMaXN0ZW5lcnMoKTtcclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBJbml0aWFsaXplIHRoZSBzZWFyY2ggZnVuY3Rpb25hbGl0eS5cclxuICAgICAqIEl0IGxpc3RlbnMgZm9yIGtleSBldmVudHMgYW5kIGFwcGxpZXMgYSBmaWx0ZXIgYmFzZWQgb24gdGhlIHVzZXIncyBpbnB1dC5cclxuICAgICAqL1xyXG4gICAgaW5pdGlhbGl6ZVNlYXJjaCgpIHtcclxuICAgICAgICB0aGlzLiRnbG9iYWxTZWFyY2gub24oJ2tleXVwJywgKGUpID0+IHtcclxuICAgICAgICAgICAgY29uc3Qgc2VhcmNoVGV4dCA9IHRoaXMuJGdsb2JhbFNlYXJjaC52YWwoKS50cmltKCk7XHJcbiAgICAgICAgICAgIGlmIChlLmtleUNvZGUgPT09IDEzIHx8IGUua2V5Q29kZSA9PT0gOCB8fCBzZWFyY2hUZXh0Lmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5hcHBseUZpbHRlcihzZWFyY2hUZXh0KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIEluaXRpYWxpemUgYWxsIGV2ZW50IGxpc3RlbmVycy5cclxuICAgICAqIEhhbmRsZXMgaW5wdXQgZm9jdXMsIGZvcm0gc3VibWlzc2lvbiwgYWRkaW5nIG5ldyByb3dzLCBhbmQgZGVsZXRlIGFjdGlvbnMuXHJcbiAgICAgKi9cclxuICAgIGluaXRpYWxpemVFdmVudExpc3RlbmVycygpIHtcclxuXHJcbiAgICAgICAgLy8gSGFuZGxlIGZvY3VzIG9uIGlucHV0IGZpZWxkcyBmb3IgZWRpdGluZ1xyXG4gICAgICAgIHRoaXMuJGJvZHkub24oJ2ZvY3VzaW4nLCAnLmNhbGxlci1pZC1pbnB1dCwgLm51bWJlci1pbnB1dCcsIChlKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMub25GaWVsZEZvY3VzKCQoZS50YXJnZXQpKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gSGFuZGxlIGxvc3Mgb2YgZm9jdXMgb24gaW5wdXQgZmllbGRzIGFuZCBzYXZlIGNoYW5nZXNcclxuICAgICAgICB0aGlzLiRib2R5Lm9uKCdmb2N1c291dCcsICcuY2FsbGVyLWlkLWlucHV0LCAubnVtYmVyLWlucHV0JywgKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnNhdmVDaGFuZ2VzRm9yQWxsUm93cygpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBIYW5kbGUgZGVsZXRlIGJ1dHRvbiBjbGlja1xyXG4gICAgICAgIHRoaXMuJGJvZHkub24oJ2NsaWNrJywgJ2EuZGVsZXRlJywgKGUpID0+IHtcclxuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICBjb25zdCBpZCA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ2EnKS5kYXRhKCd2YWx1ZScpO1xyXG4gICAgICAgICAgICB0aGlzLmRlbGV0ZVJvdygkKGUudGFyZ2V0KSwgaWQpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBIYW5kbGUgRW50ZXIgb3IgVGFiIGtleSB0byB0cmlnZ2VyIGZvcm0gc3VibWlzc2lvblxyXG4gICAgICAgICQoZG9jdW1lbnQpLm9uKCdrZXlkb3duJywgKGUpID0+IHtcclxuICAgICAgICAgICAgaWYgKGUua2V5ID09PSAnRW50ZXInIHx8IChlLmtleSA9PT0gJ1RhYicgJiYgISQoJzpmb2N1cycpLmhhc0NsYXNzKCcubnVtYmVyLWlucHV0JykpKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNhdmVDaGFuZ2VzRm9yQWxsUm93cygpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIEhhbmRsZSBhZGRpbmcgYSBuZXcgcm93XHJcbiAgICAgICAgdGhpcy4kYWRkTmV3QnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XHJcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgdGhpcy5hZGROZXdSb3coKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gSGFuZGxlIHBhZ2UgbGVuZ3RoIHNlbGVjdGlvblxyXG4gICAgICAgIHRoaXMuJHBhZ2VMZW5ndGhTZWxlY3Rvci5kcm9wZG93bih7XHJcbiAgICAgICAgICAgIG9uQ2hhbmdlKHBhZ2VMZW5ndGgpIHtcclxuICAgICAgICAgICAgICAgIGlmIChwYWdlTGVuZ3RoPT09J2F1dG8nKXtcclxuICAgICAgICAgICAgICAgICAgICBwYWdlTGVuZ3RoID0gdGhpcy5jYWxjdWxhdGVQYWdlTGVuZ3RoKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oJ3Bob25lYm9va1RhYmxlUGFnZUxlbmd0aCcpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgncGhvbmVib29rVGFibGVQYWdlTGVuZ3RoJywgcGFnZUxlbmd0aCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBNb2R1bGVQaG9uZUJvb2tEVC5kYXRhVGFibGUucGFnZS5sZW4ocGFnZUxlbmd0aCkuZHJhdygpO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBQcmV2ZW50IGV2ZW50IGJ1YmJsaW5nIG9uIGRyb3Bkb3duIGNsaWNrXHJcbiAgICAgICAgdGhpcy4kcGFnZUxlbmd0aFNlbGVjdG9yLm9uKCdjbGljaycsIGZ1bmN0aW9uKGV2ZW50KSB7XHJcbiAgICAgICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpOyAvLyBQcmV2ZW50IHRoZSBldmVudCBmcm9tIGJ1YmJsaW5nXHJcbiAgICAgICAgfSk7XHJcbiAgICB9LFxyXG5cclxuXHJcbiAgICAvKipcclxuICAgICAqIEhhbmRsZSBmb2N1cyBldmVudCBvbiBhIGZpZWxkIGJ5IGFkZGluZyBhIGdsb3dpbmcgZWZmZWN0IGFuZCBlbmFibGluZyBlZGl0aW5nLlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSAkaW5wdXQgLSBUaGUgaW5wdXQgZmllbGQgdGhhdCByZWNlaXZlZCBmb2N1cy5cclxuICAgICAqL1xyXG4gICAgb25GaWVsZEZvY3VzKCRpbnB1dCkge1xyXG4gICAgICAgICRpbnB1dC50cmFuc2l0aW9uKCdnbG93Jyk7XHJcbiAgICAgICAgJGlucHV0LmNsb3Nlc3QoJ2RpdicpLnJlbW92ZUNsYXNzKCd0cmFuc3BhcmVudCcpLmFkZENsYXNzKCdjaGFuZ2VkLWZpZWxkJyk7XHJcbiAgICAgICAgJGlucHV0LmF0dHIoJ3JlYWRvbmx5JywgZmFsc2UpO1xyXG4gICAgfSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIFNhdmUgY2hhbmdlcyBmb3IgYWxsIG1vZGlmaWVkIHJvd3MuXHJcbiAgICAgKiBJdCBzZW5kcyB0aGUgY2hhbmdlcyBmb3IgZWFjaCBtb2RpZmllZCByb3cgdG8gdGhlIHNlcnZlci5cclxuICAgICAqL1xyXG4gICAgc2F2ZUNoYW5nZXNGb3JBbGxSb3dzKCkge1xyXG4gICAgICAgIGNvbnN0ICRyb3dzID0gJCgnLmNoYW5nZWQtZmllbGQnKS5jbG9zZXN0KCd0cicpO1xyXG4gICAgICAgICRyb3dzLmVhY2goKF8sIHJvdykgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCByb3dJZCA9ICQocm93KS5hdHRyKCdpZCcpO1xyXG4gICAgICAgICAgICBpZiAocm93SWQgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zZW5kQ2hhbmdlc1RvU2VydmVyKHJvd0lkKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIEFkZCBhIG5ldyByb3cgdG8gdGhlIHBob25lYm9vayB0YWJsZS5cclxuICAgICAqIFRoZSByb3cgaXMgZWRpdGFibGUgYW5kIGFsbG93cyBmb3IgaW5wdXQgb2YgbmV3IGNvbnRhY3QgaW5mb3JtYXRpb24uXHJcbiAgICAgKi9cclxuICAgIGFkZE5ld1JvdygpIHtcclxuICAgICAgICBjb25zdCAkZW1wdHlSb3cgPSAkKCcuZGF0YVRhYmxlc19lbXB0eScpO1xyXG4gICAgICAgIGlmICgkZW1wdHlSb3cubGVuZ3RoKSAkZW1wdHlSb3cucmVtb3ZlKCk7XHJcblxyXG4gICAgICAgIHRoaXMuc2F2ZUNoYW5nZXNGb3JBbGxSb3dzKCk7XHJcblxyXG4gICAgICAgIGNvbnN0IG5ld0lkID0gYG5ldyR7TWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogNTAwKX1gO1xyXG4gICAgICAgIGNvbnN0IG5ld1Jvd1RlbXBsYXRlID0gYFxyXG4gICAgICAgICAgICA8dHIgaWQ9XCIke25ld0lkfVwiPlxyXG4gICAgICAgICAgICAgICAgPHRkPjxpIGNsYXNzPVwidWkgdXNlciBjaXJjbGUgaWNvblwiPjwvaT48L3RkPlxyXG4gICAgICAgICAgICAgICAgPHRkPjxkaXYgY2xhc3M9XCJ1aSBmbHVpZCBpbnB1dCBpbmxpbmUtZWRpdCBjaGFuZ2VkLWZpZWxkXCI+PGlucHV0IGNsYXNzPVwiY2FsbGVyLWlkLWlucHV0XCIgdHlwZT1cInRleHRcIiB2YWx1ZT1cIlwiPjwvZGl2PjwvdGQ+XHJcbiAgICAgICAgICAgICAgICA8dGQ+PGRpdiBjbGFzcz1cInVpIGZsdWlkIGlucHV0IGlubGluZS1lZGl0IGNoYW5nZWQtZmllbGRcIj48aW5wdXQgY2xhc3M9XCJudW1iZXItaW5wdXRcIiB0eXBlPVwidGV4dFwiIHZhbHVlPVwiXCI+PC9kaXY+PC90ZD5cclxuICAgICAgICAgICAgICAgIDx0ZD48ZGl2IGNsYXNzPVwidWkgYmFzaWMgaWNvbiBidXR0b25zIGFjdGlvbi1idXR0b25zIHRpbnlcIj5cclxuICAgICAgICAgICAgICAgICAgICA8YSBocmVmPVwiI1wiIGNsYXNzPVwidWkgYnV0dG9uIGRlbGV0ZVwiIGRhdGEtdmFsdWU9XCJuZXdcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpY29uIHRyYXNoIHJlZFwiPjwvaT5cclxuICAgICAgICAgICAgICAgICAgICA8L2E+XHJcbiAgICAgICAgICAgICAgICA8L2Rpdj48L3RkPlxyXG4gICAgICAgICAgICA8L3RyPmA7XHJcblxyXG4gICAgICAgIHRoaXMuJHJlY29yZHNUYWJsZS5maW5kKCd0Ym9keScpLnByZXBlbmQobmV3Um93VGVtcGxhdGUpO1xyXG4gICAgICAgIGNvbnN0ICRuZXdSb3cgPSAkKGAjJHtuZXdJZH1gKTtcclxuICAgICAgICAkbmV3Um93LmZpbmQoJ2lucHV0JykudHJhbnNpdGlvbignZ2xvdycpO1xyXG4gICAgICAgICRuZXdSb3cuZmluZCgnLmNhbGxlci1pZC1pbnB1dCcpLmZvY3VzKCk7XHJcbiAgICAgICAgdGhpcy5pbml0aWFsaXplSW5wdXRtYXNrKCRuZXdSb3cuZmluZCgnLm51bWJlci1pbnB1dCcpKTtcclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBJbml0aWFsaXplIHRoZSBEYXRhVGFibGUgaW5zdGFuY2Ugd2l0aCB0aGUgcmVxdWlyZWQgc2V0dGluZ3MgYW5kIG9wdGlvbnMuXHJcbiAgICAgKi9cclxuICAgIGluaXRpYWxpemVEYXRhVGFibGUoKSB7XHJcblxyXG4gICAgICAgIC8vIEdldCB0aGUgdXNlcidzIHNhdmVkIHZhbHVlIG9yIHVzZSB0aGUgYXV0b21hdGljYWxseSBjYWxjdWxhdGVkIHZhbHVlIGlmIG5vbmUgZXhpc3RzXHJcbiAgICAgICAgY29uc3Qgc2F2ZWRQYWdlTGVuZ3RoID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ3Bob25lYm9va1RhYmxlUGFnZUxlbmd0aCcpO1xyXG4gICAgICAgIGNvbnN0IHBhZ2VMZW5ndGggPSBzYXZlZFBhZ2VMZW5ndGggPyBzYXZlZFBhZ2VMZW5ndGggOiB0aGlzLmNhbGN1bGF0ZVBhZ2VMZW5ndGgoKTtcclxuXHJcbiAgICAgICAgdGhpcy4kcmVjb3Jkc1RhYmxlLmRhdGFUYWJsZSh7XHJcbiAgICAgICAgICAgIHNlYXJjaDogeyBzZWFyY2g6IHRoaXMuJGdsb2JhbFNlYXJjaC52YWwoKSB9LFxyXG4gICAgICAgICAgICBzZXJ2ZXJTaWRlOiB0cnVlLFxyXG4gICAgICAgICAgICBwcm9jZXNzaW5nOiB0cnVlLFxyXG4gICAgICAgICAgICBhamF4OiB7XHJcbiAgICAgICAgICAgICAgICB1cmw6IHRoaXMuZ2V0TmV3UmVjb3Jkc0FKQVhVcmwsXHJcbiAgICAgICAgICAgICAgICB0eXBlOiAnUE9TVCcsXHJcbiAgICAgICAgICAgICAgICBkYXRhU3JjOiAnZGF0YScsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGNvbHVtbnM6IFtcclxuICAgICAgICAgICAgICAgIHsgZGF0YTogbnVsbCB9LFxyXG4gICAgICAgICAgICAgICAgeyBkYXRhOiAnY2FsbF9pZCcgfSxcclxuICAgICAgICAgICAgICAgIHsgZGF0YTogJ251bWJlcicgfSxcclxuICAgICAgICAgICAgICAgIHsgZGF0YTogbnVsbCB9LFxyXG4gICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICBwYWdpbmc6IHRydWUsXHJcbiAgICAgICAgICAgIHBhZ2VMZW5ndGg6IHBhZ2VMZW5ndGgsXHJcbiAgICAgICAgICAgIGRlZmVyUmVuZGVyOiB0cnVlLFxyXG4gICAgICAgICAgICBzRG9tOiAncnRpcCcsXHJcbiAgICAgICAgICAgIG9yZGVyaW5nOiBmYWxzZSxcclxuICAgICAgICAgICAgY3JlYXRlZFJvdzogKHJvdywgZGF0YSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5idWlsZFJvd1RlbXBsYXRlKHJvdywgZGF0YSk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGRyYXdDYWxsYmFjazogKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pbml0aWFsaXplSW5wdXRtYXNrKCQodGhpcy5pbnB1dE51bWJlckpRVFBMKSk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGxhbmd1YWdlOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5kYXRhVGFibGVMb2NhbGlzYXRpb24sXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRoaXMuZGF0YVRhYmxlID0gdGhpcy4kcmVjb3Jkc1RhYmxlLkRhdGFUYWJsZSgpO1xyXG5cclxuXHJcbiAgICAgICAgLy8gU2V0IHRoZSBzZWxlY3QgaW5wdXQgdmFsdWUgdG8gdGhlIHNhdmVkIHZhbHVlIGlmIGl0IGV4aXN0c1xyXG4gICAgICAgIGlmIChzYXZlZFBhZ2VMZW5ndGgpIHtcclxuICAgICAgICAgICAgdGhpcy4kcGFnZUxlbmd0aFNlbGVjdG9yLmRyb3Bkb3duKCdzZXQgdmFsdWUnLCBzYXZlZFBhZ2VMZW5ndGgpO1xyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgIC8vIEluaXRpYWxpemUgZGVib3VuY2UgdGltZXIgdmFyaWFibGVcclxuICAgICAgICBsZXQgc2VhcmNoRGVib3VuY2VUaW1lciA9IG51bGw7XHJcblxyXG4gICAgICAgIHRoaXMuJGdsb2JhbFNlYXJjaC5vbigna2V5dXAnLCAoZSkgPT4ge1xyXG4gICAgICAgICAgICAvLyBDbGVhciBwcmV2aW91cyB0aW1lciBpZiB0aGUgdXNlciBpcyBzdGlsbCB0eXBpbmdcclxuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHNlYXJjaERlYm91bmNlVGltZXIpO1xyXG5cclxuICAgICAgICAgICAgLy8gU2V0IGEgbmV3IHRpbWVyIGZvciBkZWxheWVkIGV4ZWN1dGlvblxyXG4gICAgICAgICAgICBzZWFyY2hEZWJvdW5jZVRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB0ZXh0ID0gdGhpcy4kZ2xvYmFsU2VhcmNoLnZhbCgpO1xyXG4gICAgICAgICAgICAgICAgLy8gVHJpZ2dlciB0aGUgc2VhcmNoIGlmIGlucHV0IGlzIHZhbGlkIChFbnRlciwgQmFja3NwYWNlLCBvciBtb3JlIHRoYW4gMiBjaGFyYWN0ZXJzKVxyXG4gICAgICAgICAgICAgICAgaWYgKGUua2V5Q29kZSA9PT0gMTMgfHwgZS5rZXlDb2RlID09PSA4IHx8IHRleHQubGVuZ3RoID49IDIpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFwcGx5RmlsdGVyKHRleHQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LCA1MDApOyAvLyA1MDBtcyBkZWxheSBiZWZvcmUgZXhlY3V0aW5nIHRoZSBzZWFyY2hcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gUmVzdG9yZSB0aGUgc2F2ZWQgc2VhcmNoIHBocmFzZSBmcm9tIERhdGFUYWJsZXMgc3RhdGVcclxuICAgICAgICBjb25zdCBzdGF0ZSA9IHRoaXMuZGF0YVRhYmxlLnN0YXRlLmxvYWRlZCgpO1xyXG4gICAgICAgIGlmIChzdGF0ZSAmJiBzdGF0ZS5zZWFyY2gpIHtcclxuICAgICAgICAgICAgdGhpcy4kZ2xvYmFsU2VhcmNoLnZhbChzdGF0ZS5zZWFyY2guc2VhcmNoKTsgLy8gU2V0IHRoZSBzZWFyY2ggZmllbGQgd2l0aCB0aGUgc2F2ZWQgdmFsdWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFJldHJpZXZlcyB0aGUgdmFsdWUgb2YgJ3NlYXJjaCcgcXVlcnkgcGFyYW1ldGVyIGZyb20gdGhlIFVSTC5cclxuICAgICAgICBjb25zdCBzZWFyY2hWYWx1ZSA9IHRoaXMuZ2V0UXVlcnlQYXJhbSgnc2VhcmNoJyk7XHJcblxyXG4gICAgICAgIC8vIFNldHMgdGhlIGdsb2JhbCBzZWFyY2ggaW5wdXQgdmFsdWUgYW5kIGFwcGxpZXMgdGhlIGZpbHRlciBpZiBhIHNlYXJjaCB2YWx1ZSBpcyBwcm92aWRlZC5cclxuICAgICAgICBpZiAoc2VhcmNoVmFsdWUpIHtcclxuICAgICAgICAgICAgdGhpcy4kZ2xvYmFsU2VhcmNoLnZhbChzZWFyY2hWYWx1ZSk7XHJcbiAgICAgICAgICAgIHRoaXMuYXBwbHlGaWx0ZXIoc2VhcmNoVmFsdWUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5kYXRhVGFibGUub24oJ2RyYXcnLCAoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuJGdsb2JhbFNlYXJjaC5jbG9zZXN0KCdkaXYnKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIEJ1aWxkIHRoZSBIVE1MIHRlbXBsYXRlIGZvciBlYWNoIHJvdyBpbiB0aGUgRGF0YVRhYmxlLlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IHJvdyAtIFRoZSByb3cgZWxlbWVudC5cclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gVGhlIGRhdGEgb2JqZWN0IGZvciB0aGUgcm93LlxyXG4gICAgICovXHJcbiAgICBidWlsZFJvd1RlbXBsYXRlKHJvdywgZGF0YSkge1xyXG4gICAgICAgIGNvbnN0IG5hbWVUZW1wbGF0ZSA9IGBcclxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHRyYW5zcGFyZW50IGZsdWlkIGlucHV0IGlubGluZS1lZGl0XCI+XHJcbiAgICAgICAgICAgICAgICA8aW5wdXQgY2xhc3M9XCJjYWxsZXItaWQtaW5wdXRcIiB0eXBlPVwidGV4dFwiIHZhbHVlPVwiJHtkYXRhLmNhbGxfaWR9XCIgLz5cclxuICAgICAgICAgICAgPC9kaXY+YDtcclxuICAgICAgICBjb25zdCBudW1iZXJUZW1wbGF0ZSA9IGBcclxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHRyYW5zcGFyZW50IGlucHV0IGlubGluZS1lZGl0XCI+XHJcbiAgICAgICAgICAgICAgICA8aW5wdXQgY2xhc3M9XCJudW1iZXItaW5wdXRcIiB0eXBlPVwidGV4dFwiIHZhbHVlPVwiJHtkYXRhLm51bWJlcn1cIiAvPlxyXG4gICAgICAgICAgICA8L2Rpdj5gO1xyXG4gICAgICAgIGNvbnN0IGRlbGV0ZUJ1dHRvblRlbXBsYXRlID0gYFxyXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgYmFzaWMgaWNvbiBidXR0b25zIGFjdGlvbi1idXR0b25zIHRpbnlcIj5cclxuICAgICAgICAgICAgICAgIDxhIGhyZWY9XCIjXCIgZGF0YS12YWx1ZT1cIiR7ZGF0YS5EVF9Sb3dJZH1cIiBjbGFzcz1cInVpIGRlbGV0ZSBidXR0b25cIj5cclxuICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImljb24gdHJhc2ggJHtkYXRhLmNyZWF0ZWQgPiAwID8gYGJsdWVgIDogYHJlZGB9XCI+PC9pPlxyXG4gICAgICAgICAgICAgICAgPC9hPlxyXG4gICAgICAgICAgICA8L2Rpdj5gO1xyXG5cclxuICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMCkuaHRtbCgnPGkgY2xhc3M9XCJ1aSB1c2VyIGNpcmNsZSBpY29uXCI+PC9pPicpO1xyXG4gICAgICAgICQoJ3RkJywgcm93KS5lcSgxKS5odG1sKG5hbWVUZW1wbGF0ZSk7XHJcbiAgICAgICAgJCgndGQnLCByb3cpLmVxKDIpLmh0bWwobnVtYmVyVGVtcGxhdGUpO1xyXG4gICAgICAgICQoJ3RkJywgcm93KS5lcSgzKS5odG1sKGRlbGV0ZUJ1dHRvblRlbXBsYXRlKTtcclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBBcHBseSBhIHNlYXJjaCBmaWx0ZXIgdG8gdGhlIERhdGFUYWJsZS5cclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIFRoZSBzZWFyY2ggdGV4dCB0byBhcHBseS5cclxuICAgICAqL1xyXG4gICAgYXBwbHlGaWx0ZXIodGV4dCkge1xyXG4gICAgICAgIGNvbnN0ICRjaGFuZ2VkRmllbGRzID0gJCgnLmNoYW5nZWQtZmllbGQnKTtcclxuICAgICAgICAkY2hhbmdlZEZpZWxkcy5lYWNoKChfLCBvYmopID0+IHtcclxuICAgICAgICAgICAgY29uc3QgJGlucHV0ID0gJChvYmopLmZpbmQoJ2lucHV0Jyk7XHJcbiAgICAgICAgICAgICRpbnB1dC52YWwoJGlucHV0LmRhdGEoJ3ZhbHVlJykpO1xyXG4gICAgICAgICAgICAkaW5wdXQuYXR0cigncmVhZG9ubHknLCB0cnVlKTtcclxuICAgICAgICAgICAgJChvYmopLnJlbW92ZUNsYXNzKCdjaGFuZ2VkLWZpZWxkJykuYWRkQ2xhc3MoJ3RyYW5zcGFyZW50Jyk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgdGhpcy5kYXRhVGFibGUuc2VhcmNoKHRleHQpLmRyYXcoKTtcclxuICAgICAgICB0aGlzLiRnbG9iYWxTZWFyY2guY2xvc2VzdCgnZGl2JykuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBJbml0aWFsaXplIGlucHV0IG1hc2tzIGZvciBwaG9uZSBudW1iZXIgZmllbGRzLlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSAkZWwgLSBUaGUgaW5wdXQgZWxlbWVudHMgdG8gYXBwbHkgbWFza3MgdG8uXHJcbiAgICAgKi9cclxuICAgIGluaXRpYWxpemVJbnB1dG1hc2soJGVsKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuJGRpc2FibGVJbnB1dE1hc2tUb2dnbGUuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkgcmV0dXJuO1xyXG5cclxuICAgICAgICBpZiAodGhpcy4kbWFza0xpc3QgPT09IG51bGwpIHtcclxuICAgICAgICAgICAgdGhpcy4kbWFza0xpc3QgPSAkLm1hc2tzU29ydChJbnB1dE1hc2tQYXR0ZXJucywgWycjJ10sIC9bMC05XXwjLywgJ21hc2snKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgICRlbC5pbnB1dG1hc2tzKHtcclxuICAgICAgICAgICAgaW5wdXRtYXNrOiB7XHJcbiAgICAgICAgICAgICAgICBkZWZpbml0aW9uczoge1xyXG4gICAgICAgICAgICAgICAgICAgICcjJzogeyB2YWxpZGF0b3I6ICdbMC05XScsIGNhcmRpbmFsaXR5OiAxIH0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgc2hvd01hc2tPbkhvdmVyOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIG9uQmVmb3JlUGFzdGU6IHRoaXMuY2JPbk51bWJlckJlZm9yZVBhc3RlLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBtYXRjaDogL1swLTldLyxcclxuICAgICAgICAgICAgcmVwbGFjZTogJzknLFxyXG4gICAgICAgICAgICBsaXN0OiB0aGlzLiRtYXNrTGlzdCxcclxuICAgICAgICAgICAgbGlzdEtleTogJ21hc2snLFxyXG4gICAgICAgIH0pO1xyXG4gICAgfSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIFNlbmQgdGhlIGNoYW5nZXMgZm9yIGEgc3BlY2lmaWMgcm93IHRvIHRoZSBzZXJ2ZXIuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHJlY29yZElkIC0gVGhlIElEIG9mIHRoZSByZWNvcmQgdG8gc2F2ZS5cclxuICAgICAqL1xyXG4gICAgc2VuZENoYW5nZXNUb1NlcnZlcihyZWNvcmRJZCkge1xyXG4gICAgICAgIGNvbnN0IGNhbGxlcklkID0gJChgdHIjJHtyZWNvcmRJZH0gLmNhbGxlci1pZC1pbnB1dGApLnZhbCgpO1xyXG4gICAgICAgIGNvbnN0IG51bWJlcklucHV0VmFsID0gJChgdHIjJHtyZWNvcmRJZH0gLm51bWJlci1pbnB1dGApLnZhbCgpO1xyXG5cclxuICAgICAgICBpZiAoIWNhbGxlcklkIHx8ICFudW1iZXJJbnB1dFZhbCkgcmV0dXJuO1xyXG5cclxuICAgICAgICAvLyBsZXQgbnVtYmVyID0gbnVtYmVySW5wdXRWYWwucmVwbGFjZSgvXFxEKy9nLCAnJyk7XHJcbiAgICAgICAgLy8gbnVtYmVyID0gYDEke251bWJlci5zdWJzdHIobnVtYmVyLmxlbmd0aCAtIDkpfWA7XHJcblxyXG4gICAgICAgIGNvbnN0IGRhdGEgPSB7XHJcbiAgICAgICAgICAgIGNhbGxfaWQ6IGNhbGxlcklkLFxyXG4gICAgICAgICAgICBudW1iZXJfcmVwOiBudW1iZXJJbnB1dFZhbCxcclxuICAgICAgICAgICAgLy8gbnVtYmVyLFxyXG4gICAgICAgICAgICBpZDogcmVjb3JkSWRcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB0aGlzLmRpc3BsYXlTYXZpbmdJY29uKHJlY29yZElkKTtcclxuXHJcbiAgICAgICAgJC5hcGkoe1xyXG4gICAgICAgICAgICB1cmw6IHRoaXMuc2F2ZVJlY29yZEFKQVhVcmwsXHJcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxyXG4gICAgICAgICAgICBvbjogJ25vdycsXHJcbiAgICAgICAgICAgIGRhdGEsXHJcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiAocmVzcG9uc2UpID0+IHJlc3BvbnNlICYmIHJlc3BvbnNlLnN1Y2Nlc3MgPT09IHRydWUsXHJcbiAgICAgICAgICAgIG9uU3VjY2VzczogKHJlc3BvbnNlKSA9PiB0aGlzLm9uU2F2ZVN1Y2Nlc3MocmVzcG9uc2UsIHJlY29yZElkKSxcclxuICAgICAgICAgICAgb25GYWlsdXJlOiAocmVzcG9uc2UpID0+IFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlKSxcclxuICAgICAgICAgICAgb25FcnJvcjogKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoeGhyLnN0YXR1cyA9PT0gNDAzKSB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgIH0pO1xyXG4gICAgfSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIERpc3BsYXkgYSBzYXZpbmcgaWNvbiBmb3IgdGhlIGdpdmVuIHJlY29yZC5cclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcmVjb3JkSWQgLSBUaGUgSUQgb2YgdGhlIHJlY29yZCBiZWluZyBzYXZlZC5cclxuICAgICAqL1xyXG4gICAgZGlzcGxheVNhdmluZ0ljb24ocmVjb3JkSWQpIHtcclxuICAgICAgICAkKGB0ciMke3JlY29yZElkfSAudXNlci5jaXJjbGVgKVxyXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ3VzZXIgY2lyY2xlJylcclxuICAgICAgICAgICAgLmFkZENsYXNzKCdzcGlubmVyIGxvYWRpbmcnKTtcclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBIYW5kbGUgc3VjY2Vzc2Z1bCBzYXZpbmcgb2YgYSByZWNvcmQuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHNlcnZlciByZXNwb25zZS5cclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSByZWNvcmRJZCAtIFRoZSBJRCBvZiB0aGUgcmVjb3JkIHRoYXQgd2FzIHNhdmVkLlxyXG4gICAgICovXHJcbiAgICBvblNhdmVTdWNjZXNzKHJlc3BvbnNlLCByZWNvcmRJZCkge1xyXG4gICAgICAgIGlmIChyZXNwb25zZS5kYXRhKSB7XHJcbiAgICAgICAgICAgIGxldCBvbGRJZCA9IHJlc3BvbnNlLmRhdGEub2xkSWQgfHwgcmVjb3JkSWQ7XHJcbiAgICAgICAgICAgICQoYHRyIyR7b2xkSWR9IGlucHV0YCkuYXR0cigncmVhZG9ubHknLCB0cnVlKTtcclxuICAgICAgICAgICAgJChgdHIjJHtvbGRJZH0gZGl2YCkucmVtb3ZlQ2xhc3MoJ2NoYW5nZWQtZmllbGQgbG9hZGluZycpLmFkZENsYXNzKCd0cmFuc3BhcmVudCcpO1xyXG4gICAgICAgICAgICAkKGB0ciMke29sZElkfSAuc3Bpbm5lci5sb2FkaW5nYCkuYWRkQ2xhc3MoJ3VzZXIgY2lyY2xlJykucmVtb3ZlQ2xhc3MoJ3NwaW5uZXIgbG9hZGluZycpO1xyXG4gICAgICAgICAgICBpZiAob2xkSWQgIT09IHJlc3BvbnNlLmRhdGEubmV3SWQpIHtcclxuICAgICAgICAgICAgICAgICQoYHRyIyR7b2xkSWR9YCkuYXR0cignaWQnLCByZXNwb25zZS5kYXRhLm5ld0lkKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBEZWxldGUgYSByb3cgZnJvbSB0aGUgcGhvbmVib29rIHRhYmxlLlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSAkdGFyZ2V0IC0gVGhlIGRlbGV0ZSBidXR0b24gZWxlbWVudC5cclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBpZCAtIFRoZSBJRCBvZiB0aGUgcmVjb3JkIHRvIGRlbGV0ZS5cclxuICAgICAqL1xyXG4gICAgZGVsZXRlUm93KCR0YXJnZXQsIGlkKSB7XHJcbiAgICAgICAgaWYgKGlkID09PSAnbmV3Jykge1xyXG4gICAgICAgICAgICAkdGFyZ2V0LmNsb3Nlc3QoJ3RyJykucmVtb3ZlKCk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgICQuYXBpKHtcclxuICAgICAgICAgICAgdXJsOiBgJHt0aGlzLmRlbGV0ZVJlY29yZEFKQVhVcmx9LyR7aWR9YCxcclxuICAgICAgICAgICAgb246ICdub3cnLFxyXG4gICAgICAgICAgICBvblN1Y2Nlc3M6IChyZXNwb25zZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnN1Y2Nlc3MpIHtcclxuICAgICAgICAgICAgICAgICAgICAkdGFyZ2V0LmNsb3Nlc3QoJ3RyJykucmVtb3ZlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuJHJlY29yZHNUYWJsZS5maW5kKCd0Ym9keSA+IHRyJykubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuJHJlY29yZHNUYWJsZS5maW5kKCd0Ym9keScpLmFwcGVuZCgnPHRyIGNsYXNzPVwib2RkXCI+PC90cj4nKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgfSk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ2xlYW4gbnVtYmVyIGJlZm9yZSBwYXN0aW5nLlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXN0ZWRWYWx1ZSAtIFRoZSBwYXN0ZWQgcGhvbmUgbnVtYmVyLlxyXG4gICAgICogQHJldHVybnMge3N0cmluZ30gVGhlIGNsZWFuZWQgbnVtYmVyLlxyXG4gICAgICovXHJcbiAgICBjYk9uTnVtYmVyQmVmb3JlUGFzdGUocGFzdGVkVmFsdWUpIHtcclxuICAgICAgICByZXR1cm4gcGFzdGVkVmFsdWUucmVwbGFjZSgvXFxEKy9nLCAnJyk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ2FsY3VsYXRlIHRoZSBudW1iZXIgb2Ygcm93cyB0aGF0IGNhbiBmaXQgb24gYSBwYWdlIGJhc2VkIG9uIHdpbmRvdyBoZWlnaHQuXHJcbiAgICAgKlxyXG4gICAgICogQHJldHVybnMge251bWJlcn0gVGhlIGNhbGN1bGF0ZWQgbnVtYmVyIG9mIHJvd3MuXHJcbiAgICAgKi9cclxuICAgIGNhbGN1bGF0ZVBhZ2VMZW5ndGgoKSB7XHJcbiAgICAgICAgLy8gQ2FsY3VsYXRlIHJvdyBoZWlnaHRcclxuICAgICAgICBsZXQgcm93SGVpZ2h0ID0gdGhpcy4kcmVjb3Jkc1RhYmxlLmZpbmQoJ3RyJykuZmlyc3QoKS5vdXRlckhlaWdodCgpO1xyXG5cclxuICAgICAgICAvLyBDYWxjdWxhdGUgd2luZG93IGhlaWdodCBhbmQgYXZhaWxhYmxlIHNwYWNlIGZvciB0YWJsZVxyXG4gICAgICAgIGNvbnN0IHdpbmRvd0hlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodDtcclxuICAgICAgICBjb25zdCBoZWFkZXJGb290ZXJIZWlnaHQgPSA1NTA7IC8vIEVzdGltYXRlIGhlaWdodCBmb3IgaGVhZGVyLCBmb290ZXIsIGFuZCBvdGhlciBlbGVtZW50c1xyXG5cclxuICAgICAgICAvLyBDYWxjdWxhdGUgbmV3IHBhZ2UgbGVuZ3RoXHJcbiAgICAgICAgcmV0dXJuIE1hdGgubWF4KE1hdGguZmxvb3IoKHdpbmRvd0hlaWdodCAtIGhlYWRlckZvb3RlckhlaWdodCkgLyByb3dIZWlnaHQpLCA1KTtcclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBHZXQgdGhlIHZhbHVlIG9mIGEgcXVlcnkgcGFyYW1ldGVyIGZyb20gdGhlIFVSTC5cclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFyYW0gLSBUaGUgbmFtZSBvZiB0aGUgcXVlcnkgcGFyYW1ldGVyIHRvIHJldHJpZXZlLlxyXG4gICAgICogQHJldHVybnMge3N0cmluZ3xudWxsfSBUaGUgdmFsdWUgb2YgdGhlIHF1ZXJ5IHBhcmFtZXRlciwgb3IgbnVsbCBpZiBub3QgZm91bmQuXHJcbiAgICAgKi9cclxuICAgIGdldFF1ZXJ5UGFyYW0ocGFyYW0pIHtcclxuICAgICAgICBjb25zdCB1cmxQYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xyXG4gICAgICAgIHJldHVybiB1cmxQYXJhbXMuZ2V0KHBhcmFtKTtcclxuICAgIH0sXHJcbn07XHJcblxyXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XHJcbiAgICBNb2R1bGVQaG9uZUJvb2tEVC5pbml0aWFsaXplKCk7XHJcbn0pO1xyXG4iXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQSxJQUFNQSxpQkFBaUIsR0FBRztFQUV0QjtBQUNKO0FBQ0E7QUFDQTtFQUNJQyxhQUFhLEVBQUVDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQztFQUVsQztBQUNKO0FBQ0E7QUFDQTtFQUNJQyxtQkFBbUIsRUFBQ0QsQ0FBQyxDQUFDLHFCQUFxQixDQUFDO0VBRTVDO0FBQ0o7QUFDQTtBQUNBO0VBQ0lFLHNCQUFzQixFQUFFRixDQUFDLENBQUMsMEJBQTBCLENBQUM7RUFHckQ7QUFDSjtBQUNBO0FBQ0E7RUFDSUcsU0FBUyxFQUFFLENBQUMsQ0FBQztFQUViO0FBQ0o7QUFDQTtBQUNBO0VBQ0lDLEtBQUssRUFBRUosQ0FBQyxDQUFDLE1BQU0sQ0FBQztFQUVoQjtFQUNBSyx1QkFBdUIsRUFBRUwsQ0FBQyxDQUFDLHFCQUFxQixDQUFDO0VBRWpEO0FBQ0o7QUFDQTtBQUNBO0VBQ0lNLGFBQWEsRUFBRU4sQ0FBQyxDQUFDLGtCQUFrQixDQUFDO0VBRXBDO0FBQ0o7QUFDQTtBQUNBO0VBQ0lPLGFBQWEsRUFBRVAsQ0FBQyxDQUFDLGlCQUFpQixDQUFDO0VBRW5DO0FBQ0o7QUFDQTtBQUNBO0VBQ0lRLGdCQUFnQixFQUFFLG9CQUFvQjtFQUV0QztBQUNKO0FBQ0E7QUFDQTtFQUNJQyxTQUFTLEVBQUUsSUFBSTtFQUVmO0VBQ0FDLG9CQUFvQixLQUFBQyxNQUFBLENBQUtDLGFBQWEs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