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
    var deleteButtonTemplate = "\n            <div class=\"ui basic icon buttons action-buttons tiny\">\n                <a href=\"#\" data-value=\"".concat(data.DT_RowId, "\" class=\"ui delete button\">\n                    <i class=\"icon trash ").concat(data.expired > 0 ? "blue" : "red", "\"></i>\n                </a>\n            </div>");
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJNb2R1bGVQaG9uZUJvb2tEVCIsIiRnbG9iYWxTZWFyY2giLCIkIiwiJHBhZ2VMZW5ndGhTZWxlY3RvciIsIiRzZWFyY2hFeHRlbnNpb25zSW5wdXQiLCJkYXRhVGFibGUiLCIkYm9keSIsIiRkaXNhYmxlSW5wdXRNYXNrVG9nZ2xlIiwiJHJlY29yZHNUYWJsZSIsIiRhZGROZXdCdXR0b24iLCJpbnB1dE51bWJlckpRVFBMIiwiJG1hc2tMaXN0IiwiZ2V0TmV3UmVjb3Jkc0FKQVhVcmwiLCJjb25jYXQiLCJnbG9iYWxSb290VXJsIiwiZGVsZXRlUmVjb3JkQUpBWFVybCIsInNhdmVSZWNvcmRBSkFYVXJsIiwiaW5pdGlhbGl6ZSIsImluaXRpYWxpemVTZWFyY2giLCJpbml0aWFsaXplRGF0YVRhYmxlIiwiaW5pdGlhbGl6ZUV2ZW50TGlzdGVuZXJzIiwiX3RoaXMiLCJvbiIsImUiLCJzZWFyY2hUZXh0IiwidmFsIiwidHJpbSIsImtleUNvZGUiLCJsZW5ndGgiLCJhcHBseUZpbHRlciIsIl90aGlzMiIsIm9uRmllbGRGb2N1cyIsInRhcmdldCIsInNhdmVDaGFuZ2VzRm9yQWxsUm93cyIsInByZXZlbnREZWZhdWx0IiwiaWQiLCJjbG9zZXN0IiwiZGF0YSIsImRlbGV0ZVJvdyIsImRvY3VtZW50Iiwia2V5IiwiaGFzQ2xhc3MiLCJhZGROZXdSb3ciLCJkcm9wZG93biIsIm9uQ2hhbmdlIiwicGFnZUxlbmd0aCIsImNhbGN1bGF0ZVBhZ2VMZW5ndGgiLCJsb2NhbFN0b3JhZ2UiLCJyZW1vdmVJdGVtIiwic2V0SXRlbSIsInBhZ2UiLCJsZW4iLCJkcmF3IiwiZXZlbnQiLCJzdG9wUHJvcGFnYXRpb24iLCIkaW5wdXQiLCJ0cmFuc2l0aW9uIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsImF0dHIiLCJfdGhpczMiLCIkcm93cyIsImVhY2giLCJfIiwicm93Iiwicm93SWQiLCJ1bmRlZmluZWQiLCJzZW5kQ2hhbmdlc1RvU2VydmVyIiwiJGVtcHR5Um93IiwicmVtb3ZlIiwibmV3SWQiLCJNYXRoIiwiZmxvb3IiLCJyYW5kb20iLCJuZXdSb3dUZW1wbGF0ZSIsImZpbmQiLCJwcmVwZW5kIiwiJG5ld1JvdyIsImZvY3VzIiwiaW5pdGlhbGl6ZUlucHV0bWFzayIsIl90aGlzNCIsInNhdmVkUGFnZUxlbmd0aCIsImdldEl0ZW0iLCJzZWFyY2giLCJzZXJ2ZXJTaWRlIiwicHJvY2Vzc2luZyIsImFqYXgiLCJ1cmwiLCJ0eXBlIiwiZGF0YVNyYyIsImNvbHVtbnMiLCJwYWdpbmciLCJkZWZlclJlbmRlciIsInNEb20iLCJvcmRlcmluZyIsImNyZWF0ZWRSb3ciLCJidWlsZFJvd1RlbXBsYXRlIiwiZHJhd0NhbGxiYWNrIiwibGFuZ3VhZ2UiLCJTZW1hbnRpY0xvY2FsaXphdGlvbiIsImRhdGFUYWJsZUxvY2FsaXNhdGlvbiIsIkRhdGFUYWJsZSIsInNlYXJjaERlYm91bmNlVGltZXIiLCJjbGVhclRpbWVvdXQiLCJzZXRUaW1lb3V0IiwidGV4dCIsInN0YXRlIiwibG9hZGVkIiwic2VhcmNoVmFsdWUiLCJnZXRRdWVyeVBhcmFtIiwibmFtZVRlbXBsYXRlIiwiY2FsbF9pZCIsIm51bWJlclRlbXBsYXRlIiwibnVtYmVyIiwiZGVsZXRlQnV0dG9uVGVtcGxhdGUiLCJEVF9Sb3dJZCIsImV4cGlyZWQiLCJlcSIsImh0bWwiLCIkY2hhbmdlZEZpZWxkcyIsIm9iaiIsIiRlbCIsImNoZWNrYm94IiwibWFza3NTb3J0IiwiSW5wdXRNYXNrUGF0dGVybnMiLCJpbnB1dG1hc2tzIiwiaW5wdXRtYXNrIiwiZGVmaW5pdGlvbnMiLCJ2YWxpZGF0b3IiLCJjYXJkaW5hbGl0eSIsInNob3dNYXNrT25Ib3ZlciIsIm9uQmVmb3JlUGFzdGUiLCJjYk9uTnVtYmVyQmVmb3JlUGFzdGUiLCJtYXRjaCIsInJlcGxhY2UiLCJsaXN0IiwibGlzdEtleSIsInJlY29yZElkIiwiX3RoaXM1IiwiY2FsbGVySWQiLCJudW1iZXJJbnB1dFZhbCIsInN1YnN0ciIsIm51bWJlcl9yZXAiLCJkaXNwbGF5U2F2aW5nSWNvbiIsImFwaSIsIm1ldGhvZCIsInN1Y2Nlc3NUZXN0IiwicmVzcG9uc2UiLCJzdWNjZXNzIiwib25TdWNjZXNzIiwib25TYXZlU3VjY2VzcyIsIm9uRmFpbHVyZSIsIlVzZXJNZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwibWVzc2FnZSIsIm9uRXJyb3IiLCJlcnJvck1lc3NhZ2UiLCJlbGVtZW50IiwieGhyIiwic3RhdHVzIiwid2luZG93IiwibG9jYXRpb24iLCJvbGRJZCIsIiR0YXJnZXQiLCJfdGhpczYiLCJhcHBlbmQiLCJwYXN0ZWRWYWx1ZSIsInJvd0hlaWdodCIsImZpcnN0Iiwib3V0ZXJIZWlnaHQiLCJ3aW5kb3dIZWlnaHQiLCJpbm5lckhlaWdodCIsImhlYWRlckZvb3RlckhlaWdodCIsIm1heCIsInBhcmFtIiwidXJsUGFyYW1zIiwiVVJMU2VhcmNoUGFyYW1zIiwiZ2V0IiwicmVhZHkiXSwic291cmNlcyI6WyJzcmMvbW9kdWxlLXBob25lYm9vay1kYXRhdGFibGUuanMiXSwic291cmNlc0NvbnRlbnQiOlsiLypcclxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xyXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI0IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcclxuICpcclxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcclxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcclxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cclxuICpcclxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXHJcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXHJcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcclxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cclxuICpcclxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXHJcbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXHJcbiAqL1xyXG5cclxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgU2VtYW50aWNMb2NhbGl6YXRpb24sIFVzZXJNZXNzYWdlLCBJbnB1dE1hc2tQYXR0ZXJucyAqL1xyXG5cclxuY29uc3QgTW9kdWxlUGhvbmVCb29rRFQgPSB7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBUaGUgZ2xvYmFsIHNlYXJjaCBpbnB1dCBlbGVtZW50LlxyXG4gICAgICogQHR5cGUge2pRdWVyeX1cclxuICAgICAqL1xyXG4gICAgJGdsb2JhbFNlYXJjaDogJCgnI2dsb2JhbC1zZWFyY2gnKSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIFRoZSBwYWdlIGxlbmd0aCBzZWxlY3Rvci5cclxuICAgICAqIEB0eXBlIHtqUXVlcnl9XHJcbiAgICAgKi9cclxuICAgICRwYWdlTGVuZ3RoU2VsZWN0b3I6JCgnI3BhZ2UtbGVuZ3RoLXNlbGVjdCcpLFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogVGhlIHBhZ2UgbGVuZ3RoIHNlbGVjdG9yLlxyXG4gICAgICogQHR5cGUge2pRdWVyeX1cclxuICAgICAqL1xyXG4gICAgJHNlYXJjaEV4dGVuc2lvbnNJbnB1dDogJCgnI3NlYXJjaC1leHRlbnNpb25zLWlucHV0JyksXHJcblxyXG5cclxuICAgIC8qKlxyXG4gICAgICogVGhlIGRhdGEgdGFibGUgb2JqZWN0LlxyXG4gICAgICogQHR5cGUge09iamVjdH1cclxuICAgICAqL1xyXG4gICAgZGF0YVRhYmxlOiB7fSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIFRoZSBkb2N1bWVudCBib2R5LlxyXG4gICAgICogQHR5cGUge2pRdWVyeX1cclxuICAgICAqL1xyXG4gICAgJGJvZHk6ICQoJ2JvZHknKSxcclxuXHJcbiAgICAvLyBDYWNoZWQgRE9NIGVsZW1lbnRzXHJcbiAgICAkZGlzYWJsZUlucHV0TWFza1RvZ2dsZTogJCgnI2Rpc2FibGUtaW5wdXQtbWFzaycpLFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogVGhlIGV4dGVuc2lvbnMgdGFibGUgZWxlbWVudC5cclxuICAgICAqIEB0eXBlIHtqUXVlcnl9XHJcbiAgICAgKi9cclxuICAgICRyZWNvcmRzVGFibGU6ICQoJyNwaG9uZWJvb2stdGFibGUnKSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIFRoZSBhZGQgbmV3IGJ1dHRvbiBlbGVtZW50LlxyXG4gICAgICogQHR5cGUge2pRdWVyeX1cclxuICAgICAqL1xyXG4gICAgJGFkZE5ld0J1dHRvbjogJCgnI2FkZC1uZXctYnV0dG9uJyksXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBTZWxlY3RvciBmb3IgbnVtYmVyIGlucHV0IGZpZWxkcy5cclxuICAgICAqIEB0eXBlIHtzdHJpbmd9XHJcbiAgICAgKi9cclxuICAgIGlucHV0TnVtYmVySlFUUEw6ICdpbnB1dC5udW1iZXItaW5wdXQnLFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogTGlzdCBvZiBpbnB1dCBtYXNrcy5cclxuICAgICAqIEB0eXBlIHtudWxsfEFycmF5fVxyXG4gICAgICovXHJcbiAgICAkbWFza0xpc3Q6IG51bGwsXHJcblxyXG4gICAgLy8gVVJMcyBmb3IgQUpBWCByZXF1ZXN0c1xyXG4gICAgZ2V0TmV3UmVjb3Jkc0FKQVhVcmw6IGAke2dsb2JhbFJvb3RVcmx9bW9kdWxlLXBob25lLWJvb2svZ2V0TmV3UmVjb3Jkc2AsXHJcblxyXG4gICAgZGVsZXRlUmVjb3JkQUpBWFVybDogYCR7Z2xvYmFsUm9vdFVybH1tb2R1bGUtcGhvbmUtYm9vay9kZWxldGVgLFxyXG5cclxuICAgIHNhdmVSZWNvcmRBSkFYVXJsOiBgJHtnbG9iYWxSb290VXJsfW1vZHVsZS1waG9uZS1ib29rL3NhdmVgLFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgbW9kdWxlLlxyXG4gICAgICogVGhpcyBpbmNsdWRlcyBzZXR0aW5nIHVwIGV2ZW50IGxpc3RlbmVycyBhbmQgaW5pdGlhbGl6aW5nIHRoZSBEYXRhVGFibGUuXHJcbiAgICAgKi9cclxuICAgIGluaXRpYWxpemUoKSB7XHJcbiAgICAgICAgdGhpcy5pbml0aWFsaXplU2VhcmNoKCk7XHJcbiAgICAgICAgdGhpcy5pbml0aWFsaXplRGF0YVRhYmxlKCk7XHJcbiAgICAgICAgdGhpcy5pbml0aWFsaXplRXZlbnRMaXN0ZW5lcnMoKTtcclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBJbml0aWFsaXplIHRoZSBzZWFyY2ggZnVuY3Rpb25hbGl0eS5cclxuICAgICAqIEl0IGxpc3RlbnMgZm9yIGtleSBldmVudHMgYW5kIGFwcGxpZXMgYSBmaWx0ZXIgYmFzZWQgb24gdGhlIHVzZXIncyBpbnB1dC5cclxuICAgICAqL1xyXG4gICAgaW5pdGlhbGl6ZVNlYXJjaCgpIHtcclxuICAgICAgICB0aGlzLiRnbG9iYWxTZWFyY2gub24oJ2tleXVwJywgKGUpID0+IHtcclxuICAgICAgICAgICAgY29uc3Qgc2VhcmNoVGV4dCA9IHRoaXMuJGdsb2JhbFNlYXJjaC52YWwoKS50cmltKCk7XHJcbiAgICAgICAgICAgIGlmIChlLmtleUNvZGUgPT09IDEzIHx8IGUua2V5Q29kZSA9PT0gOCB8fCBzZWFyY2hUZXh0Lmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5hcHBseUZpbHRlcihzZWFyY2hUZXh0KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIEluaXRpYWxpemUgYWxsIGV2ZW50IGxpc3RlbmVycy5cclxuICAgICAqIEhhbmRsZXMgaW5wdXQgZm9jdXMsIGZvcm0gc3VibWlzc2lvbiwgYWRkaW5nIG5ldyByb3dzLCBhbmQgZGVsZXRlIGFjdGlvbnMuXHJcbiAgICAgKi9cclxuICAgIGluaXRpYWxpemVFdmVudExpc3RlbmVycygpIHtcclxuXHJcbiAgICAgICAgLy8gSGFuZGxlIGZvY3VzIG9uIGlucHV0IGZpZWxkcyBmb3IgZWRpdGluZ1xyXG4gICAgICAgIHRoaXMuJGJvZHkub24oJ2ZvY3VzaW4nLCAnLmNhbGxlci1pZC1pbnB1dCwgLm51bWJlci1pbnB1dCcsIChlKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMub25GaWVsZEZvY3VzKCQoZS50YXJnZXQpKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gSGFuZGxlIGxvc3Mgb2YgZm9jdXMgb24gaW5wdXQgZmllbGRzIGFuZCBzYXZlIGNoYW5nZXNcclxuICAgICAgICB0aGlzLiRib2R5Lm9uKCdmb2N1c291dCcsICcuY2FsbGVyLWlkLWlucHV0LCAubnVtYmVyLWlucHV0JywgKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnNhdmVDaGFuZ2VzRm9yQWxsUm93cygpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBIYW5kbGUgZGVsZXRlIGJ1dHRvbiBjbGlja1xyXG4gICAgICAgIHRoaXMuJGJvZHkub24oJ2NsaWNrJywgJ2EuZGVsZXRlJywgKGUpID0+IHtcclxuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICBjb25zdCBpZCA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ2EnKS5kYXRhKCd2YWx1ZScpO1xyXG4gICAgICAgICAgICB0aGlzLmRlbGV0ZVJvdygkKGUudGFyZ2V0KSwgaWQpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBIYW5kbGUgRW50ZXIgb3IgVGFiIGtleSB0byB0cmlnZ2VyIGZvcm0gc3VibWlzc2lvblxyXG4gICAgICAgICQoZG9jdW1lbnQpLm9uKCdrZXlkb3duJywgKGUpID0+IHtcclxuICAgICAgICAgICAgaWYgKGUua2V5ID09PSAnRW50ZXInIHx8IChlLmtleSA9PT0gJ1RhYicgJiYgISQoJzpmb2N1cycpLmhhc0NsYXNzKCcubnVtYmVyLWlucHV0JykpKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNhdmVDaGFuZ2VzRm9yQWxsUm93cygpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIEhhbmRsZSBhZGRpbmcgYSBuZXcgcm93XHJcbiAgICAgICAgdGhpcy4kYWRkTmV3QnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XHJcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgdGhpcy5hZGROZXdSb3coKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gSGFuZGxlIHBhZ2UgbGVuZ3RoIHNlbGVjdGlvblxyXG4gICAgICAgIHRoaXMuJHBhZ2VMZW5ndGhTZWxlY3Rvci5kcm9wZG93bih7XHJcbiAgICAgICAgICAgIG9uQ2hhbmdlKHBhZ2VMZW5ndGgpIHtcclxuICAgICAgICAgICAgICAgIGlmIChwYWdlTGVuZ3RoPT09J2F1dG8nKXtcclxuICAgICAgICAgICAgICAgICAgICBwYWdlTGVuZ3RoID0gdGhpcy5jYWxjdWxhdGVQYWdlTGVuZ3RoKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oJ3Bob25lYm9va1RhYmxlUGFnZUxlbmd0aCcpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgncGhvbmVib29rVGFibGVQYWdlTGVuZ3RoJywgcGFnZUxlbmd0aCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBNb2R1bGVQaG9uZUJvb2tEVC5kYXRhVGFibGUucGFnZS5sZW4ocGFnZUxlbmd0aCkuZHJhdygpO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBQcmV2ZW50IGV2ZW50IGJ1YmJsaW5nIG9uIGRyb3Bkb3duIGNsaWNrXHJcbiAgICAgICAgdGhpcy4kcGFnZUxlbmd0aFNlbGVjdG9yLm9uKCdjbGljaycsIGZ1bmN0aW9uKGV2ZW50KSB7XHJcbiAgICAgICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpOyAvLyBQcmV2ZW50IHRoZSBldmVudCBmcm9tIGJ1YmJsaW5nXHJcbiAgICAgICAgfSk7XHJcbiAgICB9LFxyXG5cclxuXHJcbiAgICAvKipcclxuICAgICAqIEhhbmRsZSBmb2N1cyBldmVudCBvbiBhIGZpZWxkIGJ5IGFkZGluZyBhIGdsb3dpbmcgZWZmZWN0IGFuZCBlbmFibGluZyBlZGl0aW5nLlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSAkaW5wdXQgLSBUaGUgaW5wdXQgZmllbGQgdGhhdCByZWNlaXZlZCBmb2N1cy5cclxuICAgICAqL1xyXG4gICAgb25GaWVsZEZvY3VzKCRpbnB1dCkge1xyXG4gICAgICAgICRpbnB1dC50cmFuc2l0aW9uKCdnbG93Jyk7XHJcbiAgICAgICAgJGlucHV0LmNsb3Nlc3QoJ2RpdicpLnJlbW92ZUNsYXNzKCd0cmFuc3BhcmVudCcpLmFkZENsYXNzKCdjaGFuZ2VkLWZpZWxkJyk7XHJcbiAgICAgICAgJGlucHV0LmF0dHIoJ3JlYWRvbmx5JywgZmFsc2UpO1xyXG4gICAgfSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIFNhdmUgY2hhbmdlcyBmb3IgYWxsIG1vZGlmaWVkIHJvd3MuXHJcbiAgICAgKiBJdCBzZW5kcyB0aGUgY2hhbmdlcyBmb3IgZWFjaCBtb2RpZmllZCByb3cgdG8gdGhlIHNlcnZlci5cclxuICAgICAqL1xyXG4gICAgc2F2ZUNoYW5nZXNGb3JBbGxSb3dzKCkge1xyXG4gICAgICAgIGNvbnN0ICRyb3dzID0gJCgnLmNoYW5nZWQtZmllbGQnKS5jbG9zZXN0KCd0cicpO1xyXG4gICAgICAgICRyb3dzLmVhY2goKF8sIHJvdykgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCByb3dJZCA9ICQocm93KS5hdHRyKCdpZCcpO1xyXG4gICAgICAgICAgICBpZiAocm93SWQgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zZW5kQ2hhbmdlc1RvU2VydmVyKHJvd0lkKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIEFkZCBhIG5ldyByb3cgdG8gdGhlIHBob25lYm9vayB0YWJsZS5cclxuICAgICAqIFRoZSByb3cgaXMgZWRpdGFibGUgYW5kIGFsbG93cyBmb3IgaW5wdXQgb2YgbmV3IGNvbnRhY3QgaW5mb3JtYXRpb24uXHJcbiAgICAgKi9cclxuICAgIGFkZE5ld1JvdygpIHtcclxuICAgICAgICBjb25zdCAkZW1wdHlSb3cgPSAkKCcuZGF0YVRhYmxlc19lbXB0eScpO1xyXG4gICAgICAgIGlmICgkZW1wdHlSb3cubGVuZ3RoKSAkZW1wdHlSb3cucmVtb3ZlKCk7XHJcblxyXG4gICAgICAgIHRoaXMuc2F2ZUNoYW5nZXNGb3JBbGxSb3dzKCk7XHJcblxyXG4gICAgICAgIGNvbnN0IG5ld0lkID0gYG5ldyR7TWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogNTAwKX1gO1xyXG4gICAgICAgIGNvbnN0IG5ld1Jvd1RlbXBsYXRlID0gYFxyXG4gICAgICAgICAgICA8dHIgaWQ9XCIke25ld0lkfVwiPlxyXG4gICAgICAgICAgICAgICAgPHRkPjxpIGNsYXNzPVwidWkgdXNlciBjaXJjbGUgaWNvblwiPjwvaT48L3RkPlxyXG4gICAgICAgICAgICAgICAgPHRkPjxkaXYgY2xhc3M9XCJ1aSBmbHVpZCBpbnB1dCBpbmxpbmUtZWRpdCBjaGFuZ2VkLWZpZWxkXCI+PGlucHV0IGNsYXNzPVwiY2FsbGVyLWlkLWlucHV0XCIgdHlwZT1cInRleHRcIiB2YWx1ZT1cIlwiPjwvZGl2PjwvdGQ+XHJcbiAgICAgICAgICAgICAgICA8dGQ+PGRpdiBjbGFzcz1cInVpIGZsdWlkIGlucHV0IGlubGluZS1lZGl0IGNoYW5nZWQtZmllbGRcIj48aW5wdXQgY2xhc3M9XCJudW1iZXItaW5wdXRcIiB0eXBlPVwidGV4dFwiIHZhbHVlPVwiXCI+PC9kaXY+PC90ZD5cclxuICAgICAgICAgICAgICAgIDx0ZD48ZGl2IGNsYXNzPVwidWkgYmFzaWMgaWNvbiBidXR0b25zIGFjdGlvbi1idXR0b25zIHRpbnlcIj5cclxuICAgICAgICAgICAgICAgICAgICA8YSBocmVmPVwiI1wiIGNsYXNzPVwidWkgYnV0dG9uIGRlbGV0ZVwiIGRhdGEtdmFsdWU9XCJuZXdcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpY29uIHRyYXNoIHJlZFwiPjwvaT5cclxuICAgICAgICAgICAgICAgICAgICA8L2E+XHJcbiAgICAgICAgICAgICAgICA8L2Rpdj48L3RkPlxyXG4gICAgICAgICAgICA8L3RyPmA7XHJcblxyXG4gICAgICAgIHRoaXMuJHJlY29yZHNUYWJsZS5maW5kKCd0Ym9keScpLnByZXBlbmQobmV3Um93VGVtcGxhdGUpO1xyXG4gICAgICAgIGNvbnN0ICRuZXdSb3cgPSAkKGAjJHtuZXdJZH1gKTtcclxuICAgICAgICAkbmV3Um93LmZpbmQoJ2lucHV0JykudHJhbnNpdGlvbignZ2xvdycpO1xyXG4gICAgICAgICRuZXdSb3cuZmluZCgnLmNhbGxlci1pZC1pbnB1dCcpLmZvY3VzKCk7XHJcbiAgICAgICAgdGhpcy5pbml0aWFsaXplSW5wdXRtYXNrKCRuZXdSb3cuZmluZCgnLm51bWJlci1pbnB1dCcpKTtcclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBJbml0aWFsaXplIHRoZSBEYXRhVGFibGUgaW5zdGFuY2Ugd2l0aCB0aGUgcmVxdWlyZWQgc2V0dGluZ3MgYW5kIG9wdGlvbnMuXHJcbiAgICAgKi9cclxuICAgIGluaXRpYWxpemVEYXRhVGFibGUoKSB7XHJcblxyXG4gICAgICAgIC8vIEdldCB0aGUgdXNlcidzIHNhdmVkIHZhbHVlIG9yIHVzZSB0aGUgYXV0b21hdGljYWxseSBjYWxjdWxhdGVkIHZhbHVlIGlmIG5vbmUgZXhpc3RzXHJcbiAgICAgICAgY29uc3Qgc2F2ZWRQYWdlTGVuZ3RoID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ3Bob25lYm9va1RhYmxlUGFnZUxlbmd0aCcpO1xyXG4gICAgICAgIGNvbnN0IHBhZ2VMZW5ndGggPSBzYXZlZFBhZ2VMZW5ndGggPyBzYXZlZFBhZ2VMZW5ndGggOiB0aGlzLmNhbGN1bGF0ZVBhZ2VMZW5ndGgoKTtcclxuXHJcbiAgICAgICAgdGhpcy4kcmVjb3Jkc1RhYmxlLmRhdGFUYWJsZSh7XHJcbiAgICAgICAgICAgIHNlYXJjaDogeyBzZWFyY2g6IHRoaXMuJGdsb2JhbFNlYXJjaC52YWwoKSB9LFxyXG4gICAgICAgICAgICBzZXJ2ZXJTaWRlOiB0cnVlLFxyXG4gICAgICAgICAgICBwcm9jZXNzaW5nOiB0cnVlLFxyXG4gICAgICAgICAgICBhamF4OiB7XHJcbiAgICAgICAgICAgICAgICB1cmw6IHRoaXMuZ2V0TmV3UmVjb3Jkc0FKQVhVcmwsXHJcbiAgICAgICAgICAgICAgICB0eXBlOiAnUE9TVCcsXHJcbiAgICAgICAgICAgICAgICBkYXRhU3JjOiAnZGF0YScsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGNvbHVtbnM6IFtcclxuICAgICAgICAgICAgICAgIHsgZGF0YTogbnVsbCB9LFxyXG4gICAgICAgICAgICAgICAgeyBkYXRhOiAnY2FsbF9pZCcgfSxcclxuICAgICAgICAgICAgICAgIHsgZGF0YTogJ251bWJlcicgfSxcclxuICAgICAgICAgICAgICAgIHsgZGF0YTogbnVsbCB9LFxyXG4gICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICBwYWdpbmc6IHRydWUsXHJcbiAgICAgICAgICAgIHBhZ2VMZW5ndGg6IHBhZ2VMZW5ndGgsXHJcbiAgICAgICAgICAgIGRlZmVyUmVuZGVyOiB0cnVlLFxyXG4gICAgICAgICAgICBzRG9tOiAncnRpcCcsXHJcbiAgICAgICAgICAgIG9yZGVyaW5nOiBmYWxzZSxcclxuICAgICAgICAgICAgY3JlYXRlZFJvdzogKHJvdywgZGF0YSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5idWlsZFJvd1RlbXBsYXRlKHJvdywgZGF0YSk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGRyYXdDYWxsYmFjazogKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pbml0aWFsaXplSW5wdXRtYXNrKCQodGhpcy5pbnB1dE51bWJlckpRVFBMKSk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGxhbmd1YWdlOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5kYXRhVGFibGVMb2NhbGlzYXRpb24sXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRoaXMuZGF0YVRhYmxlID0gdGhpcy4kcmVjb3Jkc1RhYmxlLkRhdGFUYWJsZSgpO1xyXG5cclxuXHJcbiAgICAgICAgLy8gU2V0IHRoZSBzZWxlY3QgaW5wdXQgdmFsdWUgdG8gdGhlIHNhdmVkIHZhbHVlIGlmIGl0IGV4aXN0c1xyXG4gICAgICAgIGlmIChzYXZlZFBhZ2VMZW5ndGgpIHtcclxuICAgICAgICAgICAgdGhpcy4kcGFnZUxlbmd0aFNlbGVjdG9yLmRyb3Bkb3duKCdzZXQgdmFsdWUnLCBzYXZlZFBhZ2VMZW5ndGgpO1xyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgIC8vIEluaXRpYWxpemUgZGVib3VuY2UgdGltZXIgdmFyaWFibGVcclxuICAgICAgICBsZXQgc2VhcmNoRGVib3VuY2VUaW1lciA9IG51bGw7XHJcblxyXG4gICAgICAgIHRoaXMuJGdsb2JhbFNlYXJjaC5vbigna2V5dXAnLCAoZSkgPT4ge1xyXG4gICAgICAgICAgICAvLyBDbGVhciBwcmV2aW91cyB0aW1lciBpZiB0aGUgdXNlciBpcyBzdGlsbCB0eXBpbmdcclxuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHNlYXJjaERlYm91bmNlVGltZXIpO1xyXG5cclxuICAgICAgICAgICAgLy8gU2V0IGEgbmV3IHRpbWVyIGZvciBkZWxheWVkIGV4ZWN1dGlvblxyXG4gICAgICAgICAgICBzZWFyY2hEZWJvdW5jZVRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB0ZXh0ID0gdGhpcy4kZ2xvYmFsU2VhcmNoLnZhbCgpO1xyXG4gICAgICAgICAgICAgICAgLy8gVHJpZ2dlciB0aGUgc2VhcmNoIGlmIGlucHV0IGlzIHZhbGlkIChFbnRlciwgQmFja3NwYWNlLCBvciBtb3JlIHRoYW4gMiBjaGFyYWN0ZXJzKVxyXG4gICAgICAgICAgICAgICAgaWYgKGUua2V5Q29kZSA9PT0gMTMgfHwgZS5rZXlDb2RlID09PSA4IHx8IHRleHQubGVuZ3RoID49IDIpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFwcGx5RmlsdGVyKHRleHQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LCA1MDApOyAvLyA1MDBtcyBkZWxheSBiZWZvcmUgZXhlY3V0aW5nIHRoZSBzZWFyY2hcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gUmVzdG9yZSB0aGUgc2F2ZWQgc2VhcmNoIHBocmFzZSBmcm9tIERhdGFUYWJsZXMgc3RhdGVcclxuICAgICAgICBjb25zdCBzdGF0ZSA9IHRoaXMuZGF0YVRhYmxlLnN0YXRlLmxvYWRlZCgpO1xyXG4gICAgICAgIGlmIChzdGF0ZSAmJiBzdGF0ZS5zZWFyY2gpIHtcclxuICAgICAgICAgICAgdGhpcy4kZ2xvYmFsU2VhcmNoLnZhbChzdGF0ZS5zZWFyY2guc2VhcmNoKTsgLy8gU2V0IHRoZSBzZWFyY2ggZmllbGQgd2l0aCB0aGUgc2F2ZWQgdmFsdWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFJldHJpZXZlcyB0aGUgdmFsdWUgb2YgJ3NlYXJjaCcgcXVlcnkgcGFyYW1ldGVyIGZyb20gdGhlIFVSTC5cclxuICAgICAgICBjb25zdCBzZWFyY2hWYWx1ZSA9IHRoaXMuZ2V0UXVlcnlQYXJhbSgnc2VhcmNoJyk7XHJcblxyXG4gICAgICAgIC8vIFNldHMgdGhlIGdsb2JhbCBzZWFyY2ggaW5wdXQgdmFsdWUgYW5kIGFwcGxpZXMgdGhlIGZpbHRlciBpZiBhIHNlYXJjaCB2YWx1ZSBpcyBwcm92aWRlZC5cclxuICAgICAgICBpZiAoc2VhcmNoVmFsdWUpIHtcclxuICAgICAgICAgICAgdGhpcy4kZ2xvYmFsU2VhcmNoLnZhbChzZWFyY2hWYWx1ZSk7XHJcbiAgICAgICAgICAgIHRoaXMuYXBwbHlGaWx0ZXIoc2VhcmNoVmFsdWUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5kYXRhVGFibGUub24oJ2RyYXcnLCAoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuJGdsb2JhbFNlYXJjaC5jbG9zZXN0KCdkaXYnKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIEJ1aWxkIHRoZSBIVE1MIHRlbXBsYXRlIGZvciBlYWNoIHJvdyBpbiB0aGUgRGF0YVRhYmxlLlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IHJvdyAtIFRoZSByb3cgZWxlbWVudC5cclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gVGhlIGRhdGEgb2JqZWN0IGZvciB0aGUgcm93LlxyXG4gICAgICovXHJcbiAgICBidWlsZFJvd1RlbXBsYXRlKHJvdywgZGF0YSkge1xyXG4gICAgICAgIGNvbnN0IG5hbWVUZW1wbGF0ZSA9IGBcclxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHRyYW5zcGFyZW50IGZsdWlkIGlucHV0IGlubGluZS1lZGl0XCI+XHJcbiAgICAgICAgICAgICAgICA8aW5wdXQgY2xhc3M9XCJjYWxsZXItaWQtaW5wdXRcIiB0eXBlPVwidGV4dFwiIHZhbHVlPVwiJHtkYXRhLmNhbGxfaWR9XCIgLz5cclxuICAgICAgICAgICAgPC9kaXY+YDtcclxuICAgICAgICBjb25zdCBudW1iZXJUZW1wbGF0ZSA9IGBcclxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHRyYW5zcGFyZW50IGlucHV0IGlubGluZS1lZGl0XCI+XHJcbiAgICAgICAgICAgICAgICA8aW5wdXQgY2xhc3M9XCJudW1iZXItaW5wdXRcIiB0eXBlPVwidGV4dFwiIHZhbHVlPVwiJHtkYXRhLm51bWJlcn1cIiAvPlxyXG4gICAgICAgICAgICA8L2Rpdj5gO1xyXG4gICAgICAgIGNvbnN0IGRlbGV0ZUJ1dHRvblRlbXBsYXRlID0gYFxyXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgYmFzaWMgaWNvbiBidXR0b25zIGFjdGlvbi1idXR0b25zIHRpbnlcIj5cclxuICAgICAgICAgICAgICAgIDxhIGhyZWY9XCIjXCIgZGF0YS12YWx1ZT1cIiR7ZGF0YS5EVF9Sb3dJZH1cIiBjbGFzcz1cInVpIGRlbGV0ZSBidXR0b25cIj5cclxuICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImljb24gdHJhc2ggJHtkYXRhLmV4cGlyZWQgPiAwID8gYGJsdWVgIDogYHJlZGB9XCI+PC9pPlxyXG4gICAgICAgICAgICAgICAgPC9hPlxyXG4gICAgICAgICAgICA8L2Rpdj5gO1xyXG5cclxuICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMCkuaHRtbCgnPGkgY2xhc3M9XCJ1aSB1c2VyIGNpcmNsZSBpY29uXCI+PC9pPicpO1xyXG4gICAgICAgICQoJ3RkJywgcm93KS5lcSgxKS5odG1sKG5hbWVUZW1wbGF0ZSk7XHJcbiAgICAgICAgJCgndGQnLCByb3cpLmVxKDIpLmh0bWwobnVtYmVyVGVtcGxhdGUpO1xyXG4gICAgICAgICQoJ3RkJywgcm93KS5lcSgzKS5odG1sKGRlbGV0ZUJ1dHRvblRlbXBsYXRlKTtcclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBBcHBseSBhIHNlYXJjaCBmaWx0ZXIgdG8gdGhlIERhdGFUYWJsZS5cclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIFRoZSBzZWFyY2ggdGV4dCB0byBhcHBseS5cclxuICAgICAqL1xyXG4gICAgYXBwbHlGaWx0ZXIodGV4dCkge1xyXG4gICAgICAgIGNvbnN0ICRjaGFuZ2VkRmllbGRzID0gJCgnLmNoYW5nZWQtZmllbGQnKTtcclxuICAgICAgICAkY2hhbmdlZEZpZWxkcy5lYWNoKChfLCBvYmopID0+IHtcclxuICAgICAgICAgICAgY29uc3QgJGlucHV0ID0gJChvYmopLmZpbmQoJ2lucHV0Jyk7XHJcbiAgICAgICAgICAgICRpbnB1dC52YWwoJGlucHV0LmRhdGEoJ3ZhbHVlJykpO1xyXG4gICAgICAgICAgICAkaW5wdXQuYXR0cigncmVhZG9ubHknLCB0cnVlKTtcclxuICAgICAgICAgICAgJChvYmopLnJlbW92ZUNsYXNzKCdjaGFuZ2VkLWZpZWxkJykuYWRkQ2xhc3MoJ3RyYW5zcGFyZW50Jyk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgdGhpcy5kYXRhVGFibGUuc2VhcmNoKHRleHQpLmRyYXcoKTtcclxuICAgICAgICB0aGlzLiRnbG9iYWxTZWFyY2guY2xvc2VzdCgnZGl2JykuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBJbml0aWFsaXplIGlucHV0IG1hc2tzIGZvciBwaG9uZSBudW1iZXIgZmllbGRzLlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSAkZWwgLSBUaGUgaW5wdXQgZWxlbWVudHMgdG8gYXBwbHkgbWFza3MgdG8uXHJcbiAgICAgKi9cclxuICAgIGluaXRpYWxpemVJbnB1dG1hc2soJGVsKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuJGRpc2FibGVJbnB1dE1hc2tUb2dnbGUuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkgcmV0dXJuO1xyXG5cclxuICAgICAgICBpZiAodGhpcy4kbWFza0xpc3QgPT09IG51bGwpIHtcclxuICAgICAgICAgICAgdGhpcy4kbWFza0xpc3QgPSAkLm1hc2tzU29ydChJbnB1dE1hc2tQYXR0ZXJucywgWycjJ10sIC9bMC05XXwjLywgJ21hc2snKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgICRlbC5pbnB1dG1hc2tzKHtcclxuICAgICAgICAgICAgaW5wdXRtYXNrOiB7XHJcbiAgICAgICAgICAgICAgICBkZWZpbml0aW9uczoge1xyXG4gICAgICAgICAgICAgICAgICAgICcjJzogeyB2YWxpZGF0b3I6ICdbMC05XScsIGNhcmRpbmFsaXR5OiAxIH0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgc2hvd01hc2tPbkhvdmVyOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIG9uQmVmb3JlUGFzdGU6IHRoaXMuY2JPbk51bWJlckJlZm9yZVBhc3RlLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBtYXRjaDogL1swLTldLyxcclxuICAgICAgICAgICAgcmVwbGFjZTogJzknLFxyXG4gICAgICAgICAgICBsaXN0OiB0aGlzLiRtYXNrTGlzdCxcclxuICAgICAgICAgICAgbGlzdEtleTogJ21hc2snLFxyXG4gICAgICAgIH0pO1xyXG4gICAgfSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIFNlbmQgdGhlIGNoYW5nZXMgZm9yIGEgc3BlY2lmaWMgcm93IHRvIHRoZSBzZXJ2ZXIuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHJlY29yZElkIC0gVGhlIElEIG9mIHRoZSByZWNvcmQgdG8gc2F2ZS5cclxuICAgICAqL1xyXG4gICAgc2VuZENoYW5nZXNUb1NlcnZlcihyZWNvcmRJZCkge1xyXG4gICAgICAgIGNvbnN0IGNhbGxlcklkID0gJChgdHIjJHtyZWNvcmRJZH0gLmNhbGxlci1pZC1pbnB1dGApLnZhbCgpO1xyXG4gICAgICAgIGNvbnN0IG51bWJlcklucHV0VmFsID0gJChgdHIjJHtyZWNvcmRJZH0gLm51bWJlci1pbnB1dGApLnZhbCgpO1xyXG5cclxuICAgICAgICBpZiAoIWNhbGxlcklkIHx8ICFudW1iZXJJbnB1dFZhbCkgcmV0dXJuO1xyXG5cclxuICAgICAgICBsZXQgbnVtYmVyID0gbnVtYmVySW5wdXRWYWwucmVwbGFjZSgvXFxEKy9nLCAnJyk7XHJcbiAgICAgICAgbnVtYmVyID0gYDEke251bWJlci5zdWJzdHIobnVtYmVyLmxlbmd0aCAtIDkpfWA7XHJcblxyXG4gICAgICAgIGNvbnN0IGRhdGEgPSB7XHJcbiAgICAgICAgICAgIGNhbGxfaWQ6IGNhbGxlcklkLFxyXG4gICAgICAgICAgICBudW1iZXJfcmVwOiBudW1iZXJJbnB1dFZhbCxcclxuICAgICAgICAgICAgbnVtYmVyLFxyXG4gICAgICAgICAgICBpZDogcmVjb3JkSWQsXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdGhpcy5kaXNwbGF5U2F2aW5nSWNvbihyZWNvcmRJZCk7XHJcblxyXG4gICAgICAgICQuYXBpKHtcclxuICAgICAgICAgICAgdXJsOiB0aGlzLnNhdmVSZWNvcmRBSkFYVXJsLFxyXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcclxuICAgICAgICAgICAgb246ICdub3cnLFxyXG4gICAgICAgICAgICBkYXRhLFxyXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogKHJlc3BvbnNlKSA9PiByZXNwb25zZSAmJiByZXNwb25zZS5zdWNjZXNzID09PSB0cnVlLFxyXG4gICAgICAgICAgICBvblN1Y2Nlc3M6IChyZXNwb25zZSkgPT4gdGhpcy5vblNhdmVTdWNjZXNzKHJlc3BvbnNlLCByZWNvcmRJZCksXHJcbiAgICAgICAgICAgIG9uRmFpbHVyZTogKHJlc3BvbnNlKSA9PiBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZSksXHJcbiAgICAgICAgICAgIG9uRXJyb3I6IChlcnJvck1lc3NhZ2UsIGVsZW1lbnQsIHhocikgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKHhoci5zdGF0dXMgPT09IDQwMykgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2luZGV4YDtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICB9KTtcclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBEaXNwbGF5IGEgc2F2aW5nIGljb24gZm9yIHRoZSBnaXZlbiByZWNvcmQuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHJlY29yZElkIC0gVGhlIElEIG9mIHRoZSByZWNvcmQgYmVpbmcgc2F2ZWQuXHJcbiAgICAgKi9cclxuICAgIGRpc3BsYXlTYXZpbmdJY29uKHJlY29yZElkKSB7XHJcbiAgICAgICAgJChgdHIjJHtyZWNvcmRJZH0gLnVzZXIuY2lyY2xlYClcclxuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCd1c2VyIGNpcmNsZScpXHJcbiAgICAgICAgICAgIC5hZGRDbGFzcygnc3Bpbm5lciBsb2FkaW5nJyk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogSGFuZGxlIHN1Y2Nlc3NmdWwgc2F2aW5nIG9mIGEgcmVjb3JkLlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSBzZXJ2ZXIgcmVzcG9uc2UuXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcmVjb3JkSWQgLSBUaGUgSUQgb2YgdGhlIHJlY29yZCB0aGF0IHdhcyBzYXZlZC5cclxuICAgICAqL1xyXG4gICAgb25TYXZlU3VjY2VzcyhyZXNwb25zZSwgcmVjb3JkSWQpIHtcclxuICAgICAgICBpZiAocmVzcG9uc2UuZGF0YSkge1xyXG4gICAgICAgICAgICBsZXQgb2xkSWQgPSByZXNwb25zZS5kYXRhLm9sZElkIHx8IHJlY29yZElkO1xyXG4gICAgICAgICAgICAkKGB0ciMke29sZElkfSBpbnB1dGApLmF0dHIoJ3JlYWRvbmx5JywgdHJ1ZSk7XHJcbiAgICAgICAgICAgICQoYHRyIyR7b2xkSWR9IGRpdmApLnJlbW92ZUNsYXNzKCdjaGFuZ2VkLWZpZWxkIGxvYWRpbmcnKS5hZGRDbGFzcygndHJhbnNwYXJlbnQnKTtcclxuICAgICAgICAgICAgJChgdHIjJHtvbGRJZH0gLnNwaW5uZXIubG9hZGluZ2ApLmFkZENsYXNzKCd1c2VyIGNpcmNsZScpLnJlbW92ZUNsYXNzKCdzcGlubmVyIGxvYWRpbmcnKTtcclxuICAgICAgICAgICAgaWYgKG9sZElkICE9PSByZXNwb25zZS5kYXRhLm5ld0lkKSB7XHJcbiAgICAgICAgICAgICAgICAkKGB0ciMke29sZElkfWApLmF0dHIoJ2lkJywgcmVzcG9uc2UuZGF0YS5uZXdJZCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogRGVsZXRlIGEgcm93IGZyb20gdGhlIHBob25lYm9vayB0YWJsZS5cclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0ge2pRdWVyeX0gJHRhcmdldCAtIFRoZSBkZWxldGUgYnV0dG9uIGVsZW1lbnQuXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaWQgLSBUaGUgSUQgb2YgdGhlIHJlY29yZCB0byBkZWxldGUuXHJcbiAgICAgKi9cclxuICAgIGRlbGV0ZVJvdygkdGFyZ2V0LCBpZCkge1xyXG4gICAgICAgIGlmIChpZCA9PT0gJ25ldycpIHtcclxuICAgICAgICAgICAgJHRhcmdldC5jbG9zZXN0KCd0cicpLnJlbW92ZSgpO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAkLmFwaSh7XHJcbiAgICAgICAgICAgIHVybDogYCR7dGhpcy5kZWxldGVSZWNvcmRBSkFYVXJsfS8ke2lkfWAsXHJcbiAgICAgICAgICAgIG9uOiAnbm93JyxcclxuICAgICAgICAgICAgb25TdWNjZXNzOiAocmVzcG9uc2UpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5zdWNjZXNzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJHRhcmdldC5jbG9zZXN0KCd0cicpLnJlbW92ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLiRyZWNvcmRzVGFibGUuZmluZCgndGJvZHkgPiB0cicpLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLiRyZWNvcmRzVGFibGUuZmluZCgndGJvZHknKS5hcHBlbmQoJzx0ciBjbGFzcz1cIm9kZFwiPjwvdHI+Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgIH0pO1xyXG4gICAgfSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIENsZWFuIG51bWJlciBiZWZvcmUgcGFzdGluZy5cclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFzdGVkVmFsdWUgLSBUaGUgcGFzdGVkIHBob25lIG51bWJlci5cclxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSBjbGVhbmVkIG51bWJlci5cclxuICAgICAqL1xyXG4gICAgY2JPbk51bWJlckJlZm9yZVBhc3RlKHBhc3RlZFZhbHVlKSB7XHJcbiAgICAgICAgcmV0dXJuIHBhc3RlZFZhbHVlLnJlcGxhY2UoL1xcRCsvZywgJycpO1xyXG4gICAgfSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIENhbGN1bGF0ZSB0aGUgbnVtYmVyIG9mIHJvd3MgdGhhdCBjYW4gZml0IG9uIGEgcGFnZSBiYXNlZCBvbiB3aW5kb3cgaGVpZ2h0LlxyXG4gICAgICpcclxuICAgICAqIEByZXR1cm5zIHtudW1iZXJ9IFRoZSBjYWxjdWxhdGVkIG51bWJlciBvZiByb3dzLlxyXG4gICAgICovXHJcbiAgICBjYWxjdWxhdGVQYWdlTGVuZ3RoKCkge1xyXG4gICAgICAgIC8vIENhbGN1bGF0ZSByb3cgaGVpZ2h0XHJcbiAgICAgICAgbGV0IHJvd0hlaWdodCA9IHRoaXMuJHJlY29yZHNUYWJsZS5maW5kKCd0cicpLmZpcnN0KCkub3V0ZXJIZWlnaHQoKTtcclxuXHJcbiAgICAgICAgLy8gQ2FsY3VsYXRlIHdpbmRvdyBoZWlnaHQgYW5kIGF2YWlsYWJsZSBzcGFjZSBmb3IgdGFibGVcclxuICAgICAgICBjb25zdCB3aW5kb3dIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XHJcbiAgICAgICAgY29uc3QgaGVhZGVyRm9vdGVySGVpZ2h0ID0gNTUwOyAvLyBFc3RpbWF0ZSBoZWlnaHQgZm9yIGhlYWRlciwgZm9vdGVyLCBhbmQgb3RoZXIgZWxlbWVudHNcclxuXHJcbiAgICAgICAgLy8gQ2FsY3VsYXRlIG5ldyBwYWdlIGxlbmd0aFxyXG4gICAgICAgIHJldHVybiBNYXRoLm1heChNYXRoLmZsb29yKCh3aW5kb3dIZWlnaHQgLSBoZWFkZXJGb290ZXJIZWlnaHQpIC8gcm93SGVpZ2h0KSwgNSk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogR2V0IHRoZSB2YWx1ZSBvZiBhIHF1ZXJ5IHBhcmFtZXRlciBmcm9tIHRoZSBVUkwuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtIC0gVGhlIG5hbWUgb2YgdGhlIHF1ZXJ5IHBhcmFtZXRlciB0byByZXRyaWV2ZS5cclxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd8bnVsbH0gVGhlIHZhbHVlIG9mIHRoZSBxdWVyeSBwYXJhbWV0ZXIsIG9yIG51bGwgaWYgbm90IGZvdW5kLlxyXG4gICAgICovXHJcbiAgICBnZXRRdWVyeVBhcmFtKHBhcmFtKSB7XHJcbiAgICAgICAgY29uc3QgdXJsUGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcclxuICAgICAgICByZXR1cm4gdXJsUGFyYW1zLmdldChwYXJhbSk7XHJcbiAgICB9LFxyXG59O1xyXG5cclxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xyXG4gICAgTW9kdWxlUGhvbmVCb29rRFQuaW5pdGlhbGl6ZSgpO1xyXG59KTtcclxuIl0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUEsSUFBTUEsaUJBQWlCLEdBQUc7RUFFdEI7QUFDSjtBQUNBO0FBQ0E7RUFDSUMsYUFBYSxFQUFFQyxDQUFDLENBQUMsZ0JBQWdCLENBQUM7RUFFbEM7QUFDSjtBQUNBO0FBQ0E7RUFDSUMsbUJBQW1CLEVBQUNELENBQUMsQ0FBQyxxQkFBcUIsQ0FBQztFQUU1QztBQUNKO0FBQ0E7QUFDQTtFQUNJRSxzQkFBc0IsRUFBRUYsQ0FBQyxDQUFDLDBCQUEwQixDQUFDO0VBR3JEO0FBQ0o7QUFDQTtBQUNBO0VBQ0lHLFNBQVMsRUFBRSxDQUFDLENBQUM7RUFFYjtBQUNKO0FBQ0E7QUFDQTtFQUNJQyxLQUFLLEVBQUVKLENBQUMsQ0FBQyxNQUFNLENBQUM7RUFFaEI7RUFDQUssdUJBQXVCLEVBQUVMLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQztFQUVqRDtBQUNKO0FBQ0E7QUFDQTtFQUNJTSxhQUFhLEVBQUVOLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQztFQUVwQztBQUNKO0FBQ0E7QUFDQTtFQUNJTyxhQUFhLEVBQUVQLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQztFQUVuQztBQUNKO0FBQ0E7QUFDQTtFQUNJUSxnQkFBZ0IsRUFBRSxvQkFBb0I7RUFFdEM7QUFDSjtBQUNBO0FBQ0E7RUFDSUMsU0FBUyxFQUFFLElBQUk7RUFFZjtFQUNBQyxvQkFBb0IsS0FBQUMsTUFBQSxDQUFLQyxhQUFh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