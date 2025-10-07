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
    var deleteButtonTemplate = "<div class=\"ui basic icon buttons action-buttons tiny\">\n                <a href=\"#\" data-value=\"".concat(data.DT_RowId, "\" class=\"ui delete button\">\n                    <i class=\"icon trash ") + ((data === null || data === void 0 ? void 0 : data.created) > 0 ? "blue" : "red") + "\" />\n                </a>\n            </div>";
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJNb2R1bGVQaG9uZUJvb2tEVCIsIiRnbG9iYWxTZWFyY2giLCIkIiwiJHBhZ2VMZW5ndGhTZWxlY3RvciIsIiRzZWFyY2hFeHRlbnNpb25zSW5wdXQiLCJkYXRhVGFibGUiLCIkYm9keSIsIiRkaXNhYmxlSW5wdXRNYXNrVG9nZ2xlIiwiJHJlY29yZHNUYWJsZSIsIiRhZGROZXdCdXR0b24iLCJpbnB1dE51bWJlckpRVFBMIiwiJG1hc2tMaXN0IiwiZ2V0TmV3UmVjb3Jkc0FKQVhVcmwiLCJjb25jYXQiLCJnbG9iYWxSb290VXJsIiwiZGVsZXRlUmVjb3JkQUpBWFVybCIsInNhdmVSZWNvcmRBSkFYVXJsIiwiaW5pdGlhbGl6ZSIsImluaXRpYWxpemVTZWFyY2giLCJpbml0aWFsaXplRGF0YVRhYmxlIiwiaW5pdGlhbGl6ZUV2ZW50TGlzdGVuZXJzIiwiX3RoaXMiLCJvbiIsImUiLCJzZWFyY2hUZXh0IiwidmFsIiwidHJpbSIsImtleUNvZGUiLCJsZW5ndGgiLCJhcHBseUZpbHRlciIsIl90aGlzMiIsIm9uRmllbGRGb2N1cyIsInRhcmdldCIsInNhdmVDaGFuZ2VzRm9yQWxsUm93cyIsInByZXZlbnREZWZhdWx0IiwiaWQiLCJjbG9zZXN0IiwiZGF0YSIsImRlbGV0ZVJvdyIsImRvY3VtZW50Iiwia2V5IiwiaGFzQ2xhc3MiLCJhZGROZXdSb3ciLCJkcm9wZG93biIsIm9uQ2hhbmdlIiwicGFnZUxlbmd0aCIsImNhbGN1bGF0ZVBhZ2VMZW5ndGgiLCJsb2NhbFN0b3JhZ2UiLCJyZW1vdmVJdGVtIiwic2V0SXRlbSIsInBhZ2UiLCJsZW4iLCJkcmF3IiwiZXZlbnQiLCJzdG9wUHJvcGFnYXRpb24iLCIkaW5wdXQiLCJ0cmFuc2l0aW9uIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsImF0dHIiLCJfdGhpczMiLCIkcm93cyIsImVhY2giLCJfIiwicm93Iiwicm93SWQiLCJ1bmRlZmluZWQiLCJzZW5kQ2hhbmdlc1RvU2VydmVyIiwiJGVtcHR5Um93IiwicmVtb3ZlIiwibmV3SWQiLCJNYXRoIiwiZmxvb3IiLCJyYW5kb20iLCJuZXdSb3dUZW1wbGF0ZSIsImZpbmQiLCJwcmVwZW5kIiwiJG5ld1JvdyIsImZvY3VzIiwiaW5pdGlhbGl6ZUlucHV0bWFzayIsIl90aGlzNCIsInNhdmVkUGFnZUxlbmd0aCIsImdldEl0ZW0iLCJzZWFyY2giLCJzZXJ2ZXJTaWRlIiwicHJvY2Vzc2luZyIsImFqYXgiLCJ1cmwiLCJ0eXBlIiwiZGF0YVNyYyIsImNvbHVtbnMiLCJwYWdpbmciLCJkZWZlclJlbmRlciIsInNEb20iLCJvcmRlcmluZyIsImNyZWF0ZWRSb3ciLCJidWlsZFJvd1RlbXBsYXRlIiwiZHJhd0NhbGxiYWNrIiwibGFuZ3VhZ2UiLCJTZW1hbnRpY0xvY2FsaXphdGlvbiIsImRhdGFUYWJsZUxvY2FsaXNhdGlvbiIsIkRhdGFUYWJsZSIsInNlYXJjaERlYm91bmNlVGltZXIiLCJjbGVhclRpbWVvdXQiLCJzZXRUaW1lb3V0IiwidGV4dCIsInN0YXRlIiwibG9hZGVkIiwic2VhcmNoVmFsdWUiLCJnZXRRdWVyeVBhcmFtIiwibmFtZVRlbXBsYXRlIiwiY2FsbF9pZCIsIm51bWJlclRlbXBsYXRlIiwibnVtYmVyIiwiZGVsZXRlQnV0dG9uVGVtcGxhdGUiLCJEVF9Sb3dJZCIsImNyZWF0ZWQiLCJlcSIsImh0bWwiLCIkY2hhbmdlZEZpZWxkcyIsIm9iaiIsIiRlbCIsImNoZWNrYm94IiwibWFza3NTb3J0IiwiSW5wdXRNYXNrUGF0dGVybnMiLCJpbnB1dG1hc2tzIiwiaW5wdXRtYXNrIiwiZGVmaW5pdGlvbnMiLCJ2YWxpZGF0b3IiLCJjYXJkaW5hbGl0eSIsInNob3dNYXNrT25Ib3ZlciIsIm9uQmVmb3JlUGFzdGUiLCJjYk9uTnVtYmVyQmVmb3JlUGFzdGUiLCJtYXRjaCIsInJlcGxhY2UiLCJsaXN0IiwibGlzdEtleSIsInJlY29yZElkIiwiX3RoaXM1IiwiY2FsbGVySWQiLCJudW1iZXJJbnB1dFZhbCIsIm51bWJlcl9yZXAiLCJkaXNwbGF5U2F2aW5nSWNvbiIsImFwaSIsIm1ldGhvZCIsInN1Y2Nlc3NUZXN0IiwicmVzcG9uc2UiLCJzdWNjZXNzIiwib25TdWNjZXNzIiwib25TYXZlU3VjY2VzcyIsIm9uRmFpbHVyZSIsIlVzZXJNZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwibWVzc2FnZSIsIm9uRXJyb3IiLCJlcnJvck1lc3NhZ2UiLCJlbGVtZW50IiwieGhyIiwic3RhdHVzIiwid2luZG93IiwibG9jYXRpb24iLCJvbGRJZCIsIiR0YXJnZXQiLCJfdGhpczYiLCJhcHBlbmQiLCJwYXN0ZWRWYWx1ZSIsInJvd0hlaWdodCIsImZpcnN0Iiwib3V0ZXJIZWlnaHQiLCJ3aW5kb3dIZWlnaHQiLCJpbm5lckhlaWdodCIsImhlYWRlckZvb3RlckhlaWdodCIsIm1heCIsInBhcmFtIiwidXJsUGFyYW1zIiwiVVJMU2VhcmNoUGFyYW1zIiwiZ2V0IiwicmVhZHkiXSwic291cmNlcyI6WyJzcmMvbW9kdWxlLXBob25lYm9vay1kYXRhdGFibGUuanMiXSwic291cmNlc0NvbnRlbnQiOlsiLypcclxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xyXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI0IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcclxuICpcclxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcclxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcclxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cclxuICpcclxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXHJcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXHJcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcclxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cclxuICpcclxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXHJcbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXHJcbiAqL1xyXG5cclxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgU2VtYW50aWNMb2NhbGl6YXRpb24sIFVzZXJNZXNzYWdlLCBJbnB1dE1hc2tQYXR0ZXJucyAqL1xyXG5cclxuY29uc3QgTW9kdWxlUGhvbmVCb29rRFQgPSB7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBUaGUgZ2xvYmFsIHNlYXJjaCBpbnB1dCBlbGVtZW50LlxyXG4gICAgICogQHR5cGUge2pRdWVyeX1cclxuICAgICAqL1xyXG4gICAgJGdsb2JhbFNlYXJjaDogJCgnI2dsb2JhbC1zZWFyY2gnKSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIFRoZSBwYWdlIGxlbmd0aCBzZWxlY3Rvci5cclxuICAgICAqIEB0eXBlIHtqUXVlcnl9XHJcbiAgICAgKi9cclxuICAgICRwYWdlTGVuZ3RoU2VsZWN0b3I6ICQoJyNwYWdlLWxlbmd0aC1zZWxlY3QnKSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIFRoZSBwYWdlIGxlbmd0aCBzZWxlY3Rvci5cclxuICAgICAqIEB0eXBlIHtqUXVlcnl9XHJcbiAgICAgKi9cclxuICAgICRzZWFyY2hFeHRlbnNpb25zSW5wdXQ6ICQoJyNzZWFyY2gtZXh0ZW5zaW9ucy1pbnB1dCcpLFxyXG5cclxuXHJcbiAgICAvKipcclxuICAgICAqIFRoZSBkYXRhIHRhYmxlIG9iamVjdC5cclxuICAgICAqIEB0eXBlIHtPYmplY3R9XHJcbiAgICAgKi9cclxuICAgIGRhdGFUYWJsZToge30sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBUaGUgZG9jdW1lbnQgYm9keS5cclxuICAgICAqIEB0eXBlIHtqUXVlcnl9XHJcbiAgICAgKi9cclxuICAgICRib2R5OiAkKCdib2R5JyksXHJcblxyXG4gICAgLy8gQ2FjaGVkIERPTSBlbGVtZW50c1xyXG4gICAgJGRpc2FibGVJbnB1dE1hc2tUb2dnbGU6ICQoJyNkaXNhYmxlLWlucHV0LW1hc2snKSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIFRoZSBleHRlbnNpb25zIHRhYmxlIGVsZW1lbnQuXHJcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxyXG4gICAgICovXHJcbiAgICAkcmVjb3Jkc1RhYmxlOiAkKCcjcGhvbmVib29rLXRhYmxlJyksXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBUaGUgYWRkIG5ldyBidXR0b24gZWxlbWVudC5cclxuICAgICAqIEB0eXBlIHtqUXVlcnl9XHJcbiAgICAgKi9cclxuICAgICRhZGROZXdCdXR0b246ICQoJyNhZGQtbmV3LWJ1dHRvbicpLFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogU2VsZWN0b3IgZm9yIG51bWJlciBpbnB1dCBmaWVsZHMuXHJcbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxyXG4gICAgICovXHJcbiAgICBpbnB1dE51bWJlckpRVFBMOiAnaW5wdXQubnVtYmVyLWlucHV0JyxcclxuXHJcbiAgICAvKipcclxuICAgICAqIExpc3Qgb2YgaW5wdXQgbWFza3MuXHJcbiAgICAgKiBAdHlwZSB7bnVsbHxBcnJheX1cclxuICAgICAqL1xyXG4gICAgJG1hc2tMaXN0OiBudWxsLFxyXG5cclxuICAgIC8vIFVSTHMgZm9yIEFKQVggcmVxdWVzdHNcclxuICAgIGdldE5ld1JlY29yZHNBSkFYVXJsOiBgJHtnbG9iYWxSb290VXJsfW1vZHVsZS1waG9uZS1ib29rL2dldE5ld1JlY29yZHNgLFxyXG5cclxuICAgIGRlbGV0ZVJlY29yZEFKQVhVcmw6IGAke2dsb2JhbFJvb3RVcmx9bW9kdWxlLXBob25lLWJvb2svZGVsZXRlYCxcclxuXHJcbiAgICBzYXZlUmVjb3JkQUpBWFVybDogYCR7Z2xvYmFsUm9vdFVybH1tb2R1bGUtcGhvbmUtYm9vay9zYXZlYCxcclxuXHJcbiAgICAvKipcclxuICAgICAqIEluaXRpYWxpemUgdGhlIG1vZHVsZS5cclxuICAgICAqIFRoaXMgaW5jbHVkZXMgc2V0dGluZyB1cCBldmVudCBsaXN0ZW5lcnMgYW5kIGluaXRpYWxpemluZyB0aGUgRGF0YVRhYmxlLlxyXG4gICAgICovXHJcbiAgICBpbml0aWFsaXplKCkge1xyXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZVNlYXJjaCgpO1xyXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZURhdGFUYWJsZSgpO1xyXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUV2ZW50TGlzdGVuZXJzKCk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgc2VhcmNoIGZ1bmN0aW9uYWxpdHkuXHJcbiAgICAgKiBJdCBsaXN0ZW5zIGZvciBrZXkgZXZlbnRzIGFuZCBhcHBsaWVzIGEgZmlsdGVyIGJhc2VkIG9uIHRoZSB1c2VyJ3MgaW5wdXQuXHJcbiAgICAgKi9cclxuICAgIGluaXRpYWxpemVTZWFyY2goKSB7XHJcbiAgICAgICAgdGhpcy4kZ2xvYmFsU2VhcmNoLm9uKCdrZXl1cCcsIChlKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IHNlYXJjaFRleHQgPSB0aGlzLiRnbG9iYWxTZWFyY2gudmFsKCkudHJpbSgpO1xyXG4gICAgICAgICAgICBpZiAoZS5rZXlDb2RlID09PSAxMyB8fCBlLmtleUNvZGUgPT09IDggfHwgc2VhcmNoVGV4dC5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuYXBwbHlGaWx0ZXIoc2VhcmNoVGV4dCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBJbml0aWFsaXplIGFsbCBldmVudCBsaXN0ZW5lcnMuXHJcbiAgICAgKiBIYW5kbGVzIGlucHV0IGZvY3VzLCBmb3JtIHN1Ym1pc3Npb24sIGFkZGluZyBuZXcgcm93cywgYW5kIGRlbGV0ZSBhY3Rpb25zLlxyXG4gICAgICovXHJcbiAgICBpbml0aWFsaXplRXZlbnRMaXN0ZW5lcnMoKSB7XHJcblxyXG4gICAgICAgIC8vIEhhbmRsZSBmb2N1cyBvbiBpbnB1dCBmaWVsZHMgZm9yIGVkaXRpbmdcclxuICAgICAgICB0aGlzLiRib2R5Lm9uKCdmb2N1c2luJywgJy5jYWxsZXItaWQtaW5wdXQsIC5udW1iZXItaW5wdXQnLCAoZSkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLm9uRmllbGRGb2N1cygkKGUudGFyZ2V0KSk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIEhhbmRsZSBsb3NzIG9mIGZvY3VzIG9uIGlucHV0IGZpZWxkcyBhbmQgc2F2ZSBjaGFuZ2VzXHJcbiAgICAgICAgdGhpcy4kYm9keS5vbignZm9jdXNvdXQnLCAnLmNhbGxlci1pZC1pbnB1dCwgLm51bWJlci1pbnB1dCcsICgpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5zYXZlQ2hhbmdlc0ZvckFsbFJvd3MoKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gSGFuZGxlIGRlbGV0ZSBidXR0b24gY2xpY2tcclxuICAgICAgICB0aGlzLiRib2R5Lm9uKCdjbGljaycsICdhLmRlbGV0ZScsIChlKSA9PiB7XHJcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgY29uc3QgaWQgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCdhJykuZGF0YSgndmFsdWUnKTtcclxuICAgICAgICAgICAgdGhpcy5kZWxldGVSb3coJChlLnRhcmdldCksIGlkKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gSGFuZGxlIEVudGVyIG9yIFRhYiBrZXkgdG8gdHJpZ2dlciBmb3JtIHN1Ym1pc3Npb25cclxuICAgICAgICAkKGRvY3VtZW50KS5vbigna2V5ZG93bicsIChlKSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChlLmtleSA9PT0gJ0VudGVyJyB8fCAoZS5rZXkgPT09ICdUYWInICYmICEkKCc6Zm9jdXMnKS5oYXNDbGFzcygnLm51bWJlci1pbnB1dCcpKSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zYXZlQ2hhbmdlc0ZvckFsbFJvd3MoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBIYW5kbGUgYWRkaW5nIGEgbmV3IHJvd1xyXG4gICAgICAgIHRoaXMuJGFkZE5ld0J1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xyXG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkTmV3Um93KCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIEhhbmRsZSBwYWdlIGxlbmd0aCBzZWxlY3Rpb25cclxuICAgICAgICB0aGlzLiRwYWdlTGVuZ3RoU2VsZWN0b3IuZHJvcGRvd24oe1xyXG4gICAgICAgICAgICBvbkNoYW5nZShwYWdlTGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAocGFnZUxlbmd0aCA9PT0gJ2F1dG8nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcGFnZUxlbmd0aCA9IHRoaXMuY2FsY3VsYXRlUGFnZUxlbmd0aCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKCdwaG9uZWJvb2tUYWJsZVBhZ2VMZW5ndGgnKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ3Bob25lYm9va1RhYmxlUGFnZUxlbmd0aCcsIHBhZ2VMZW5ndGgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgTW9kdWxlUGhvbmVCb29rRFQuZGF0YVRhYmxlLnBhZ2UubGVuKHBhZ2VMZW5ndGgpLmRyYXcoKTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gUHJldmVudCBldmVudCBidWJibGluZyBvbiBkcm9wZG93biBjbGlja1xyXG4gICAgICAgIHRoaXMuJHBhZ2VMZW5ndGhTZWxlY3Rvci5vbignY2xpY2snLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7IC8vIFByZXZlbnQgdGhlIGV2ZW50IGZyb20gYnViYmxpbmdcclxuICAgICAgICB9KTtcclxuICAgIH0sXHJcblxyXG5cclxuICAgIC8qKlxyXG4gICAgICogSGFuZGxlIGZvY3VzIGV2ZW50IG9uIGEgZmllbGQgYnkgYWRkaW5nIGEgZ2xvd2luZyBlZmZlY3QgYW5kIGVuYWJsaW5nIGVkaXRpbmcuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICRpbnB1dCAtIFRoZSBpbnB1dCBmaWVsZCB0aGF0IHJlY2VpdmVkIGZvY3VzLlxyXG4gICAgICovXHJcbiAgICBvbkZpZWxkRm9jdXMoJGlucHV0KSB7XHJcbiAgICAgICAgJGlucHV0LnRyYW5zaXRpb24oJ2dsb3cnKTtcclxuICAgICAgICAkaW5wdXQuY2xvc2VzdCgnZGl2JykucmVtb3ZlQ2xhc3MoJ3RyYW5zcGFyZW50JykuYWRkQ2xhc3MoJ2NoYW5nZWQtZmllbGQnKTtcclxuICAgICAgICAkaW5wdXQuYXR0cigncmVhZG9ubHknLCBmYWxzZSk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogU2F2ZSBjaGFuZ2VzIGZvciBhbGwgbW9kaWZpZWQgcm93cy5cclxuICAgICAqIEl0IHNlbmRzIHRoZSBjaGFuZ2VzIGZvciBlYWNoIG1vZGlmaWVkIHJvdyB0byB0aGUgc2VydmVyLlxyXG4gICAgICovXHJcbiAgICBzYXZlQ2hhbmdlc0ZvckFsbFJvd3MoKSB7XHJcbiAgICAgICAgY29uc3QgJHJvd3MgPSAkKCcuY2hhbmdlZC1maWVsZCcpLmNsb3Nlc3QoJ3RyJyk7XHJcbiAgICAgICAgJHJvd3MuZWFjaCgoXywgcm93KSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJvd0lkID0gJChyb3cpLmF0dHIoJ2lkJyk7XHJcbiAgICAgICAgICAgIGlmIChyb3dJZCAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNlbmRDaGFuZ2VzVG9TZXJ2ZXIocm93SWQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQWRkIGEgbmV3IHJvdyB0byB0aGUgcGhvbmVib29rIHRhYmxlLlxyXG4gICAgICogVGhlIHJvdyBpcyBlZGl0YWJsZSBhbmQgYWxsb3dzIGZvciBpbnB1dCBvZiBuZXcgY29udGFjdCBpbmZvcm1hdGlvbi5cclxuICAgICAqL1xyXG4gICAgYWRkTmV3Um93KCkge1xyXG4gICAgICAgIGNvbnN0ICRlbXB0eVJvdyA9ICQoJy5kYXRhVGFibGVzX2VtcHR5Jyk7XHJcbiAgICAgICAgaWYgKCRlbXB0eVJvdy5sZW5ndGgpICRlbXB0eVJvdy5yZW1vdmUoKTtcclxuXHJcbiAgICAgICAgdGhpcy5zYXZlQ2hhbmdlc0ZvckFsbFJvd3MoKTtcclxuXHJcbiAgICAgICAgY29uc3QgbmV3SWQgPSBgbmV3JHtNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiA1MDApfWA7XHJcbiAgICAgICAgY29uc3QgbmV3Um93VGVtcGxhdGUgPSBgXHJcbiAgICAgICAgICAgIDx0ciBpZD1cIiR7bmV3SWR9XCI+XHJcbiAgICAgICAgICAgICAgICA8dGQ+PGkgY2xhc3M9XCJ1aSB1c2VyIGNpcmNsZSBpY29uXCI+PC9pPjwvdGQ+XHJcbiAgICAgICAgICAgICAgICA8dGQ+PGRpdiBjbGFzcz1cInVpIGZsdWlkIGlucHV0IGlubGluZS1lZGl0IGNoYW5nZWQtZmllbGRcIj48aW5wdXQgY2xhc3M9XCJjYWxsZXItaWQtaW5wdXRcIiB0eXBlPVwidGV4dFwiIHZhbHVlPVwiXCI+PC9kaXY+PC90ZD5cclxuICAgICAgICAgICAgICAgIDx0ZD48ZGl2IGNsYXNzPVwidWkgZmx1aWQgaW5wdXQgaW5saW5lLWVkaXQgY2hhbmdlZC1maWVsZFwiPjxpbnB1dCBjbGFzcz1cIm51bWJlci1pbnB1dFwiIHR5cGU9XCJ0ZXh0XCIgdmFsdWU9XCJcIj48L2Rpdj48L3RkPlxyXG4gICAgICAgICAgICAgICAgPHRkPjxkaXYgY2xhc3M9XCJ1aSBiYXNpYyBpY29uIGJ1dHRvbnMgYWN0aW9uLWJ1dHRvbnMgdGlueVwiPlxyXG4gICAgICAgICAgICAgICAgICAgIDxhIGhyZWY9XCIjXCIgY2xhc3M9XCJ1aSBidXR0b24gZGVsZXRlXCIgZGF0YS12YWx1ZT1cIm5ld1wiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImljb24gdHJhc2ggcmVkXCI+PC9pPlxyXG4gICAgICAgICAgICAgICAgICAgIDwvYT5cclxuICAgICAgICAgICAgICAgIDwvZGl2PjwvdGQ+XHJcbiAgICAgICAgICAgIDwvdHI+YDtcclxuXHJcbiAgICAgICAgdGhpcy4kcmVjb3Jkc1RhYmxlLmZpbmQoJ3Rib2R5JykucHJlcGVuZChuZXdSb3dUZW1wbGF0ZSk7XHJcbiAgICAgICAgY29uc3QgJG5ld1JvdyA9ICQoYCMke25ld0lkfWApO1xyXG4gICAgICAgICRuZXdSb3cuZmluZCgnaW5wdXQnKS50cmFuc2l0aW9uKCdnbG93Jyk7XHJcbiAgICAgICAgJG5ld1Jvdy5maW5kKCcuY2FsbGVyLWlkLWlucHV0JykuZm9jdXMoKTtcclxuICAgICAgICB0aGlzLmluaXRpYWxpemVJbnB1dG1hc2soJG5ld1Jvdy5maW5kKCcubnVtYmVyLWlucHV0JykpO1xyXG4gICAgfSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIEluaXRpYWxpemUgdGhlIERhdGFUYWJsZSBpbnN0YW5jZSB3aXRoIHRoZSByZXF1aXJlZCBzZXR0aW5ncyBhbmQgb3B0aW9ucy5cclxuICAgICAqL1xyXG4gICAgaW5pdGlhbGl6ZURhdGFUYWJsZSgpIHtcclxuXHJcbiAgICAgICAgLy8gR2V0IHRoZSB1c2VyJ3Mgc2F2ZWQgdmFsdWUgb3IgdXNlIHRoZSBhdXRvbWF0aWNhbGx5IGNhbGN1bGF0ZWQgdmFsdWUgaWYgbm9uZSBleGlzdHNcclxuICAgICAgICBjb25zdCBzYXZlZFBhZ2VMZW5ndGggPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgncGhvbmVib29rVGFibGVQYWdlTGVuZ3RoJyk7XHJcbiAgICAgICAgY29uc3QgcGFnZUxlbmd0aCA9IHNhdmVkUGFnZUxlbmd0aCA/IHNhdmVkUGFnZUxlbmd0aCA6IHRoaXMuY2FsY3VsYXRlUGFnZUxlbmd0aCgpO1xyXG5cclxuICAgICAgICB0aGlzLiRyZWNvcmRzVGFibGUuZGF0YVRhYmxlKHtcclxuICAgICAgICAgICAgc2VhcmNoOiB7c2VhcmNoOiB0aGlzLiRnbG9iYWxTZWFyY2gudmFsKCl9LFxyXG4gICAgICAgICAgICBzZXJ2ZXJTaWRlOiB0cnVlLFxyXG4gICAgICAgICAgICBwcm9jZXNzaW5nOiB0cnVlLFxyXG4gICAgICAgICAgICBhamF4OiB7XHJcbiAgICAgICAgICAgICAgICB1cmw6IHRoaXMuZ2V0TmV3UmVjb3Jkc0FKQVhVcmwsXHJcbiAgICAgICAgICAgICAgICB0eXBlOiAnUE9TVCcsXHJcbiAgICAgICAgICAgICAgICBkYXRhU3JjOiAnZGF0YScsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGNvbHVtbnM6IFtcclxuICAgICAgICAgICAgICAgIHtkYXRhOiBudWxsfSxcclxuICAgICAgICAgICAgICAgIHtkYXRhOiAnY2FsbF9pZCd9LFxyXG4gICAgICAgICAgICAgICAge2RhdGE6ICdudW1iZXInfSxcclxuICAgICAgICAgICAgICAgIHtkYXRhOiBudWxsfSxcclxuICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgcGFnaW5nOiB0cnVlLFxyXG4gICAgICAgICAgICBwYWdlTGVuZ3RoOiBwYWdlTGVuZ3RoLFxyXG4gICAgICAgICAgICBkZWZlclJlbmRlcjogdHJ1ZSxcclxuICAgICAgICAgICAgc0RvbTogJ3J0aXAnLFxyXG4gICAgICAgICAgICBvcmRlcmluZzogZmFsc2UsXHJcbiAgICAgICAgICAgIGNyZWF0ZWRSb3c6IChyb3csIGRhdGEpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMuYnVpbGRSb3dUZW1wbGF0ZShyb3csIGRhdGEpO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBkcmF3Q2FsbGJhY2s6ICgpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMuaW5pdGlhbGl6ZUlucHV0bWFzaygkKHRoaXMuaW5wdXROdW1iZXJKUVRQTCkpO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBsYW5ndWFnZTogU2VtYW50aWNMb2NhbGl6YXRpb24uZGF0YVRhYmxlTG9jYWxpc2F0aW9uLFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICB0aGlzLmRhdGFUYWJsZSA9IHRoaXMuJHJlY29yZHNUYWJsZS5EYXRhVGFibGUoKTtcclxuXHJcblxyXG4gICAgICAgIC8vIFNldCB0aGUgc2VsZWN0IGlucHV0IHZhbHVlIHRvIHRoZSBzYXZlZCB2YWx1ZSBpZiBpdCBleGlzdHNcclxuICAgICAgICBpZiAoc2F2ZWRQYWdlTGVuZ3RoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuJHBhZ2VMZW5ndGhTZWxlY3Rvci5kcm9wZG93bignc2V0IHZhbHVlJywgc2F2ZWRQYWdlTGVuZ3RoKTtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICAvLyBJbml0aWFsaXplIGRlYm91bmNlIHRpbWVyIHZhcmlhYmxlXHJcbiAgICAgICAgbGV0IHNlYXJjaERlYm91bmNlVGltZXIgPSBudWxsO1xyXG5cclxuICAgICAgICB0aGlzLiRnbG9iYWxTZWFyY2gub24oJ2tleXVwJywgKGUpID0+IHtcclxuICAgICAgICAgICAgLy8gQ2xlYXIgcHJldmlvdXMgdGltZXIgaWYgdGhlIHVzZXIgaXMgc3RpbGwgdHlwaW5nXHJcbiAgICAgICAgICAgIGNsZWFyVGltZW91dChzZWFyY2hEZWJvdW5jZVRpbWVyKTtcclxuXHJcbiAgICAgICAgICAgIC8vIFNldCBhIG5ldyB0aW1lciBmb3IgZGVsYXllZCBleGVjdXRpb25cclxuICAgICAgICAgICAgc2VhcmNoRGVib3VuY2VUaW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdGV4dCA9IHRoaXMuJGdsb2JhbFNlYXJjaC52YWwoKTtcclxuICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgdGhlIHNlYXJjaCBpZiBpbnB1dCBpcyB2YWxpZCAoRW50ZXIsIEJhY2tzcGFjZSwgb3IgbW9yZSB0aGFuIDIgY2hhcmFjdGVycylcclxuICAgICAgICAgICAgICAgIGlmIChlLmtleUNvZGUgPT09IDEzIHx8IGUua2V5Q29kZSA9PT0gOCB8fCB0ZXh0Lmxlbmd0aCA+PSAyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hcHBseUZpbHRlcih0ZXh0KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSwgNTAwKTsgLy8gNTAwbXMgZGVsYXkgYmVmb3JlIGV4ZWN1dGluZyB0aGUgc2VhcmNoXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIFJlc3RvcmUgdGhlIHNhdmVkIHNlYXJjaCBwaHJhc2UgZnJvbSBEYXRhVGFibGVzIHN0YXRlXHJcbiAgICAgICAgY29uc3Qgc3RhdGUgPSB0aGlzLmRhdGFUYWJsZS5zdGF0ZS5sb2FkZWQoKTtcclxuICAgICAgICBpZiAoc3RhdGUgJiYgc3RhdGUuc2VhcmNoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuJGdsb2JhbFNlYXJjaC52YWwoc3RhdGUuc2VhcmNoLnNlYXJjaCk7IC8vIFNldCB0aGUgc2VhcmNoIGZpZWxkIHdpdGggdGhlIHNhdmVkIHZhbHVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBSZXRyaWV2ZXMgdGhlIHZhbHVlIG9mICdzZWFyY2gnIHF1ZXJ5IHBhcmFtZXRlciBmcm9tIHRoZSBVUkwuXHJcbiAgICAgICAgY29uc3Qgc2VhcmNoVmFsdWUgPSB0aGlzLmdldFF1ZXJ5UGFyYW0oJ3NlYXJjaCcpO1xyXG5cclxuICAgICAgICAvLyBTZXRzIHRoZSBnbG9iYWwgc2VhcmNoIGlucHV0IHZhbHVlIGFuZCBhcHBsaWVzIHRoZSBmaWx0ZXIgaWYgYSBzZWFyY2ggdmFsdWUgaXMgcHJvdmlkZWQuXHJcbiAgICAgICAgaWYgKHNlYXJjaFZhbHVlKSB7XHJcbiAgICAgICAgICAgIHRoaXMuJGdsb2JhbFNlYXJjaC52YWwoc2VhcmNoVmFsdWUpO1xyXG4gICAgICAgICAgICB0aGlzLmFwcGx5RmlsdGVyKHNlYXJjaFZhbHVlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuZGF0YVRhYmxlLm9uKCdkcmF3JywgKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLiRnbG9iYWxTZWFyY2guY2xvc2VzdCgnZGl2JykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcclxuICAgICAgICB9KTtcclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBCdWlsZCB0aGUgSFRNTCB0ZW1wbGF0ZSBmb3IgZWFjaCByb3cgaW4gdGhlIERhdGFUYWJsZS5cclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0ge0hUTUxFbGVtZW50fSByb3cgLSBUaGUgcm93IGVsZW1lbnQuXHJcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIFRoZSBkYXRhIG9iamVjdCBmb3IgdGhlIHJvdy5cclxuICAgICAqL1xyXG4gICAgYnVpbGRSb3dUZW1wbGF0ZShyb3csIGRhdGEpIHtcclxuICAgICAgICBjb25zdCBuYW1lVGVtcGxhdGUgPSBgPGRpdiBjbGFzcz1cInVpIHRyYW5zcGFyZW50IGZsdWlkIGlucHV0IGlubGluZS1lZGl0XCI+XHJcbiAgICAgICAgICAgICAgICA8aW5wdXQgY2xhc3M9XCJjYWxsZXItaWQtaW5wdXRcIiB0eXBlPVwidGV4dFwiIHZhbHVlPVwiJHtkYXRhLmNhbGxfaWR9XCIgLz5cclxuICAgICAgICAgICAgPC9kaXY+YDtcclxuICAgICAgICBjb25zdCBudW1iZXJUZW1wbGF0ZSA9IGA8ZGl2IGNsYXNzPVwidWkgdHJhbnNwYXJlbnQgaW5wdXQgaW5saW5lLWVkaXRcIj5cclxuICAgICAgICAgICAgICAgIDxpbnB1dCBjbGFzcz1cIm51bWJlci1pbnB1dFwiIHR5cGU9XCJ0ZXh0XCIgdmFsdWU9XCIke2RhdGEubnVtYmVyfVwiIC8+XHJcbiAgICAgICAgICAgIDwvZGl2PmA7XHJcbiAgICAgICAgY29uc3QgZGVsZXRlQnV0dG9uVGVtcGxhdGUgPSBgPGRpdiBjbGFzcz1cInVpIGJhc2ljIGljb24gYnV0dG9ucyBhY3Rpb24tYnV0dG9ucyB0aW55XCI+XHJcbiAgICAgICAgICAgICAgICA8YSBocmVmPVwiI1wiIGRhdGEtdmFsdWU9XCIke2RhdGEuRFRfUm93SWR9XCIgY2xhc3M9XCJ1aSBkZWxldGUgYnV0dG9uXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpY29uIHRyYXNoIGAgKyAoZGF0YT8uY3JlYXRlZCA+IDAgPyBgYmx1ZWAgOiBgcmVkYCkgKyBgXCIgLz5cclxuICAgICAgICAgICAgICAgIDwvYT5cclxuICAgICAgICAgICAgPC9kaXY+YDtcclxuXHJcbiAgICAgICAgJCgndGQnLCByb3cpLmVxKDApLmh0bWwoJzxpIGNsYXNzPVwidWkgdXNlciBjaXJjbGUgaWNvblwiPjwvaT4nKTtcclxuICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMSkuaHRtbChuYW1lVGVtcGxhdGUpO1xyXG4gICAgICAgICQoJ3RkJywgcm93KS5lcSgyKS5odG1sKG51bWJlclRlbXBsYXRlKTtcclxuICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMykuaHRtbChkZWxldGVCdXR0b25UZW1wbGF0ZSk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQXBwbHkgYSBzZWFyY2ggZmlsdGVyIHRvIHRoZSBEYXRhVGFibGUuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgLSBUaGUgc2VhcmNoIHRleHQgdG8gYXBwbHkuXHJcbiAgICAgKi9cclxuICAgIGFwcGx5RmlsdGVyKHRleHQpIHtcclxuICAgICAgICBjb25zdCAkY2hhbmdlZEZpZWxkcyA9ICQoJy5jaGFuZ2VkLWZpZWxkJyk7XHJcbiAgICAgICAgJGNoYW5nZWRGaWVsZHMuZWFjaCgoXywgb2JqKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0ICRpbnB1dCA9ICQob2JqKS5maW5kKCdpbnB1dCcpO1xyXG4gICAgICAgICAgICAkaW5wdXQudmFsKCRpbnB1dC5kYXRhKCd2YWx1ZScpKTtcclxuICAgICAgICAgICAgJGlucHV0LmF0dHIoJ3JlYWRvbmx5JywgdHJ1ZSk7XHJcbiAgICAgICAgICAgICQob2JqKS5yZW1vdmVDbGFzcygnY2hhbmdlZC1maWVsZCcpLmFkZENsYXNzKCd0cmFuc3BhcmVudCcpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHRoaXMuZGF0YVRhYmxlLnNlYXJjaCh0ZXh0KS5kcmF3KCk7XHJcbiAgICAgICAgdGhpcy4kZ2xvYmFsU2VhcmNoLmNsb3Nlc3QoJ2RpdicpLmFkZENsYXNzKCdsb2FkaW5nJyk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogSW5pdGlhbGl6ZSBpbnB1dCBtYXNrcyBmb3IgcGhvbmUgbnVtYmVyIGZpZWxkcy5cclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0ge2pRdWVyeX0gJGVsIC0gVGhlIGlucHV0IGVsZW1lbnRzIHRvIGFwcGx5IG1hc2tzIHRvLlxyXG4gICAgICovXHJcbiAgICBpbml0aWFsaXplSW5wdXRtYXNrKCRlbCkge1xyXG4gICAgICAgIGlmICh0aGlzLiRkaXNhYmxlSW5wdXRNYXNrVG9nZ2xlLmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHJldHVybjtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuJG1hc2tMaXN0ID09PSBudWxsKSB7XHJcbiAgICAgICAgICAgIHRoaXMuJG1hc2tMaXN0ID0gJC5tYXNrc1NvcnQoSW5wdXRNYXNrUGF0dGVybnMsIFsnIyddLCAvWzAtOV18Iy8sICdtYXNrJyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAkZWwuaW5wdXRtYXNrcyh7XHJcbiAgICAgICAgICAgIGlucHV0bWFzazoge1xyXG4gICAgICAgICAgICAgICAgZGVmaW5pdGlvbnM6IHtcclxuICAgICAgICAgICAgICAgICAgICAnIyc6IHt2YWxpZGF0b3I6ICdbMC05XScsIGNhcmRpbmFsaXR5OiAxfSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBzaG93TWFza09uSG92ZXI6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgb25CZWZvcmVQYXN0ZTogdGhpcy5jYk9uTnVtYmVyQmVmb3JlUGFzdGUsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIG1hdGNoOiAvWzAtOV0vLFxyXG4gICAgICAgICAgICByZXBsYWNlOiAnOScsXHJcbiAgICAgICAgICAgIGxpc3Q6IHRoaXMuJG1hc2tMaXN0LFxyXG4gICAgICAgICAgICBsaXN0S2V5OiAnbWFzaycsXHJcbiAgICAgICAgfSk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogU2VuZCB0aGUgY2hhbmdlcyBmb3IgYSBzcGVjaWZpYyByb3cgdG8gdGhlIHNlcnZlci5cclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcmVjb3JkSWQgLSBUaGUgSUQgb2YgdGhlIHJlY29yZCB0byBzYXZlLlxyXG4gICAgICovXHJcbiAgICBzZW5kQ2hhbmdlc1RvU2VydmVyKHJlY29yZElkKSB7XHJcbiAgICAgICAgY29uc3QgY2FsbGVySWQgPSAkKGB0ciMke3JlY29yZElkfSAuY2FsbGVyLWlkLWlucHV0YCkudmFsKCk7XHJcbiAgICAgICAgY29uc3QgbnVtYmVySW5wdXRWYWwgPSAkKGB0ciMke3JlY29yZElkfSAubnVtYmVyLWlucHV0YCkudmFsKCk7XHJcblxyXG4gICAgICAgIGlmICghY2FsbGVySWQgfHwgIW51bWJlcklucHV0VmFsKSByZXR1cm47XHJcblxyXG4gICAgICAgIGNvbnN0IGRhdGEgPSB7XHJcbiAgICAgICAgICAgIGNhbGxfaWQ6IGNhbGxlcklkLFxyXG4gICAgICAgICAgICBudW1iZXJfcmVwOiBudW1iZXJJbnB1dFZhbCxcclxuICAgICAgICAgICAgaWQ6IHJlY29yZElkXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdGhpcy5kaXNwbGF5U2F2aW5nSWNvbihyZWNvcmRJZCk7XHJcblxyXG4gICAgICAgICQuYXBpKHtcclxuICAgICAgICAgICAgdXJsOiB0aGlzLnNhdmVSZWNvcmRBSkFYVXJsLFxyXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcclxuICAgICAgICAgICAgb246ICdub3cnLFxyXG4gICAgICAgICAgICBkYXRhLFxyXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogKHJlc3BvbnNlKSA9PiByZXNwb25zZSAmJiByZXNwb25zZS5zdWNjZXNzID09PSB0cnVlLFxyXG4gICAgICAgICAgICBvblN1Y2Nlc3M6IChyZXNwb25zZSkgPT4gdGhpcy5vblNhdmVTdWNjZXNzKHJlc3BvbnNlLCByZWNvcmRJZCksXHJcbiAgICAgICAgICAgIG9uRmFpbHVyZTogKHJlc3BvbnNlKSA9PiBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZSksXHJcbiAgICAgICAgICAgIG9uRXJyb3I6IChlcnJvck1lc3NhZ2UsIGVsZW1lbnQsIHhocikgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKHhoci5zdGF0dXMgPT09IDQwMykgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2luZGV4YDtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICB9KTtcclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBEaXNwbGF5IGEgc2F2aW5nIGljb24gZm9yIHRoZSBnaXZlbiByZWNvcmQuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHJlY29yZElkIC0gVGhlIElEIG9mIHRoZSByZWNvcmQgYmVpbmcgc2F2ZWQuXHJcbiAgICAgKi9cclxuICAgIGRpc3BsYXlTYXZpbmdJY29uKHJlY29yZElkKSB7XHJcbiAgICAgICAgJChgdHIjJHtyZWNvcmRJZH0gLnVzZXIuY2lyY2xlYClcclxuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCd1c2VyIGNpcmNsZScpXHJcbiAgICAgICAgICAgIC5hZGRDbGFzcygnc3Bpbm5lciBsb2FkaW5nJyk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogSGFuZGxlIHN1Y2Nlc3NmdWwgc2F2aW5nIG9mIGEgcmVjb3JkLlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSBzZXJ2ZXIgcmVzcG9uc2UuXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcmVjb3JkSWQgLSBUaGUgSUQgb2YgdGhlIHJlY29yZCB0aGF0IHdhcyBzYXZlZC5cclxuICAgICAqL1xyXG4gICAgb25TYXZlU3VjY2VzcyhyZXNwb25zZSwgcmVjb3JkSWQpIHtcclxuICAgICAgICBpZiAocmVzcG9uc2UuZGF0YSkge1xyXG4gICAgICAgICAgICBsZXQgb2xkSWQgPSByZXNwb25zZS5kYXRhLm9sZElkIHx8IHJlY29yZElkO1xyXG4gICAgICAgICAgICAkKGB0ciMke29sZElkfSBpbnB1dGApLmF0dHIoJ3JlYWRvbmx5JywgdHJ1ZSk7XHJcbiAgICAgICAgICAgICQoYHRyIyR7b2xkSWR9IGEuZGVsZXRlLmJ1dHRvbmApLmF0dHIoJ2RhdGEtdmFsdWUnLCByZXNwb25zZS5kYXRhLm5ld0lkKTtcclxuICAgICAgICAgICAgJChgdHIjJHtvbGRJZH0gZGl2YCkucmVtb3ZlQ2xhc3MoJ2NoYW5nZWQtZmllbGQgbG9hZGluZycpLmFkZENsYXNzKCd0cmFuc3BhcmVudCcpO1xyXG4gICAgICAgICAgICAkKGB0ciMke29sZElkfSAuc3Bpbm5lci5sb2FkaW5nYCkuYWRkQ2xhc3MoJ3VzZXIgY2lyY2xlJykucmVtb3ZlQ2xhc3MoJ3NwaW5uZXIgbG9hZGluZycpO1xyXG4gICAgICAgICAgICBpZiAob2xkSWQgIT09IHJlc3BvbnNlLmRhdGEubmV3SWQpIHtcclxuICAgICAgICAgICAgICAgICQoYHRyIyR7b2xkSWR9YCkuYXR0cignaWQnLCByZXNwb25zZS5kYXRhLm5ld0lkKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBEZWxldGUgYSByb3cgZnJvbSB0aGUgcGhvbmVib29rIHRhYmxlLlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSAkdGFyZ2V0IC0gVGhlIGRlbGV0ZSBidXR0b24gZWxlbWVudC5cclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBpZCAtIFRoZSBJRCBvZiB0aGUgcmVjb3JkIHRvIGRlbGV0ZS5cclxuICAgICAqL1xyXG4gICAgZGVsZXRlUm93KCR0YXJnZXQsIGlkKSB7XHJcbiAgICAgICAgaWYgKGlkID09PSAnbmV3Jykge1xyXG4gICAgICAgICAgICAkdGFyZ2V0LmNsb3Nlc3QoJ3RyJykucmVtb3ZlKCk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgICQuYXBpKHtcclxuICAgICAgICAgICAgdXJsOiBgJHt0aGlzLmRlbGV0ZVJlY29yZEFKQVhVcmx9LyR7aWR9YCxcclxuICAgICAgICAgICAgb246ICdub3cnLFxyXG4gICAgICAgICAgICBvblN1Y2Nlc3M6IChyZXNwb25zZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnN1Y2Nlc3MpIHtcclxuICAgICAgICAgICAgICAgICAgICAkdGFyZ2V0LmNsb3Nlc3QoJ3RyJykucmVtb3ZlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuJHJlY29yZHNUYWJsZS5maW5kKCd0Ym9keSA+IHRyJykubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuJHJlY29yZHNUYWJsZS5maW5kKCd0Ym9keScpLmFwcGVuZCgnPHRyIGNsYXNzPVwib2RkXCI+PC90cj4nKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgfSk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ2xlYW4gbnVtYmVyIGJlZm9yZSBwYXN0aW5nLlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXN0ZWRWYWx1ZSAtIFRoZSBwYXN0ZWQgcGhvbmUgbnVtYmVyLlxyXG4gICAgICogQHJldHVybnMge3N0cmluZ30gVGhlIGNsZWFuZWQgbnVtYmVyLlxyXG4gICAgICovXHJcbiAgICBjYk9uTnVtYmVyQmVmb3JlUGFzdGUocGFzdGVkVmFsdWUpIHtcclxuICAgICAgICByZXR1cm4gcGFzdGVkVmFsdWUucmVwbGFjZSgvXFxEKy9nLCAnJyk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ2FsY3VsYXRlIHRoZSBudW1iZXIgb2Ygcm93cyB0aGF0IGNhbiBmaXQgb24gYSBwYWdlIGJhc2VkIG9uIHdpbmRvdyBoZWlnaHQuXHJcbiAgICAgKlxyXG4gICAgICogQHJldHVybnMge251bWJlcn0gVGhlIGNhbGN1bGF0ZWQgbnVtYmVyIG9mIHJvd3MuXHJcbiAgICAgKi9cclxuICAgIGNhbGN1bGF0ZVBhZ2VMZW5ndGgoKSB7XHJcbiAgICAgICAgLy8gQ2FsY3VsYXRlIHJvdyBoZWlnaHRcclxuICAgICAgICBsZXQgcm93SGVpZ2h0ID0gdGhpcy4kcmVjb3Jkc1RhYmxlLmZpbmQoJ3RyJykuZmlyc3QoKS5vdXRlckhlaWdodCgpO1xyXG5cclxuICAgICAgICAvLyBDYWxjdWxhdGUgd2luZG93IGhlaWdodCBhbmQgYXZhaWxhYmxlIHNwYWNlIGZvciB0YWJsZVxyXG4gICAgICAgIGNvbnN0IHdpbmRvd0hlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodDtcclxuICAgICAgICBjb25zdCBoZWFkZXJGb290ZXJIZWlnaHQgPSA1NTA7IC8vIEVzdGltYXRlIGhlaWdodCBmb3IgaGVhZGVyLCBmb290ZXIsIGFuZCBvdGhlciBlbGVtZW50c1xyXG5cclxuICAgICAgICAvLyBDYWxjdWxhdGUgbmV3IHBhZ2UgbGVuZ3RoXHJcbiAgICAgICAgcmV0dXJuIE1hdGgubWF4KE1hdGguZmxvb3IoKHdpbmRvd0hlaWdodCAtIGhlYWRlckZvb3RlckhlaWdodCkgLyByb3dIZWlnaHQpLCA1KTtcclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBHZXQgdGhlIHZhbHVlIG9mIGEgcXVlcnkgcGFyYW1ldGVyIGZyb20gdGhlIFVSTC5cclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFyYW0gLSBUaGUgbmFtZSBvZiB0aGUgcXVlcnkgcGFyYW1ldGVyIHRvIHJldHJpZXZlLlxyXG4gICAgICogQHJldHVybnMge3N0cmluZ3xudWxsfSBUaGUgdmFsdWUgb2YgdGhlIHF1ZXJ5IHBhcmFtZXRlciwgb3IgbnVsbCBpZiBub3QgZm91bmQuXHJcbiAgICAgKi9cclxuICAgIGdldFF1ZXJ5UGFyYW0ocGFyYW0pIHtcclxuICAgICAgICBjb25zdCB1cmxQYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xyXG4gICAgICAgIHJldHVybiB1cmxQYXJhbXMuZ2V0KHBhcmFtKTtcclxuICAgIH0sXHJcbn07XHJcblxyXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XHJcbiAgICBNb2R1bGVQaG9uZUJvb2tEVC5pbml0aWFsaXplKCk7XHJcbn0pO1xyXG4iXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQSxJQUFNQSxpQkFBaUIsR0FBRztFQUV0QjtBQUNKO0FBQ0E7QUFDQTtFQUNJQyxhQUFhLEVBQUVDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQztFQUVsQztBQUNKO0FBQ0E7QUFDQTtFQUNJQyxtQkFBbUIsRUFBRUQsQ0FBQyxDQUFDLHFCQUFxQixDQUFDO0VBRTdDO0FBQ0o7QUFDQTtBQUNBO0VBQ0lFLHNCQUFzQixFQUFFRixDQUFDLENBQUMsMEJBQTBCLENBQUM7RUFHckQ7QUFDSjtBQUNBO0FBQ0E7RUFDSUcsU0FBUyxFQUFFLENBQUMsQ0FBQztFQUViO0FBQ0o7QUFDQTtBQUNBO0VBQ0lDLEtBQUssRUFBRUosQ0FBQyxDQUFDLE1BQU0sQ0FBQztFQUVoQjtFQUNBSyx1QkFBdUIsRUFBRUwsQ0FBQyxDQUFDLHFCQUFxQixDQUFDO0VBRWpEO0FBQ0o7QUFDQTtBQUNBO0VBQ0lNLGFBQWEsRUFBRU4sQ0FBQyxDQUFDLGtCQUFrQixDQUFDO0VBRXBDO0FBQ0o7QUFDQTtBQUNBO0VBQ0lPLGFBQWEsRUFBRVAsQ0FBQyxDQUFDLGlCQUFpQixDQUFDO0VBRW5DO0FBQ0o7QUFDQTtBQUNBO0VBQ0lRLGdCQUFnQixFQUFFLG9CQUFvQjtFQUV0QztBQUNKO0FBQ0E7QUFDQTtFQUNJQyxTQUFTLEVBQUUsSUFBSTtFQUVmO0VBQ0FDLG9CQUFvQixLQUFBQyxNQUFBLENBQUtDLGFBQWEsb0NBQWlDO0VBRXZFQyxtQkFBbUIsS0FBQUYsTUFBQSxDQUFLQyxhQUFhLDZCQUEwQjtFQUUvREUsaUJBQWlCLEtBQUFILE1BQUEsQ0FBS0MsYUFBYSwyQkFBd0I7RUFFM0Q7QUFDSjtBQUNBO0FBQ0E7RUFD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