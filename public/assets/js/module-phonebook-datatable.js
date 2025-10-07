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
    var nameTemplate = "<div class=\"ui transparent fluid input inline-edit\">\n                <input class=\"caller-id-input\" type=\"text\" value=\"".concat(data.call_id, "\" />\n            </div>");
    var numberTemplate = "<div class=\"ui transparent input inline-edit\">\n                <input class=\"number-input\" type=\"text\" value=\"".concat(data.number, "\" />\n            </div>");
    var deleteButtonTemplate = "<div class=\"ui basic icon buttons action-buttons tiny\">\n                <a href=\"#\" data-value=\"".concat(data.DT_RowId, "\" class=\"ui delete button\">\n                    <i class=\"icon trash ").concat((data === null || data === void 0 ? void 0 : data.created) > 0 ? 'blue' : 'red', "\" />\n                </a>\n            </div>");
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJNb2R1bGVQaG9uZUJvb2tEVCIsIiRnbG9iYWxTZWFyY2giLCIkIiwiJHBhZ2VMZW5ndGhTZWxlY3RvciIsIiRzZWFyY2hFeHRlbnNpb25zSW5wdXQiLCJkYXRhVGFibGUiLCIkYm9keSIsIiRkaXNhYmxlSW5wdXRNYXNrVG9nZ2xlIiwiJHJlY29yZHNUYWJsZSIsIiRhZGROZXdCdXR0b24iLCJpbnB1dE51bWJlckpRVFBMIiwiJG1hc2tMaXN0IiwiZ2V0TmV3UmVjb3Jkc0FKQVhVcmwiLCJjb25jYXQiLCJnbG9iYWxSb290VXJsIiwiZGVsZXRlUmVjb3JkQUpBWFVybCIsInNhdmVSZWNvcmRBSkFYVXJsIiwiaW5pdGlhbGl6ZSIsImluaXRpYWxpemVTZWFyY2giLCJpbml0aWFsaXplRGF0YVRhYmxlIiwiaW5pdGlhbGl6ZUV2ZW50TGlzdGVuZXJzIiwiX3RoaXMiLCJvbiIsImUiLCJzZWFyY2hUZXh0IiwidmFsIiwidHJpbSIsImtleUNvZGUiLCJsZW5ndGgiLCJhcHBseUZpbHRlciIsIl90aGlzMiIsIm9uRmllbGRGb2N1cyIsInRhcmdldCIsInNhdmVDaGFuZ2VzRm9yQWxsUm93cyIsInByZXZlbnREZWZhdWx0IiwiaWQiLCJjbG9zZXN0IiwiZGF0YSIsImRlbGV0ZVJvdyIsImRvY3VtZW50Iiwia2V5IiwiaGFzQ2xhc3MiLCJhZGROZXdSb3ciLCJkcm9wZG93biIsIm9uQ2hhbmdlIiwicGFnZUxlbmd0aCIsImNhbGN1bGF0ZVBhZ2VMZW5ndGgiLCJsb2NhbFN0b3JhZ2UiLCJyZW1vdmVJdGVtIiwic2V0SXRlbSIsInBhZ2UiLCJsZW4iLCJkcmF3IiwiZXZlbnQiLCJzdG9wUHJvcGFnYXRpb24iLCIkaW5wdXQiLCJ0cmFuc2l0aW9uIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsImF0dHIiLCJfdGhpczMiLCIkcm93cyIsImVhY2giLCJfIiwicm93Iiwicm93SWQiLCJ1bmRlZmluZWQiLCJzZW5kQ2hhbmdlc1RvU2VydmVyIiwiJGVtcHR5Um93IiwicmVtb3ZlIiwibmV3SWQiLCJNYXRoIiwiZmxvb3IiLCJyYW5kb20iLCJuZXdSb3dUZW1wbGF0ZSIsImZpbmQiLCJwcmVwZW5kIiwiJG5ld1JvdyIsImZvY3VzIiwiaW5pdGlhbGl6ZUlucHV0bWFzayIsIl90aGlzNCIsInNhdmVkUGFnZUxlbmd0aCIsImdldEl0ZW0iLCJzZWFyY2giLCJzZXJ2ZXJTaWRlIiwicHJvY2Vzc2luZyIsImFqYXgiLCJ1cmwiLCJ0eXBlIiwiZGF0YVNyYyIsImNvbHVtbnMiLCJwYWdpbmciLCJkZWZlclJlbmRlciIsInNEb20iLCJvcmRlcmluZyIsImNyZWF0ZWRSb3ciLCJidWlsZFJvd1RlbXBsYXRlIiwiZHJhd0NhbGxiYWNrIiwibGFuZ3VhZ2UiLCJTZW1hbnRpY0xvY2FsaXphdGlvbiIsImRhdGFUYWJsZUxvY2FsaXNhdGlvbiIsIkRhdGFUYWJsZSIsInNlYXJjaERlYm91bmNlVGltZXIiLCJjbGVhclRpbWVvdXQiLCJzZXRUaW1lb3V0IiwidGV4dCIsInN0YXRlIiwibG9hZGVkIiwic2VhcmNoVmFsdWUiLCJnZXRRdWVyeVBhcmFtIiwibmFtZVRlbXBsYXRlIiwiY2FsbF9pZCIsIm51bWJlclRlbXBsYXRlIiwibnVtYmVyIiwiZGVsZXRlQnV0dG9uVGVtcGxhdGUiLCJEVF9Sb3dJZCIsImNyZWF0ZWQiLCJlcSIsImh0bWwiLCIkY2hhbmdlZEZpZWxkcyIsIm9iaiIsIiRlbCIsImNoZWNrYm94IiwibWFza3NTb3J0IiwiSW5wdXRNYXNrUGF0dGVybnMiLCJpbnB1dG1hc2tzIiwiaW5wdXRtYXNrIiwiZGVmaW5pdGlvbnMiLCJ2YWxpZGF0b3IiLCJjYXJkaW5hbGl0eSIsInNob3dNYXNrT25Ib3ZlciIsIm9uQmVmb3JlUGFzdGUiLCJjYk9uTnVtYmVyQmVmb3JlUGFzdGUiLCJtYXRjaCIsInJlcGxhY2UiLCJsaXN0IiwibGlzdEtleSIsInJlY29yZElkIiwiX3RoaXM1IiwiY2FsbGVySWQiLCJudW1iZXJJbnB1dFZhbCIsIm51bWJlcl9yZXAiLCJkaXNwbGF5U2F2aW5nSWNvbiIsImFwaSIsIm1ldGhvZCIsInN1Y2Nlc3NUZXN0IiwicmVzcG9uc2UiLCJzdWNjZXNzIiwib25TdWNjZXNzIiwib25TYXZlU3VjY2VzcyIsIm9uRmFpbHVyZSIsIlVzZXJNZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwibWVzc2FnZSIsIm9uRXJyb3IiLCJlcnJvck1lc3NhZ2UiLCJlbGVtZW50IiwieGhyIiwic3RhdHVzIiwid2luZG93IiwibG9jYXRpb24iLCJvbGRJZCIsIiR0YXJnZXQiLCJfdGhpczYiLCJhcHBlbmQiLCJwYXN0ZWRWYWx1ZSIsInJvd0hlaWdodCIsImZpcnN0Iiwib3V0ZXJIZWlnaHQiLCJ3aW5kb3dIZWlnaHQiLCJpbm5lckhlaWdodCIsImhlYWRlckZvb3RlckhlaWdodCIsIm1heCIsInBhcmFtIiwidXJsUGFyYW1zIiwiVVJMU2VhcmNoUGFyYW1zIiwiZ2V0IiwicmVhZHkiXSwic291cmNlcyI6WyJzcmMvbW9kdWxlLXBob25lYm9vay1kYXRhdGFibGUuanMiXSwic291cmNlc0NvbnRlbnQiOlsiLypcclxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xyXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI0IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcclxuICpcclxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcclxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcclxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cclxuICpcclxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXHJcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXHJcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcclxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cclxuICpcclxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXHJcbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXHJcbiAqL1xyXG5cclxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgU2VtYW50aWNMb2NhbGl6YXRpb24sIFVzZXJNZXNzYWdlLCBJbnB1dE1hc2tQYXR0ZXJucyAqL1xyXG5cclxuY29uc3QgTW9kdWxlUGhvbmVCb29rRFQgPSB7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBUaGUgZ2xvYmFsIHNlYXJjaCBpbnB1dCBlbGVtZW50LlxyXG4gICAgICogQHR5cGUge2pRdWVyeX1cclxuICAgICAqL1xyXG4gICAgJGdsb2JhbFNlYXJjaDogJCgnI2dsb2JhbC1zZWFyY2gnKSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIFRoZSBwYWdlIGxlbmd0aCBzZWxlY3Rvci5cclxuICAgICAqIEB0eXBlIHtqUXVlcnl9XHJcbiAgICAgKi9cclxuICAgICRwYWdlTGVuZ3RoU2VsZWN0b3I6ICQoJyNwYWdlLWxlbmd0aC1zZWxlY3QnKSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIFRoZSBwYWdlIGxlbmd0aCBzZWxlY3Rvci5cclxuICAgICAqIEB0eXBlIHtqUXVlcnl9XHJcbiAgICAgKi9cclxuICAgICRzZWFyY2hFeHRlbnNpb25zSW5wdXQ6ICQoJyNzZWFyY2gtZXh0ZW5zaW9ucy1pbnB1dCcpLFxyXG5cclxuXHJcbiAgICAvKipcclxuICAgICAqIFRoZSBkYXRhIHRhYmxlIG9iamVjdC5cclxuICAgICAqIEB0eXBlIHtPYmplY3R9XHJcbiAgICAgKi9cclxuICAgIGRhdGFUYWJsZToge30sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBUaGUgZG9jdW1lbnQgYm9keS5cclxuICAgICAqIEB0eXBlIHtqUXVlcnl9XHJcbiAgICAgKi9cclxuICAgICRib2R5OiAkKCdib2R5JyksXHJcblxyXG4gICAgLy8gQ2FjaGVkIERPTSBlbGVtZW50c1xyXG4gICAgJGRpc2FibGVJbnB1dE1hc2tUb2dnbGU6ICQoJyNkaXNhYmxlLWlucHV0LW1hc2snKSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIFRoZSBleHRlbnNpb25zIHRhYmxlIGVsZW1lbnQuXHJcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxyXG4gICAgICovXHJcbiAgICAkcmVjb3Jkc1RhYmxlOiAkKCcjcGhvbmVib29rLXRhYmxlJyksXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBUaGUgYWRkIG5ldyBidXR0b24gZWxlbWVudC5cclxuICAgICAqIEB0eXBlIHtqUXVlcnl9XHJcbiAgICAgKi9cclxuICAgICRhZGROZXdCdXR0b246ICQoJyNhZGQtbmV3LWJ1dHRvbicpLFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogU2VsZWN0b3IgZm9yIG51bWJlciBpbnB1dCBmaWVsZHMuXHJcbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxyXG4gICAgICovXHJcbiAgICBpbnB1dE51bWJlckpRVFBMOiAnaW5wdXQubnVtYmVyLWlucHV0JyxcclxuXHJcbiAgICAvKipcclxuICAgICAqIExpc3Qgb2YgaW5wdXQgbWFza3MuXHJcbiAgICAgKiBAdHlwZSB7bnVsbHxBcnJheX1cclxuICAgICAqL1xyXG4gICAgJG1hc2tMaXN0OiBudWxsLFxyXG5cclxuICAgIC8vIFVSTHMgZm9yIEFKQVggcmVxdWVzdHNcclxuICAgIGdldE5ld1JlY29yZHNBSkFYVXJsOiBgJHtnbG9iYWxSb290VXJsfW1vZHVsZS1waG9uZS1ib29rL2dldE5ld1JlY29yZHNgLFxyXG5cclxuICAgIGRlbGV0ZVJlY29yZEFKQVhVcmw6IGAke2dsb2JhbFJvb3RVcmx9bW9kdWxlLXBob25lLWJvb2svZGVsZXRlYCxcclxuXHJcbiAgICBzYXZlUmVjb3JkQUpBWFVybDogYCR7Z2xvYmFsUm9vdFVybH1tb2R1bGUtcGhvbmUtYm9vay9zYXZlYCxcclxuXHJcbiAgICAvKipcclxuICAgICAqIEluaXRpYWxpemUgdGhlIG1vZHVsZS5cclxuICAgICAqIFRoaXMgaW5jbHVkZXMgc2V0dGluZyB1cCBldmVudCBsaXN0ZW5lcnMgYW5kIGluaXRpYWxpemluZyB0aGUgRGF0YVRhYmxlLlxyXG4gICAgICovXHJcbiAgICBpbml0aWFsaXplKCkge1xyXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZVNlYXJjaCgpO1xyXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZURhdGFUYWJsZSgpO1xyXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUV2ZW50TGlzdGVuZXJzKCk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgc2VhcmNoIGZ1bmN0aW9uYWxpdHkuXHJcbiAgICAgKiBJdCBsaXN0ZW5zIGZvciBrZXkgZXZlbnRzIGFuZCBhcHBsaWVzIGEgZmlsdGVyIGJhc2VkIG9uIHRoZSB1c2VyJ3MgaW5wdXQuXHJcbiAgICAgKi9cclxuICAgIGluaXRpYWxpemVTZWFyY2goKSB7XHJcbiAgICAgICAgdGhpcy4kZ2xvYmFsU2VhcmNoLm9uKCdrZXl1cCcsIChlKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IHNlYXJjaFRleHQgPSB0aGlzLiRnbG9iYWxTZWFyY2gudmFsKCkudHJpbSgpO1xyXG4gICAgICAgICAgICBpZiAoZS5rZXlDb2RlID09PSAxMyB8fCBlLmtleUNvZGUgPT09IDggfHwgc2VhcmNoVGV4dC5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuYXBwbHlGaWx0ZXIoc2VhcmNoVGV4dCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBJbml0aWFsaXplIGFsbCBldmVudCBsaXN0ZW5lcnMuXHJcbiAgICAgKiBIYW5kbGVzIGlucHV0IGZvY3VzLCBmb3JtIHN1Ym1pc3Npb24sIGFkZGluZyBuZXcgcm93cywgYW5kIGRlbGV0ZSBhY3Rpb25zLlxyXG4gICAgICovXHJcbiAgICBpbml0aWFsaXplRXZlbnRMaXN0ZW5lcnMoKSB7XHJcblxyXG4gICAgICAgIC8vIEhhbmRsZSBmb2N1cyBvbiBpbnB1dCBmaWVsZHMgZm9yIGVkaXRpbmdcclxuICAgICAgICB0aGlzLiRib2R5Lm9uKCdmb2N1c2luJywgJy5jYWxsZXItaWQtaW5wdXQsIC5udW1iZXItaW5wdXQnLCAoZSkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLm9uRmllbGRGb2N1cygkKGUudGFyZ2V0KSk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIEhhbmRsZSBsb3NzIG9mIGZvY3VzIG9uIGlucHV0IGZpZWxkcyBhbmQgc2F2ZSBjaGFuZ2VzXHJcbiAgICAgICAgdGhpcy4kYm9keS5vbignZm9jdXNvdXQnLCAnLmNhbGxlci1pZC1pbnB1dCwgLm51bWJlci1pbnB1dCcsICgpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5zYXZlQ2hhbmdlc0ZvckFsbFJvd3MoKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gSGFuZGxlIGRlbGV0ZSBidXR0b24gY2xpY2tcclxuICAgICAgICB0aGlzLiRib2R5Lm9uKCdjbGljaycsICdhLmRlbGV0ZScsIChlKSA9PiB7XHJcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgY29uc3QgaWQgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCdhJykuZGF0YSgndmFsdWUnKTtcclxuICAgICAgICAgICAgdGhpcy5kZWxldGVSb3coJChlLnRhcmdldCksIGlkKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gSGFuZGxlIEVudGVyIG9yIFRhYiBrZXkgdG8gdHJpZ2dlciBmb3JtIHN1Ym1pc3Npb25cclxuICAgICAgICAkKGRvY3VtZW50KS5vbigna2V5ZG93bicsIChlKSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChlLmtleSA9PT0gJ0VudGVyJyB8fCAoZS5rZXkgPT09ICdUYWInICYmICEkKCc6Zm9jdXMnKS5oYXNDbGFzcygnLm51bWJlci1pbnB1dCcpKSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zYXZlQ2hhbmdlc0ZvckFsbFJvd3MoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBIYW5kbGUgYWRkaW5nIGEgbmV3IHJvd1xyXG4gICAgICAgIHRoaXMuJGFkZE5ld0J1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xyXG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkTmV3Um93KCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIEhhbmRsZSBwYWdlIGxlbmd0aCBzZWxlY3Rpb25cclxuICAgICAgICB0aGlzLiRwYWdlTGVuZ3RoU2VsZWN0b3IuZHJvcGRvd24oe1xyXG4gICAgICAgICAgICBvbkNoYW5nZShwYWdlTGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAocGFnZUxlbmd0aCA9PT0gJ2F1dG8nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcGFnZUxlbmd0aCA9IHRoaXMuY2FsY3VsYXRlUGFnZUxlbmd0aCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKCdwaG9uZWJvb2tUYWJsZVBhZ2VMZW5ndGgnKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ3Bob25lYm9va1RhYmxlUGFnZUxlbmd0aCcsIHBhZ2VMZW5ndGgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgTW9kdWxlUGhvbmVCb29rRFQuZGF0YVRhYmxlLnBhZ2UubGVuKHBhZ2VMZW5ndGgpLmRyYXcoKTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gUHJldmVudCBldmVudCBidWJibGluZyBvbiBkcm9wZG93biBjbGlja1xyXG4gICAgICAgIHRoaXMuJHBhZ2VMZW5ndGhTZWxlY3Rvci5vbignY2xpY2snLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7IC8vIFByZXZlbnQgdGhlIGV2ZW50IGZyb20gYnViYmxpbmdcclxuICAgICAgICB9KTtcclxuICAgIH0sXHJcblxyXG5cclxuICAgIC8qKlxyXG4gICAgICogSGFuZGxlIGZvY3VzIGV2ZW50IG9uIGEgZmllbGQgYnkgYWRkaW5nIGEgZ2xvd2luZyBlZmZlY3QgYW5kIGVuYWJsaW5nIGVkaXRpbmcuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICRpbnB1dCAtIFRoZSBpbnB1dCBmaWVsZCB0aGF0IHJlY2VpdmVkIGZvY3VzLlxyXG4gICAgICovXHJcbiAgICBvbkZpZWxkRm9jdXMoJGlucHV0KSB7XHJcbiAgICAgICAgJGlucHV0LnRyYW5zaXRpb24oJ2dsb3cnKTtcclxuICAgICAgICAkaW5wdXQuY2xvc2VzdCgnZGl2JykucmVtb3ZlQ2xhc3MoJ3RyYW5zcGFyZW50JykuYWRkQ2xhc3MoJ2NoYW5nZWQtZmllbGQnKTtcclxuICAgICAgICAkaW5wdXQuYXR0cigncmVhZG9ubHknLCBmYWxzZSk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogU2F2ZSBjaGFuZ2VzIGZvciBhbGwgbW9kaWZpZWQgcm93cy5cclxuICAgICAqIEl0IHNlbmRzIHRoZSBjaGFuZ2VzIGZvciBlYWNoIG1vZGlmaWVkIHJvdyB0byB0aGUgc2VydmVyLlxyXG4gICAgICovXHJcbiAgICBzYXZlQ2hhbmdlc0ZvckFsbFJvd3MoKSB7XHJcbiAgICAgICAgY29uc3QgJHJvd3MgPSAkKCcuY2hhbmdlZC1maWVsZCcpLmNsb3Nlc3QoJ3RyJyk7XHJcbiAgICAgICAgJHJvd3MuZWFjaCgoXywgcm93KSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJvd0lkID0gJChyb3cpLmF0dHIoJ2lkJyk7XHJcbiAgICAgICAgICAgIGlmIChyb3dJZCAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNlbmRDaGFuZ2VzVG9TZXJ2ZXIocm93SWQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQWRkIGEgbmV3IHJvdyB0byB0aGUgcGhvbmVib29rIHRhYmxlLlxyXG4gICAgICogVGhlIHJvdyBpcyBlZGl0YWJsZSBhbmQgYWxsb3dzIGZvciBpbnB1dCBvZiBuZXcgY29udGFjdCBpbmZvcm1hdGlvbi5cclxuICAgICAqL1xyXG4gICAgYWRkTmV3Um93KCkge1xyXG4gICAgICAgIGNvbnN0ICRlbXB0eVJvdyA9ICQoJy5kYXRhVGFibGVzX2VtcHR5Jyk7XHJcbiAgICAgICAgaWYgKCRlbXB0eVJvdy5sZW5ndGgpICRlbXB0eVJvdy5yZW1vdmUoKTtcclxuXHJcbiAgICAgICAgdGhpcy5zYXZlQ2hhbmdlc0ZvckFsbFJvd3MoKTtcclxuXHJcbiAgICAgICAgY29uc3QgbmV3SWQgPSBgbmV3JHtNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiA1MDApfWA7XHJcbiAgICAgICAgY29uc3QgbmV3Um93VGVtcGxhdGUgPSBgXHJcbiAgICAgICAgICAgIDx0ciBpZD1cIiR7bmV3SWR9XCI+XHJcbiAgICAgICAgICAgICAgICA8dGQ+PGkgY2xhc3M9XCJ1aSB1c2VyIGNpcmNsZSBpY29uXCI+PC9pPjwvdGQ+XHJcbiAgICAgICAgICAgICAgICA8dGQ+PGRpdiBjbGFzcz1cInVpIGZsdWlkIGlucHV0IGlubGluZS1lZGl0IGNoYW5nZWQtZmllbGRcIj48aW5wdXQgY2xhc3M9XCJjYWxsZXItaWQtaW5wdXRcIiB0eXBlPVwidGV4dFwiIHZhbHVlPVwiXCI+PC9kaXY+PC90ZD5cclxuICAgICAgICAgICAgICAgIDx0ZD48ZGl2IGNsYXNzPVwidWkgZmx1aWQgaW5wdXQgaW5saW5lLWVkaXQgY2hhbmdlZC1maWVsZFwiPjxpbnB1dCBjbGFzcz1cIm51bWJlci1pbnB1dFwiIHR5cGU9XCJ0ZXh0XCIgdmFsdWU9XCJcIj48L2Rpdj48L3RkPlxyXG4gICAgICAgICAgICAgICAgPHRkPjxkaXYgY2xhc3M9XCJ1aSBiYXNpYyBpY29uIGJ1dHRvbnMgYWN0aW9uLWJ1dHRvbnMgdGlueVwiPlxyXG4gICAgICAgICAgICAgICAgICAgIDxhIGhyZWY9XCIjXCIgY2xhc3M9XCJ1aSBidXR0b24gZGVsZXRlXCIgZGF0YS12YWx1ZT1cIm5ld1wiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImljb24gdHJhc2ggcmVkXCI+PC9pPlxyXG4gICAgICAgICAgICAgICAgICAgIDwvYT5cclxuICAgICAgICAgICAgICAgIDwvZGl2PjwvdGQ+XHJcbiAgICAgICAgICAgIDwvdHI+YDtcclxuXHJcbiAgICAgICAgdGhpcy4kcmVjb3Jkc1RhYmxlLmZpbmQoJ3Rib2R5JykucHJlcGVuZChuZXdSb3dUZW1wbGF0ZSk7XHJcbiAgICAgICAgY29uc3QgJG5ld1JvdyA9ICQoYCMke25ld0lkfWApO1xyXG4gICAgICAgICRuZXdSb3cuZmluZCgnaW5wdXQnKS50cmFuc2l0aW9uKCdnbG93Jyk7XHJcbiAgICAgICAgJG5ld1Jvdy5maW5kKCcuY2FsbGVyLWlkLWlucHV0JykuZm9jdXMoKTtcclxuICAgICAgICB0aGlzLmluaXRpYWxpemVJbnB1dG1hc2soJG5ld1Jvdy5maW5kKCcubnVtYmVyLWlucHV0JykpO1xyXG4gICAgfSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIEluaXRpYWxpemUgdGhlIERhdGFUYWJsZSBpbnN0YW5jZSB3aXRoIHRoZSByZXF1aXJlZCBzZXR0aW5ncyBhbmQgb3B0aW9ucy5cclxuICAgICAqL1xyXG4gICAgaW5pdGlhbGl6ZURhdGFUYWJsZSgpIHtcclxuXHJcbiAgICAgICAgLy8gR2V0IHRoZSB1c2VyJ3Mgc2F2ZWQgdmFsdWUgb3IgdXNlIHRoZSBhdXRvbWF0aWNhbGx5IGNhbGN1bGF0ZWQgdmFsdWUgaWYgbm9uZSBleGlzdHNcclxuICAgICAgICBjb25zdCBzYXZlZFBhZ2VMZW5ndGggPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgncGhvbmVib29rVGFibGVQYWdlTGVuZ3RoJyk7XHJcbiAgICAgICAgY29uc3QgcGFnZUxlbmd0aCA9IHNhdmVkUGFnZUxlbmd0aCA/IHNhdmVkUGFnZUxlbmd0aCA6IHRoaXMuY2FsY3VsYXRlUGFnZUxlbmd0aCgpO1xyXG5cclxuICAgICAgICB0aGlzLiRyZWNvcmRzVGFibGUuZGF0YVRhYmxlKHtcclxuICAgICAgICAgICAgc2VhcmNoOiB7c2VhcmNoOiB0aGlzLiRnbG9iYWxTZWFyY2gudmFsKCl9LFxyXG4gICAgICAgICAgICBzZXJ2ZXJTaWRlOiB0cnVlLFxyXG4gICAgICAgICAgICBwcm9jZXNzaW5nOiB0cnVlLFxyXG4gICAgICAgICAgICBhamF4OiB7XHJcbiAgICAgICAgICAgICAgICB1cmw6IHRoaXMuZ2V0TmV3UmVjb3Jkc0FKQVhVcmwsXHJcbiAgICAgICAgICAgICAgICB0eXBlOiAnUE9TVCcsXHJcbiAgICAgICAgICAgICAgICBkYXRhU3JjOiAnZGF0YScsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGNvbHVtbnM6IFtcclxuICAgICAgICAgICAgICAgIHtkYXRhOiBudWxsfSxcclxuICAgICAgICAgICAgICAgIHtkYXRhOiAnY2FsbF9pZCd9LFxyXG4gICAgICAgICAgICAgICAge2RhdGE6ICdudW1iZXInfSxcclxuICAgICAgICAgICAgICAgIHtkYXRhOiBudWxsfSxcclxuICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgcGFnaW5nOiB0cnVlLFxyXG4gICAgICAgICAgICBwYWdlTGVuZ3RoOiBwYWdlTGVuZ3RoLFxyXG4gICAgICAgICAgICBkZWZlclJlbmRlcjogdHJ1ZSxcclxuICAgICAgICAgICAgc0RvbTogJ3J0aXAnLFxyXG4gICAgICAgICAgICBvcmRlcmluZzogZmFsc2UsXHJcbiAgICAgICAgICAgIGNyZWF0ZWRSb3c6IChyb3csIGRhdGEpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMuYnVpbGRSb3dUZW1wbGF0ZShyb3csIGRhdGEpO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBkcmF3Q2FsbGJhY2s6ICgpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMuaW5pdGlhbGl6ZUlucHV0bWFzaygkKHRoaXMuaW5wdXROdW1iZXJKUVRQTCkpO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBsYW5ndWFnZTogU2VtYW50aWNMb2NhbGl6YXRpb24uZGF0YVRhYmxlTG9jYWxpc2F0aW9uLFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICB0aGlzLmRhdGFUYWJsZSA9IHRoaXMuJHJlY29yZHNUYWJsZS5EYXRhVGFibGUoKTtcclxuXHJcblxyXG4gICAgICAgIC8vIFNldCB0aGUgc2VsZWN0IGlucHV0IHZhbHVlIHRvIHRoZSBzYXZlZCB2YWx1ZSBpZiBpdCBleGlzdHNcclxuICAgICAgICBpZiAoc2F2ZWRQYWdlTGVuZ3RoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuJHBhZ2VMZW5ndGhTZWxlY3Rvci5kcm9wZG93bignc2V0IHZhbHVlJywgc2F2ZWRQYWdlTGVuZ3RoKTtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICAvLyBJbml0aWFsaXplIGRlYm91bmNlIHRpbWVyIHZhcmlhYmxlXHJcbiAgICAgICAgbGV0IHNlYXJjaERlYm91bmNlVGltZXIgPSBudWxsO1xyXG5cclxuICAgICAgICB0aGlzLiRnbG9iYWxTZWFyY2gub24oJ2tleXVwJywgKGUpID0+IHtcclxuICAgICAgICAgICAgLy8gQ2xlYXIgcHJldmlvdXMgdGltZXIgaWYgdGhlIHVzZXIgaXMgc3RpbGwgdHlwaW5nXHJcbiAgICAgICAgICAgIGNsZWFyVGltZW91dChzZWFyY2hEZWJvdW5jZVRpbWVyKTtcclxuXHJcbiAgICAgICAgICAgIC8vIFNldCBhIG5ldyB0aW1lciBmb3IgZGVsYXllZCBleGVjdXRpb25cclxuICAgICAgICAgICAgc2VhcmNoRGVib3VuY2VUaW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdGV4dCA9IHRoaXMuJGdsb2JhbFNlYXJjaC52YWwoKTtcclxuICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgdGhlIHNlYXJjaCBpZiBpbnB1dCBpcyB2YWxpZCAoRW50ZXIsIEJhY2tzcGFjZSwgb3IgbW9yZSB0aGFuIDIgY2hhcmFjdGVycylcclxuICAgICAgICAgICAgICAgIGlmIChlLmtleUNvZGUgPT09IDEzIHx8IGUua2V5Q29kZSA9PT0gOCB8fCB0ZXh0Lmxlbmd0aCA+PSAyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hcHBseUZpbHRlcih0ZXh0KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSwgNTAwKTsgLy8gNTAwbXMgZGVsYXkgYmVmb3JlIGV4ZWN1dGluZyB0aGUgc2VhcmNoXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIFJlc3RvcmUgdGhlIHNhdmVkIHNlYXJjaCBwaHJhc2UgZnJvbSBEYXRhVGFibGVzIHN0YXRlXHJcbiAgICAgICAgY29uc3Qgc3RhdGUgPSB0aGlzLmRhdGFUYWJsZS5zdGF0ZS5sb2FkZWQoKTtcclxuICAgICAgICBpZiAoc3RhdGUgJiYgc3RhdGUuc2VhcmNoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuJGdsb2JhbFNlYXJjaC52YWwoc3RhdGUuc2VhcmNoLnNlYXJjaCk7IC8vIFNldCB0aGUgc2VhcmNoIGZpZWxkIHdpdGggdGhlIHNhdmVkIHZhbHVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBSZXRyaWV2ZXMgdGhlIHZhbHVlIG9mICdzZWFyY2gnIHF1ZXJ5IHBhcmFtZXRlciBmcm9tIHRoZSBVUkwuXHJcbiAgICAgICAgY29uc3Qgc2VhcmNoVmFsdWUgPSB0aGlzLmdldFF1ZXJ5UGFyYW0oJ3NlYXJjaCcpO1xyXG5cclxuICAgICAgICAvLyBTZXRzIHRoZSBnbG9iYWwgc2VhcmNoIGlucHV0IHZhbHVlIGFuZCBhcHBsaWVzIHRoZSBmaWx0ZXIgaWYgYSBzZWFyY2ggdmFsdWUgaXMgcHJvdmlkZWQuXHJcbiAgICAgICAgaWYgKHNlYXJjaFZhbHVlKSB7XHJcbiAgICAgICAgICAgIHRoaXMuJGdsb2JhbFNlYXJjaC52YWwoc2VhcmNoVmFsdWUpO1xyXG4gICAgICAgICAgICB0aGlzLmFwcGx5RmlsdGVyKHNlYXJjaFZhbHVlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuZGF0YVRhYmxlLm9uKCdkcmF3JywgKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLiRnbG9iYWxTZWFyY2guY2xvc2VzdCgnZGl2JykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcclxuICAgICAgICB9KTtcclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBCdWlsZCB0aGUgSFRNTCB0ZW1wbGF0ZSBmb3IgZWFjaCByb3cgaW4gdGhlIERhdGFUYWJsZS5cclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0ge0hUTUxFbGVtZW50fSByb3cgLSBUaGUgcm93IGVsZW1lbnQuXHJcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIFRoZSBkYXRhIG9iamVjdCBmb3IgdGhlIHJvdy5cclxuICAgICAqL1xyXG4gICAgYnVpbGRSb3dUZW1wbGF0ZShyb3csIGRhdGEpIHtcclxuICAgICAgICBjb25zdCBuYW1lVGVtcGxhdGUgPSBgPGRpdiBjbGFzcz1cInVpIHRyYW5zcGFyZW50IGZsdWlkIGlucHV0IGlubGluZS1lZGl0XCI+XHJcbiAgICAgICAgICAgICAgICA8aW5wdXQgY2xhc3M9XCJjYWxsZXItaWQtaW5wdXRcIiB0eXBlPVwidGV4dFwiIHZhbHVlPVwiJHtkYXRhLmNhbGxfaWR9XCIgLz5cclxuICAgICAgICAgICAgPC9kaXY+YDtcclxuICAgICAgICBjb25zdCBudW1iZXJUZW1wbGF0ZSA9IGA8ZGl2IGNsYXNzPVwidWkgdHJhbnNwYXJlbnQgaW5wdXQgaW5saW5lLWVkaXRcIj5cclxuICAgICAgICAgICAgICAgIDxpbnB1dCBjbGFzcz1cIm51bWJlci1pbnB1dFwiIHR5cGU9XCJ0ZXh0XCIgdmFsdWU9XCIke2RhdGEubnVtYmVyfVwiIC8+XHJcbiAgICAgICAgICAgIDwvZGl2PmA7XHJcbiAgICAgICAgY29uc3QgZGVsZXRlQnV0dG9uVGVtcGxhdGUgPSBgPGRpdiBjbGFzcz1cInVpIGJhc2ljIGljb24gYnV0dG9ucyBhY3Rpb24tYnV0dG9ucyB0aW55XCI+XHJcbiAgICAgICAgICAgICAgICA8YSBocmVmPVwiI1wiIGRhdGEtdmFsdWU9XCIke2RhdGEuRFRfUm93SWR9XCIgY2xhc3M9XCJ1aSBkZWxldGUgYnV0dG9uXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpY29uIHRyYXNoICR7ZGF0YT8uY3JlYXRlZCA+IDAgPyAnYmx1ZScgOiAncmVkJ31cIiAvPlxyXG4gICAgICAgICAgICAgICAgPC9hPlxyXG4gICAgICAgICAgICA8L2Rpdj5gO1xyXG5cclxuICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMCkuaHRtbCgnPGkgY2xhc3M9XCJ1aSB1c2VyIGNpcmNsZSBpY29uXCI+PC9pPicpO1xyXG4gICAgICAgICQoJ3RkJywgcm93KS5lcSgxKS5odG1sKG5hbWVUZW1wbGF0ZSk7XHJcbiAgICAgICAgJCgndGQnLCByb3cpLmVxKDIpLmh0bWwobnVtYmVyVGVtcGxhdGUpO1xyXG4gICAgICAgICQoJ3RkJywgcm93KS5lcSgzKS5odG1sKGRlbGV0ZUJ1dHRvblRlbXBsYXRlKTtcclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBBcHBseSBhIHNlYXJjaCBmaWx0ZXIgdG8gdGhlIERhdGFUYWJsZS5cclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIFRoZSBzZWFyY2ggdGV4dCB0byBhcHBseS5cclxuICAgICAqL1xyXG4gICAgYXBwbHlGaWx0ZXIodGV4dCkge1xyXG4gICAgICAgIGNvbnN0ICRjaGFuZ2VkRmllbGRzID0gJCgnLmNoYW5nZWQtZmllbGQnKTtcclxuICAgICAgICAkY2hhbmdlZEZpZWxkcy5lYWNoKChfLCBvYmopID0+IHtcclxuICAgICAgICAgICAgY29uc3QgJGlucHV0ID0gJChvYmopLmZpbmQoJ2lucHV0Jyk7XHJcbiAgICAgICAgICAgICRpbnB1dC52YWwoJGlucHV0LmRhdGEoJ3ZhbHVlJykpO1xyXG4gICAgICAgICAgICAkaW5wdXQuYXR0cigncmVhZG9ubHknLCB0cnVlKTtcclxuICAgICAgICAgICAgJChvYmopLnJlbW92ZUNsYXNzKCdjaGFuZ2VkLWZpZWxkJykuYWRkQ2xhc3MoJ3RyYW5zcGFyZW50Jyk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgdGhpcy5kYXRhVGFibGUuc2VhcmNoKHRleHQpLmRyYXcoKTtcclxuICAgICAgICB0aGlzLiRnbG9iYWxTZWFyY2guY2xvc2VzdCgnZGl2JykuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBJbml0aWFsaXplIGlucHV0IG1hc2tzIGZvciBwaG9uZSBudW1iZXIgZmllbGRzLlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSAkZWwgLSBUaGUgaW5wdXQgZWxlbWVudHMgdG8gYXBwbHkgbWFza3MgdG8uXHJcbiAgICAgKi9cclxuICAgIGluaXRpYWxpemVJbnB1dG1hc2soJGVsKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuJGRpc2FibGVJbnB1dE1hc2tUb2dnbGUuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkgcmV0dXJuO1xyXG5cclxuICAgICAgICBpZiAodGhpcy4kbWFza0xpc3QgPT09IG51bGwpIHtcclxuICAgICAgICAgICAgdGhpcy4kbWFza0xpc3QgPSAkLm1hc2tzU29ydChJbnB1dE1hc2tQYXR0ZXJucywgWycjJ10sIC9bMC05XXwjLywgJ21hc2snKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgICRlbC5pbnB1dG1hc2tzKHtcclxuICAgICAgICAgICAgaW5wdXRtYXNrOiB7XHJcbiAgICAgICAgICAgICAgICBkZWZpbml0aW9uczoge1xyXG4gICAgICAgICAgICAgICAgICAgICcjJzoge3ZhbGlkYXRvcjogJ1swLTldJywgY2FyZGluYWxpdHk6IDF9LFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHNob3dNYXNrT25Ib3ZlcjogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICBvbkJlZm9yZVBhc3RlOiB0aGlzLmNiT25OdW1iZXJCZWZvcmVQYXN0ZSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgbWF0Y2g6IC9bMC05XS8sXHJcbiAgICAgICAgICAgIHJlcGxhY2U6ICc5JyxcclxuICAgICAgICAgICAgbGlzdDogdGhpcy4kbWFza0xpc3QsXHJcbiAgICAgICAgICAgIGxpc3RLZXk6ICdtYXNrJyxcclxuICAgICAgICB9KTtcclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBTZW5kIHRoZSBjaGFuZ2VzIGZvciBhIHNwZWNpZmljIHJvdyB0byB0aGUgc2VydmVyLlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSByZWNvcmRJZCAtIFRoZSBJRCBvZiB0aGUgcmVjb3JkIHRvIHNhdmUuXHJcbiAgICAgKi9cclxuICAgIHNlbmRDaGFuZ2VzVG9TZXJ2ZXIocmVjb3JkSWQpIHtcclxuICAgICAgICBjb25zdCBjYWxsZXJJZCA9ICQoYHRyIyR7cmVjb3JkSWR9IC5jYWxsZXItaWQtaW5wdXRgKS52YWwoKTtcclxuICAgICAgICBjb25zdCBudW1iZXJJbnB1dFZhbCA9ICQoYHRyIyR7cmVjb3JkSWR9IC5udW1iZXItaW5wdXRgKS52YWwoKTtcclxuXHJcbiAgICAgICAgaWYgKCFjYWxsZXJJZCB8fCAhbnVtYmVySW5wdXRWYWwpIHJldHVybjtcclxuXHJcbiAgICAgICAgY29uc3QgZGF0YSA9IHtcclxuICAgICAgICAgICAgY2FsbF9pZDogY2FsbGVySWQsXHJcbiAgICAgICAgICAgIG51bWJlcl9yZXA6IG51bWJlcklucHV0VmFsLFxyXG4gICAgICAgICAgICBpZDogcmVjb3JkSWRcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB0aGlzLmRpc3BsYXlTYXZpbmdJY29uKHJlY29yZElkKTtcclxuXHJcbiAgICAgICAgJC5hcGkoe1xyXG4gICAgICAgICAgICB1cmw6IHRoaXMuc2F2ZVJlY29yZEFKQVhVcmwsXHJcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxyXG4gICAgICAgICAgICBvbjogJ25vdycsXHJcbiAgICAgICAgICAgIGRhdGEsXHJcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiAocmVzcG9uc2UpID0+IHJlc3BvbnNlICYmIHJlc3BvbnNlLnN1Y2Nlc3MgPT09IHRydWUsXHJcbiAgICAgICAgICAgIG9uU3VjY2VzczogKHJlc3BvbnNlKSA9PiB0aGlzLm9uU2F2ZVN1Y2Nlc3MocmVzcG9uc2UsIHJlY29yZElkKSxcclxuICAgICAgICAgICAgb25GYWlsdXJlOiAocmVzcG9uc2UpID0+IFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlKSxcclxuICAgICAgICAgICAgb25FcnJvcjogKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoeGhyLnN0YXR1cyA9PT0gNDAzKSB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgIH0pO1xyXG4gICAgfSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIERpc3BsYXkgYSBzYXZpbmcgaWNvbiBmb3IgdGhlIGdpdmVuIHJlY29yZC5cclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcmVjb3JkSWQgLSBUaGUgSUQgb2YgdGhlIHJlY29yZCBiZWluZyBzYXZlZC5cclxuICAgICAqL1xyXG4gICAgZGlzcGxheVNhdmluZ0ljb24ocmVjb3JkSWQpIHtcclxuICAgICAgICAkKGB0ciMke3JlY29yZElkfSAudXNlci5jaXJjbGVgKVxyXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ3VzZXIgY2lyY2xlJylcclxuICAgICAgICAgICAgLmFkZENsYXNzKCdzcGlubmVyIGxvYWRpbmcnKTtcclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBIYW5kbGUgc3VjY2Vzc2Z1bCBzYXZpbmcgb2YgYSByZWNvcmQuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHNlcnZlciByZXNwb25zZS5cclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSByZWNvcmRJZCAtIFRoZSBJRCBvZiB0aGUgcmVjb3JkIHRoYXQgd2FzIHNhdmVkLlxyXG4gICAgICovXHJcbiAgICBvblNhdmVTdWNjZXNzKHJlc3BvbnNlLCByZWNvcmRJZCkge1xyXG4gICAgICAgIGlmIChyZXNwb25zZS5kYXRhKSB7XHJcbiAgICAgICAgICAgIGxldCBvbGRJZCA9IHJlc3BvbnNlLmRhdGEub2xkSWQgfHwgcmVjb3JkSWQ7XHJcbiAgICAgICAgICAgICQoYHRyIyR7b2xkSWR9IGlucHV0YCkuYXR0cigncmVhZG9ubHknLCB0cnVlKTtcclxuICAgICAgICAgICAgJChgdHIjJHtvbGRJZH0gYS5kZWxldGUuYnV0dG9uYCkuYXR0cignZGF0YS12YWx1ZScsIHJlc3BvbnNlLmRhdGEubmV3SWQpO1xyXG4gICAgICAgICAgICAkKGB0ciMke29sZElkfSBkaXZgKS5yZW1vdmVDbGFzcygnY2hhbmdlZC1maWVsZCBsb2FkaW5nJykuYWRkQ2xhc3MoJ3RyYW5zcGFyZW50Jyk7XHJcbiAgICAgICAgICAgICQoYHRyIyR7b2xkSWR9IC5zcGlubmVyLmxvYWRpbmdgKS5hZGRDbGFzcygndXNlciBjaXJjbGUnKS5yZW1vdmVDbGFzcygnc3Bpbm5lciBsb2FkaW5nJyk7XHJcbiAgICAgICAgICAgIGlmIChvbGRJZCAhPT0gcmVzcG9uc2UuZGF0YS5uZXdJZCkge1xyXG4gICAgICAgICAgICAgICAgJChgdHIjJHtvbGRJZH1gKS5hdHRyKCdpZCcsIHJlc3BvbnNlLmRhdGEubmV3SWQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIERlbGV0ZSBhIHJvdyBmcm9tIHRoZSBwaG9uZWJvb2sgdGFibGUuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICR0YXJnZXQgLSBUaGUgZGVsZXRlIGJ1dHRvbiBlbGVtZW50LlxyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGlkIC0gVGhlIElEIG9mIHRoZSByZWNvcmQgdG8gZGVsZXRlLlxyXG4gICAgICovXHJcbiAgICBkZWxldGVSb3coJHRhcmdldCwgaWQpIHtcclxuICAgICAgICBpZiAoaWQgPT09ICduZXcnKSB7XHJcbiAgICAgICAgICAgICR0YXJnZXQuY2xvc2VzdCgndHInKS5yZW1vdmUoKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgJC5hcGkoe1xyXG4gICAgICAgICAgICB1cmw6IGAke3RoaXMuZGVsZXRlUmVjb3JkQUpBWFVybH0vJHtpZH1gLFxyXG4gICAgICAgICAgICBvbjogJ25vdycsXHJcbiAgICAgICAgICAgIG9uU3VjY2VzczogKHJlc3BvbnNlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2Uuc3VjY2Vzcykge1xyXG4gICAgICAgICAgICAgICAgICAgICR0YXJnZXQuY2xvc2VzdCgndHInKS5yZW1vdmUoKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy4kcmVjb3Jkc1RhYmxlLmZpbmQoJ3Rib2R5ID4gdHInKS5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy4kcmVjb3Jkc1RhYmxlLmZpbmQoJ3Rib2R5JykuYXBwZW5kKCc8dHIgY2xhc3M9XCJvZGRcIj48L3RyPicpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSxcclxuICAgICAgICB9KTtcclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDbGVhbiBudW1iZXIgYmVmb3JlIHBhc3RpbmcuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhc3RlZFZhbHVlIC0gVGhlIHBhc3RlZCBwaG9uZSBudW1iZXIuXHJcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgY2xlYW5lZCBudW1iZXIuXHJcbiAgICAgKi9cclxuICAgIGNiT25OdW1iZXJCZWZvcmVQYXN0ZShwYXN0ZWRWYWx1ZSkge1xyXG4gICAgICAgIHJldHVybiBwYXN0ZWRWYWx1ZS5yZXBsYWNlKC9cXEQrL2csICcnKTtcclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDYWxjdWxhdGUgdGhlIG51bWJlciBvZiByb3dzIHRoYXQgY2FuIGZpdCBvbiBhIHBhZ2UgYmFzZWQgb24gd2luZG93IGhlaWdodC5cclxuICAgICAqXHJcbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfSBUaGUgY2FsY3VsYXRlZCBudW1iZXIgb2Ygcm93cy5cclxuICAgICAqL1xyXG4gICAgY2FsY3VsYXRlUGFnZUxlbmd0aCgpIHtcclxuICAgICAgICAvLyBDYWxjdWxhdGUgcm93IGhlaWdodFxyXG4gICAgICAgIGxldCByb3dIZWlnaHQgPSB0aGlzLiRyZWNvcmRzVGFibGUuZmluZCgndHInKS5maXJzdCgpLm91dGVySGVpZ2h0KCk7XHJcblxyXG4gICAgICAgIC8vIENhbGN1bGF0ZSB3aW5kb3cgaGVpZ2h0IGFuZCBhdmFpbGFibGUgc3BhY2UgZm9yIHRhYmxlXHJcbiAgICAgICAgY29uc3Qgd2luZG93SGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0O1xyXG4gICAgICAgIGNvbnN0IGhlYWRlckZvb3RlckhlaWdodCA9IDU1MDsgLy8gRXN0aW1hdGUgaGVpZ2h0IGZvciBoZWFkZXIsIGZvb3RlciwgYW5kIG90aGVyIGVsZW1lbnRzXHJcblxyXG4gICAgICAgIC8vIENhbGN1bGF0ZSBuZXcgcGFnZSBsZW5ndGhcclxuICAgICAgICByZXR1cm4gTWF0aC5tYXgoTWF0aC5mbG9vcigod2luZG93SGVpZ2h0IC0gaGVhZGVyRm9vdGVySGVpZ2h0KSAvIHJvd0hlaWdodCksIDUpO1xyXG4gICAgfSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIEdldCB0aGUgdmFsdWUgb2YgYSBxdWVyeSBwYXJhbWV0ZXIgZnJvbSB0aGUgVVJMLlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbSAtIFRoZSBuYW1lIG9mIHRoZSBxdWVyeSBwYXJhbWV0ZXIgdG8gcmV0cmlldmUuXHJcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfG51bGx9IFRoZSB2YWx1ZSBvZiB0aGUgcXVlcnkgcGFyYW1ldGVyLCBvciBudWxsIGlmIG5vdCBmb3VuZC5cclxuICAgICAqL1xyXG4gICAgZ2V0UXVlcnlQYXJhbShwYXJhbSkge1xyXG4gICAgICAgIGNvbnN0IHVybFBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMod2luZG93LmxvY2F0aW9uLnNlYXJjaCk7XHJcbiAgICAgICAgcmV0dXJuIHVybFBhcmFtcy5nZXQocGFyYW0pO1xyXG4gICAgfSxcclxufTtcclxuXHJcbiQoZG9jdW1lbnQpLnJl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