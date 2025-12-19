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
   * Sets up the search input field ready for use.
   */
  initializeSearch: function initializeSearch() {// Search handler is initialized in initializeDataTable() with debounce
  },

  /**
   * Initialize all event listeners.
   * Handles input focus, form submission, adding new rows, and delete actions.
   */
  initializeEventListeners: function initializeEventListeners() {
    var _this = this;

    // Handle focus on input fields for editing
    this.$body.on('focusin', '.caller-id-input, .number-input', function (e) {
      _this.onFieldFocus($(e.target));
    }); // Handle loss of focus on input fields and save changes

    this.$body.on('focusout', '.caller-id-input, .number-input', function () {
      _this.saveChangesForAllRows();
    }); // Handle delete button click

    this.$body.on('click', 'a.delete', function (e) {
      e.preventDefault();
      var id = $(e.target).closest('a').data('value');

      _this.deleteRow($(e.target), id);
    }); // Handle Enter or Tab key to trigger form submission

    $(document).on('keydown', function (e) {
      if (e.key === 'Enter' || e.key === 'Tab' && !$(':focus').hasClass('.number-input')) {
        _this.saveChangesForAllRows();
      }
    }); // Handle adding a new row

    this.$addNewButton.on('click', function (e) {
      e.preventDefault();

      _this.addNewRow();
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
    var _this2 = this;

    var $rows = $('.changed-field').closest('tr');
    $rows.each(function (_, row) {
      var rowId = $(row).attr('id');

      if (rowId !== undefined) {
        _this2.sendChangesToServer(rowId);
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
    var _this3 = this;

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
        _this3.buildRowTemplate(row, data);
      },
      drawCallback: function drawCallback() {
        _this3.initializeInputmask($(_this3.inputNumberJQTPL));
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
        var text = _this3.$globalSearch.val(); // Trigger the search if input is valid (Enter, Backspace, or more than 2 characters)


        if (e.keyCode === 13 || e.keyCode === 8 || text.length >= 2) {
          _this3.applyFilter(text);
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
      _this3.$globalSearch.closest('div').removeClass('loading');
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
    var _this4 = this;

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
        return _this4.onSaveSuccess(response, recordId);
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
    var _this5 = this;

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

          if (_this5.$recordsTable.find('tbody > tr').length === 0) {
            _this5.$recordsTable.find('tbody').append('<tr class="odd"></tr>');
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9tb2R1bGUtcGhvbmVib29rLWRhdGF0YWJsZS5qcyJdLCJuYW1lcyI6WyJNb2R1bGVQaG9uZUJvb2tEVCIsIiRnbG9iYWxTZWFyY2giLCIkIiwiJHBhZ2VMZW5ndGhTZWxlY3RvciIsIiRzZWFyY2hFeHRlbnNpb25zSW5wdXQiLCJkYXRhVGFibGUiLCIkYm9keSIsIiRkaXNhYmxlSW5wdXRNYXNrVG9nZ2xlIiwiJHJlY29yZHNUYWJsZSIsIiRhZGROZXdCdXR0b24iLCJpbnB1dE51bWJlckpRVFBMIiwiJG1hc2tMaXN0IiwiZ2V0TmV3UmVjb3Jkc0FKQVhVcmwiLCJnbG9iYWxSb290VXJsIiwiZGVsZXRlUmVjb3JkQUpBWFVybCIsInNhdmVSZWNvcmRBSkFYVXJsIiwiaW5pdGlhbGl6ZSIsImluaXRpYWxpemVTZWFyY2giLCJpbml0aWFsaXplRGF0YVRhYmxlIiwiaW5pdGlhbGl6ZUV2ZW50TGlzdGVuZXJzIiwib24iLCJlIiwib25GaWVsZEZvY3VzIiwidGFyZ2V0Iiwic2F2ZUNoYW5nZXNGb3JBbGxSb3dzIiwicHJldmVudERlZmF1bHQiLCJpZCIsImNsb3Nlc3QiLCJkYXRhIiwiZGVsZXRlUm93IiwiZG9jdW1lbnQiLCJrZXkiLCJoYXNDbGFzcyIsImFkZE5ld1JvdyIsImRyb3Bkb3duIiwib25DaGFuZ2UiLCJwYWdlTGVuZ3RoIiwiY2FsY3VsYXRlUGFnZUxlbmd0aCIsImxvY2FsU3RvcmFnZSIsInJlbW92ZUl0ZW0iLCJzZXRJdGVtIiwicGFnZSIsImxlbiIsImRyYXciLCJldmVudCIsInN0b3BQcm9wYWdhdGlvbiIsIiRpbnB1dCIsInRyYW5zaXRpb24iLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwiYXR0ciIsIiRyb3dzIiwiZWFjaCIsIl8iLCJyb3ciLCJyb3dJZCIsInVuZGVmaW5lZCIsInNlbmRDaGFuZ2VzVG9TZXJ2ZXIiLCIkZW1wdHlSb3ciLCJsZW5ndGgiLCJyZW1vdmUiLCJuZXdJZCIsIk1hdGgiLCJmbG9vciIsInJhbmRvbSIsIm5ld1Jvd1RlbXBsYXRlIiwiZmluZCIsInByZXBlbmQiLCIkbmV3Um93IiwiZm9jdXMiLCJpbml0aWFsaXplSW5wdXRtYXNrIiwic2F2ZWRQYWdlTGVuZ3RoIiwiZ2V0SXRlbSIsInNlYXJjaCIsInZhbCIsInNlcnZlclNpZGUiLCJwcm9jZXNzaW5nIiwiYWpheCIsInVybCIsInR5cGUiLCJkYXRhU3JjIiwiY29sdW1ucyIsInBhZ2luZyIsImRlZmVyUmVuZGVyIiwic0RvbSIsIm9yZGVyaW5nIiwiY3JlYXRlZFJvdyIsImJ1aWxkUm93VGVtcGxhdGUiLCJkcmF3Q2FsbGJhY2siLCJsYW5ndWFnZSIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiZGF0YVRhYmxlTG9jYWxpc2F0aW9uIiwiRGF0YVRhYmxlIiwic2VhcmNoRGVib3VuY2VUaW1lciIsImNsZWFyVGltZW91dCIsInNldFRpbWVvdXQiLCJ0ZXh0Iiwia2V5Q29kZSIsImFwcGx5RmlsdGVyIiwic3RhdGUiLCJsb2FkZWQiLCJzZWFyY2hWYWx1ZSIsImdldFF1ZXJ5UGFyYW0iLCJuYW1lVGVtcGxhdGUiLCJjYWxsX2lkIiwibnVtYmVyVGVtcGxhdGUiLCJudW1iZXIiLCJkZWxldGVCdXR0b25UZW1wbGF0ZSIsIkRUX1Jvd0lkIiwiY3JlYXRlZCIsImVxIiwiaHRtbCIsIiRjaGFuZ2VkRmllbGRzIiwib2JqIiwiJGVsIiwiY2hlY2tib3giLCJtYXNrc1NvcnQiLCJJbnB1dE1hc2tQYXR0ZXJucyIsImlucHV0bWFza3MiLCJpbnB1dG1hc2siLCJkZWZpbml0aW9ucyIsInZhbGlkYXRvciIsImNhcmRpbmFsaXR5Iiwic2hvd01hc2tPbkhvdmVyIiwib25CZWZvcmVQYXN0ZSIsImNiT25OdW1iZXJCZWZvcmVQYXN0ZSIsIm1hdGNoIiwicmVwbGFjZSIsImxpc3QiLCJsaXN0S2V5IiwicmVjb3JkSWQiLCJjYWxsZXJJZCIsIm51bWJlcklucHV0VmFsIiwibnVtYmVyX3JlcCIsImRpc3BsYXlTYXZpbmdJY29uIiwiYXBpIiwibWV0aG9kIiwic3VjY2Vzc1Rlc3QiLCJyZXNwb25zZSIsInN1Y2Nlc3MiLCJvblN1Y2Nlc3MiLCJvblNhdmVTdWNjZXNzIiwib25GYWlsdXJlIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJtZXNzYWdlIiwib25FcnJvciIsImVycm9yTWVzc2FnZSIsImVsZW1lbnQiLCJ4aHIiLCJzdGF0dXMiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsIm9sZElkIiwiJHRhcmdldCIsImFwcGVuZCIsInBhc3RlZFZhbHVlIiwicm93SGVpZ2h0IiwiZmlyc3QiLCJvdXRlckhlaWdodCIsIndpbmRvd0hlaWdodCIsImlubmVySGVpZ2h0IiwiaGVhZGVyRm9vdGVySGVpZ2h0IiwibWF4IiwicGFyYW0iLCJ1cmxQYXJhbXMiLCJVUkxTZWFyY2hQYXJhbXMiLCJnZXQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBRUEsSUFBTUEsaUJBQWlCLEdBQUc7QUFFdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsYUFBYSxFQUFFQyxDQUFDLENBQUMsZ0JBQUQsQ0FOTTs7QUFRdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsbUJBQW1CLEVBQUVELENBQUMsQ0FBQyxxQkFBRCxDQVpBOztBQWN0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJRSxFQUFBQSxzQkFBc0IsRUFBRUYsQ0FBQyxDQUFDLDBCQUFELENBbEJIOztBQXFCdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUcsRUFBQUEsU0FBUyxFQUFFLEVBekJXOztBQTJCdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsS0FBSyxFQUFFSixDQUFDLENBQUMsTUFBRCxDQS9CYztBQWlDdEI7QUFDQUssRUFBQUEsdUJBQXVCLEVBQUVMLENBQUMsQ0FBQyxxQkFBRCxDQWxDSjs7QUFvQ3RCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lNLEVBQUFB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Q0EsV0FBTzRGLFNBQVMsQ0FBQ0UsR0FBVixDQUFjSCxLQUFkLENBQVA7QUFDSDtBQTFkcUIsQ0FBMUI7QUE2ZEFsSyxDQUFDLENBQUM0QixRQUFELENBQUQsQ0FBWTBJLEtBQVosQ0FBa0IsWUFBTTtBQUNwQnhLLEVBQUFBLGlCQUFpQixDQUFDZ0IsVUFBbEI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjQgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgU2VtYW50aWNMb2NhbGl6YXRpb24sIFVzZXJNZXNzYWdlLCBJbnB1dE1hc2tQYXR0ZXJucyAqL1xuXG5jb25zdCBNb2R1bGVQaG9uZUJvb2tEVCA9IHtcblxuICAgIC8qKlxuICAgICAqIFRoZSBnbG9iYWwgc2VhcmNoIGlucHV0IGVsZW1lbnQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZ2xvYmFsU2VhcmNoOiAkKCcjZ2xvYmFsLXNlYXJjaCcpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIHBhZ2UgbGVuZ3RoIHNlbGVjdG9yLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHBhZ2VMZW5ndGhTZWxlY3RvcjogJCgnI3BhZ2UtbGVuZ3RoLXNlbGVjdCcpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIHBhZ2UgbGVuZ3RoIHNlbGVjdG9yLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHNlYXJjaEV4dGVuc2lvbnNJbnB1dDogJCgnI3NlYXJjaC1leHRlbnNpb25zLWlucHV0JyksXG5cblxuICAgIC8qKlxuICAgICAqIFRoZSBkYXRhIHRhYmxlIG9iamVjdC5cbiAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAqL1xuICAgIGRhdGFUYWJsZToge30sXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZG9jdW1lbnQgYm9keS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRib2R5OiAkKCdib2R5JyksXG5cbiAgICAvLyBDYWNoZWQgRE9NIGVsZW1lbnRzXG4gICAgJGRpc2FibGVJbnB1dE1hc2tUb2dnbGU6ICQoJyNkaXNhYmxlLWlucHV0LW1hc2snKSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBleHRlbnNpb25zIHRhYmxlIGVsZW1lbnQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkcmVjb3Jkc1RhYmxlOiAkKCcjcGhvbmVib29rLXRhYmxlJyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgYWRkIG5ldyBidXR0b24gZWxlbWVudC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRhZGROZXdCdXR0b246ICQoJyNhZGQtbmV3LWJ1dHRvbicpLFxuXG4gICAgLyoqXG4gICAgICogU2VsZWN0b3IgZm9yIG51bWJlciBpbnB1dCBmaWVsZHMuXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICBpbnB1dE51bWJlckpRVFBMOiAnaW5wdXQubnVtYmVyLWlucHV0JyxcblxuICAgIC8qKlxuICAgICAqIExpc3Qgb2YgaW5wdXQgbWFza3MuXG4gICAgICogQHR5cGUge251bGx8QXJyYXl9XG4gICAgICovXG4gICAgJG1hc2tMaXN0OiBudWxsLFxuXG4gICAgLy8gVVJMcyBmb3IgQUpBWCByZXF1ZXN0c1xuICAgIGdldE5ld1JlY29yZHNBSkFYVXJsOiBgJHtnbG9iYWxSb290VXJsfW1vZHVsZS1waG9uZS1ib29rL2dldE5ld1JlY29yZHNgLFxuXG4gICAgZGVsZXRlUmVjb3JkQUpBWFVybDogYCR7Z2xvYmFsUm9vdFVybH1tb2R1bGUtcGhvbmUtYm9vay9kZWxldGVgLFxuXG4gICAgc2F2ZVJlY29yZEFKQVhVcmw6IGAke2dsb2JhbFJvb3RVcmx9bW9kdWxlLXBob25lLWJvb2svc2F2ZWAsXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBtb2R1bGUuXG4gICAgICogVGhpcyBpbmNsdWRlcyBzZXR0aW5nIHVwIGV2ZW50IGxpc3RlbmVycyBhbmQgaW5pdGlhbGl6aW5nIHRoZSBEYXRhVGFibGUuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgdGhpcy5pbml0aWFsaXplU2VhcmNoKCk7XG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZURhdGFUYWJsZSgpO1xuICAgICAgICB0aGlzLmluaXRpYWxpemVFdmVudExpc3RlbmVycygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBzZWFyY2ggZnVuY3Rpb25hbGl0eS5cbiAgICAgKiBTZXRzIHVwIHRoZSBzZWFyY2ggaW5wdXQgZmllbGQgcmVhZHkgZm9yIHVzZS5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplU2VhcmNoKCkge1xuICAgICAgICAvLyBTZWFyY2ggaGFuZGxlciBpcyBpbml0aWFsaXplZCBpbiBpbml0aWFsaXplRGF0YVRhYmxlKCkgd2l0aCBkZWJvdW5jZVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGFsbCBldmVudCBsaXN0ZW5lcnMuXG4gICAgICogSGFuZGxlcyBpbnB1dCBmb2N1cywgZm9ybSBzdWJtaXNzaW9uLCBhZGRpbmcgbmV3IHJvd3MsIGFuZCBkZWxldGUgYWN0aW9ucy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRXZlbnRMaXN0ZW5lcnMoKSB7XG5cbiAgICAgICAgLy8gSGFuZGxlIGZvY3VzIG9uIGlucHV0IGZpZWxkcyBmb3IgZWRpdGluZ1xuICAgICAgICB0aGlzLiRib2R5Lm9uKCdmb2N1c2luJywgJy5jYWxsZXItaWQtaW5wdXQsIC5udW1iZXItaW5wdXQnLCAoZSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5vbkZpZWxkRm9jdXMoJChlLnRhcmdldCkpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBIYW5kbGUgbG9zcyBvZiBmb2N1cyBvbiBpbnB1dCBmaWVsZHMgYW5kIHNhdmUgY2hhbmdlc1xuICAgICAgICB0aGlzLiRib2R5Lm9uKCdmb2N1c291dCcsICcuY2FsbGVyLWlkLWlucHV0LCAubnVtYmVyLWlucHV0JywgKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5zYXZlQ2hhbmdlc0ZvckFsbFJvd3MoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSGFuZGxlIGRlbGV0ZSBidXR0b24gY2xpY2tcbiAgICAgICAgdGhpcy4kYm9keS5vbignY2xpY2snLCAnYS5kZWxldGUnLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgaWQgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCdhJykuZGF0YSgndmFsdWUnKTtcbiAgICAgICAgICAgIHRoaXMuZGVsZXRlUm93KCQoZS50YXJnZXQpLCBpZCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEhhbmRsZSBFbnRlciBvciBUYWIga2V5IHRvIHRyaWdnZXIgZm9ybSBzdWJtaXNzaW9uXG4gICAgICAgICQoZG9jdW1lbnQpLm9uKCdrZXlkb3duJywgKGUpID0+IHtcbiAgICAgICAgICAgIGlmIChlLmtleSA9PT0gJ0VudGVyJyB8fCAoZS5rZXkgPT09ICdUYWInICYmICEkKCc6Zm9jdXMnKS5oYXNDbGFzcygnLm51bWJlci1pbnB1dCcpKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2F2ZUNoYW5nZXNGb3JBbGxSb3dzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEhhbmRsZSBhZGRpbmcgYSBuZXcgcm93XG4gICAgICAgIHRoaXMuJGFkZE5ld0J1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgdGhpcy5hZGROZXdSb3coKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSGFuZGxlIHBhZ2UgbGVuZ3RoIHNlbGVjdGlvblxuICAgICAgICB0aGlzLiRwYWdlTGVuZ3RoU2VsZWN0b3IuZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2UocGFnZUxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGlmIChwYWdlTGVuZ3RoID09PSAnYXV0bycpIHtcbiAgICAgICAgICAgICAgICAgICAgcGFnZUxlbmd0aCA9IHRoaXMuY2FsY3VsYXRlUGFnZUxlbmd0aCgpO1xuICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSgncGhvbmVib29rVGFibGVQYWdlTGVuZ3RoJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ3Bob25lYm9va1RhYmxlUGFnZUxlbmd0aCcsIHBhZ2VMZW5ndGgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBNb2R1bGVQaG9uZUJvb2tEVC5kYXRhVGFibGUucGFnZS5sZW4ocGFnZUxlbmd0aCkuZHJhdygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUHJldmVudCBldmVudCBidWJibGluZyBvbiBkcm9wZG93biBjbGlja1xuICAgICAgICB0aGlzLiRwYWdlTGVuZ3RoU2VsZWN0b3Iub24oJ2NsaWNrJywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTsgLy8gUHJldmVudCB0aGUgZXZlbnQgZnJvbSBidWJibGluZ1xuICAgICAgICB9KTtcbiAgICB9LFxuXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgZm9jdXMgZXZlbnQgb24gYSBmaWVsZCBieSBhZGRpbmcgYSBnbG93aW5nIGVmZmVjdCBhbmQgZW5hYmxpbmcgZWRpdGluZy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSAkaW5wdXQgLSBUaGUgaW5wdXQgZmllbGQgdGhhdCByZWNlaXZlZCBmb2N1cy5cbiAgICAgKi9cbiAgICBvbkZpZWxkRm9jdXMoJGlucHV0KSB7XG4gICAgICAgICRpbnB1dC50cmFuc2l0aW9uKCdnbG93Jyk7XG4gICAgICAgICRpbnB1dC5jbG9zZXN0KCdkaXYnKS5yZW1vdmVDbGFzcygndHJhbnNwYXJlbnQnKS5hZGRDbGFzcygnY2hhbmdlZC1maWVsZCcpO1xuICAgICAgICAkaW5wdXQuYXR0cigncmVhZG9ubHknLCBmYWxzZSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNhdmUgY2hhbmdlcyBmb3IgYWxsIG1vZGlmaWVkIHJvd3MuXG4gICAgICogSXQgc2VuZHMgdGhlIGNoYW5nZXMgZm9yIGVhY2ggbW9kaWZpZWQgcm93IHRvIHRoZSBzZXJ2ZXIuXG4gICAgICovXG4gICAgc2F2ZUNoYW5nZXNGb3JBbGxSb3dzKCkge1xuICAgICAgICBjb25zdCAkcm93cyA9ICQoJy5jaGFuZ2VkLWZpZWxkJykuY2xvc2VzdCgndHInKTtcbiAgICAgICAgJHJvd3MuZWFjaCgoXywgcm93KSA9PiB7XG4gICAgICAgICAgICBjb25zdCByb3dJZCA9ICQocm93KS5hdHRyKCdpZCcpO1xuICAgICAgICAgICAgaWYgKHJvd0lkICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNlbmRDaGFuZ2VzVG9TZXJ2ZXIocm93SWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQWRkIGEgbmV3IHJvdyB0byB0aGUgcGhvbmVib29rIHRhYmxlLlxuICAgICAqIFRoZSByb3cgaXMgZWRpdGFibGUgYW5kIGFsbG93cyBmb3IgaW5wdXQgb2YgbmV3IGNvbnRhY3QgaW5mb3JtYXRpb24uXG4gICAgICovXG4gICAgYWRkTmV3Um93KCkge1xuICAgICAgICBjb25zdCAkZW1wdHlSb3cgPSAkKCcuZGF0YVRhYmxlc19lbXB0eScpO1xuICAgICAgICBpZiAoJGVtcHR5Um93Lmxlbmd0aCkgJGVtcHR5Um93LnJlbW92ZSgpO1xuXG4gICAgICAgIHRoaXMuc2F2ZUNoYW5nZXNGb3JBbGxSb3dzKCk7XG5cbiAgICAgICAgY29uc3QgbmV3SWQgPSBgbmV3JHtNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiA1MDApfWA7XG4gICAgICAgIGNvbnN0IG5ld1Jvd1RlbXBsYXRlID0gYFxuICAgICAgICAgICAgPHRyIGlkPVwiJHtuZXdJZH1cIj5cbiAgICAgICAgICAgICAgICA8dGQ+PGkgY2xhc3M9XCJ1aSB1c2VyIGNpcmNsZSBpY29uXCI+PC9pPjwvdGQ+XG4gICAgICAgICAgICAgICAgPHRkPjxkaXYgY2xhc3M9XCJ1aSBmbHVpZCBpbnB1dCBpbmxpbmUtZWRpdCBjaGFuZ2VkLWZpZWxkXCI+PGlucHV0IGNsYXNzPVwiY2FsbGVyLWlkLWlucHV0XCIgdHlwZT1cInRleHRcIiB2YWx1ZT1cIlwiPjwvZGl2PjwvdGQ+XG4gICAgICAgICAgICAgICAgPHRkPjxkaXYgY2xhc3M9XCJ1aSBmbHVpZCBpbnB1dCBpbmxpbmUtZWRpdCBjaGFuZ2VkLWZpZWxkXCI+PGlucHV0IGNsYXNzPVwibnVtYmVyLWlucHV0XCIgdHlwZT1cInRleHRcIiB2YWx1ZT1cIlwiPjwvZGl2PjwvdGQ+XG4gICAgICAgICAgICAgICAgPHRkPjxkaXYgY2xhc3M9XCJ1aSBiYXNpYyBpY29uIGJ1dHRvbnMgYWN0aW9uLWJ1dHRvbnMgdGlueVwiPlxuICAgICAgICAgICAgICAgICAgICA8YSBocmVmPVwiI1wiIGNsYXNzPVwidWkgYnV0dG9uIGRlbGV0ZVwiIGRhdGEtdmFsdWU9XCJuZXdcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaWNvbiB0cmFzaCByZWRcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgICAgICA8L2Rpdj48L3RkPlxuICAgICAgICAgICAgPC90cj5gO1xuXG4gICAgICAgIHRoaXMuJHJlY29yZHNUYWJsZS5maW5kKCd0Ym9keScpLnByZXBlbmQobmV3Um93VGVtcGxhdGUpO1xuICAgICAgICBjb25zdCAkbmV3Um93ID0gJChgIyR7bmV3SWR9YCk7XG4gICAgICAgICRuZXdSb3cuZmluZCgnaW5wdXQnKS50cmFuc2l0aW9uKCdnbG93Jyk7XG4gICAgICAgICRuZXdSb3cuZmluZCgnLmNhbGxlci1pZC1pbnB1dCcpLmZvY3VzKCk7XG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUlucHV0bWFzaygkbmV3Um93LmZpbmQoJy5udW1iZXItaW5wdXQnKSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIERhdGFUYWJsZSBpbnN0YW5jZSB3aXRoIHRoZSByZXF1aXJlZCBzZXR0aW5ncyBhbmQgb3B0aW9ucy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRGF0YVRhYmxlKCkge1xuXG4gICAgICAgIC8vIEdldCB0aGUgdXNlcidzIHNhdmVkIHZhbHVlIG9yIHVzZSB0aGUgYXV0b21hdGljYWxseSBjYWxjdWxhdGVkIHZhbHVlIGlmIG5vbmUgZXhpc3RzXG4gICAgICAgIGNvbnN0IHNhdmVkUGFnZUxlbmd0aCA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKCdwaG9uZWJvb2tUYWJsZVBhZ2VMZW5ndGgnKTtcbiAgICAgICAgY29uc3QgcGFnZUxlbmd0aCA9IHNhdmVkUGFnZUxlbmd0aCA/IHNhdmVkUGFnZUxlbmd0aCA6IHRoaXMuY2FsY3VsYXRlUGFnZUxlbmd0aCgpO1xuXG4gICAgICAgIHRoaXMuJHJlY29yZHNUYWJsZS5kYXRhVGFibGUoe1xuICAgICAgICAgICAgc2VhcmNoOiB7c2VhcmNoOiB0aGlzLiRnbG9iYWxTZWFyY2gudmFsKCl9LFxuICAgICAgICAgICAgc2VydmVyU2lkZTogdHJ1ZSxcbiAgICAgICAgICAgIHByb2Nlc3Npbmc6IHRydWUsXG4gICAgICAgICAgICBhamF4OiB7XG4gICAgICAgICAgICAgICAgdXJsOiB0aGlzLmdldE5ld1JlY29yZHNBSkFYVXJsLFxuICAgICAgICAgICAgICAgIHR5cGU6ICdQT1NUJyxcbiAgICAgICAgICAgICAgICBkYXRhU3JjOiAnZGF0YScsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY29sdW1uczogW1xuICAgICAgICAgICAgICAgIHtkYXRhOiBudWxsfSxcbiAgICAgICAgICAgICAgICB7ZGF0YTogJ2NhbGxfaWQnfSxcbiAgICAgICAgICAgICAgICB7ZGF0YTogJ251bWJlcid9LFxuICAgICAgICAgICAgICAgIHtkYXRhOiBudWxsfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBwYWdpbmc6IHRydWUsXG4gICAgICAgICAgICBwYWdlTGVuZ3RoOiBwYWdlTGVuZ3RoLFxuICAgICAgICAgICAgZGVmZXJSZW5kZXI6IHRydWUsXG4gICAgICAgICAgICBzRG9tOiAncnRpcCcsXG4gICAgICAgICAgICBvcmRlcmluZzogZmFsc2UsXG4gICAgICAgICAgICBjcmVhdGVkUm93OiAocm93LCBkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5idWlsZFJvd1RlbXBsYXRlKHJvdywgZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZHJhd0NhbGxiYWNrOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5pbml0aWFsaXplSW5wdXRtYXNrKCQodGhpcy5pbnB1dE51bWJlckpRVFBMKSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbGFuZ3VhZ2U6IFNlbWFudGljTG9jYWxpemF0aW9uLmRhdGFUYWJsZUxvY2FsaXNhdGlvbixcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5kYXRhVGFibGUgPSB0aGlzLiRyZWNvcmRzVGFibGUuRGF0YVRhYmxlKCk7XG5cblxuICAgICAgICAvLyBTZXQgdGhlIHNlbGVjdCBpbnB1dCB2YWx1ZSB0byB0aGUgc2F2ZWQgdmFsdWUgaWYgaXQgZXhpc3RzXG4gICAgICAgIGlmIChzYXZlZFBhZ2VMZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXMuJHBhZ2VMZW5ndGhTZWxlY3Rvci5kcm9wZG93bignc2V0IHZhbHVlJywgc2F2ZWRQYWdlTGVuZ3RoKTtcbiAgICAgICAgfVxuXG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkZWJvdW5jZSB0aW1lciB2YXJpYWJsZVxuICAgICAgICBsZXQgc2VhcmNoRGVib3VuY2VUaW1lciA9IG51bGw7XG5cbiAgICAgICAgdGhpcy4kZ2xvYmFsU2VhcmNoLm9uKCdrZXl1cCcsIChlKSA9PiB7XG4gICAgICAgICAgICAvLyBDbGVhciBwcmV2aW91cyB0aW1lciBpZiB0aGUgdXNlciBpcyBzdGlsbCB0eXBpbmdcbiAgICAgICAgICAgIGNsZWFyVGltZW91dChzZWFyY2hEZWJvdW5jZVRpbWVyKTtcblxuICAgICAgICAgICAgLy8gU2V0IGEgbmV3IHRpbWVyIGZvciBkZWxheWVkIGV4ZWN1dGlvblxuICAgICAgICAgICAgc2VhcmNoRGVib3VuY2VUaW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRleHQgPSB0aGlzLiRnbG9iYWxTZWFyY2gudmFsKCk7XG4gICAgICAgICAgICAgICAgLy8gVHJpZ2dlciB0aGUgc2VhcmNoIGlmIGlucHV0IGlzIHZhbGlkIChFbnRlciwgQmFja3NwYWNlLCBvciBtb3JlIHRoYW4gMiBjaGFyYWN0ZXJzKVxuICAgICAgICAgICAgICAgIGlmIChlLmtleUNvZGUgPT09IDEzIHx8IGUua2V5Q29kZSA9PT0gOCB8fCB0ZXh0Lmxlbmd0aCA+PSAyKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYXBwbHlGaWx0ZXIodGV4dCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgNTAwKTsgLy8gNTAwbXMgZGVsYXkgYmVmb3JlIGV4ZWN1dGluZyB0aGUgc2VhcmNoXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFJlc3RvcmUgdGhlIHNhdmVkIHNlYXJjaCBwaHJhc2UgZnJvbSBEYXRhVGFibGVzIHN0YXRlXG4gICAgICAgIGNvbnN0IHN0YXRlID0gdGhpcy5kYXRhVGFibGUuc3RhdGUubG9hZGVkKCk7XG4gICAgICAgIGlmIChzdGF0ZSAmJiBzdGF0ZS5zZWFyY2gpIHtcbiAgICAgICAgICAgIHRoaXMuJGdsb2JhbFNlYXJjaC52YWwoc3RhdGUuc2VhcmNoLnNlYXJjaCk7IC8vIFNldCB0aGUgc2VhcmNoIGZpZWxkIHdpdGggdGhlIHNhdmVkIHZhbHVlXG4gICAgICAgIH1cblxuICAgICAgICAvLyBSZXRyaWV2ZXMgdGhlIHZhbHVlIG9mICdzZWFyY2gnIHF1ZXJ5IHBhcmFtZXRlciBmcm9tIHRoZSBVUkwuXG4gICAgICAgIGNvbnN0IHNlYXJjaFZhbHVlID0gdGhpcy5nZXRRdWVyeVBhcmFtKCdzZWFyY2gnKTtcblxuICAgICAgICAvLyBTZXRzIHRoZSBnbG9iYWwgc2VhcmNoIGlucHV0IHZhbHVlIGFuZCBhcHBsaWVzIHRoZSBmaWx0ZXIgaWYgYSBzZWFyY2ggdmFsdWUgaXMgcHJvdmlkZWQuXG4gICAgICAgIGlmIChzZWFyY2hWYWx1ZSkge1xuICAgICAgICAgICAgdGhpcy4kZ2xvYmFsU2VhcmNoLnZhbChzZWFyY2hWYWx1ZSk7XG4gICAgICAgICAgICB0aGlzLmFwcGx5RmlsdGVyKHNlYXJjaFZhbHVlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuZGF0YVRhYmxlLm9uKCdkcmF3JywgKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy4kZ2xvYmFsU2VhcmNoLmNsb3Nlc3QoJ2RpdicpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBCdWlsZCB0aGUgSFRNTCB0ZW1wbGF0ZSBmb3IgZWFjaCByb3cgaW4gdGhlIERhdGFUYWJsZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IHJvdyAtIFRoZSByb3cgZWxlbWVudC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIFRoZSBkYXRhIG9iamVjdCBmb3IgdGhlIHJvdy5cbiAgICAgKi9cbiAgICBidWlsZFJvd1RlbXBsYXRlKHJvdywgZGF0YSkge1xuICAgICAgICBjb25zdCBuYW1lVGVtcGxhdGUgPSBgPGRpdiBjbGFzcz1cInVpIHRyYW5zcGFyZW50IGZsdWlkIGlucHV0IGlubGluZS1lZGl0XCI+XG4gICAgICAgICAgICAgICAgPGlucHV0IGNsYXNzPVwiY2FsbGVyLWlkLWlucHV0XCIgdHlwZT1cInRleHRcIiB2YWx1ZT1cIiR7ZGF0YS5jYWxsX2lkfVwiIC8+XG4gICAgICAgICAgICA8L2Rpdj5gO1xuICAgICAgICBjb25zdCBudW1iZXJUZW1wbGF0ZSA9IGA8ZGl2IGNsYXNzPVwidWkgdHJhbnNwYXJlbnQgaW5wdXQgaW5saW5lLWVkaXRcIj5cbiAgICAgICAgICAgICAgICA8aW5wdXQgY2xhc3M9XCJudW1iZXItaW5wdXRcIiB0eXBlPVwidGV4dFwiIHZhbHVlPVwiJHtkYXRhLm51bWJlcn1cIiAvPlxuICAgICAgICAgICAgPC9kaXY+YDtcbiAgICAgICAgY29uc3QgZGVsZXRlQnV0dG9uVGVtcGxhdGUgPSBgPGRpdiBjbGFzcz1cInVpIGJhc2ljIGljb24gYnV0dG9ucyBhY3Rpb24tYnV0dG9ucyB0aW55XCI+XG4gICAgICAgICAgICAgICAgPGEgaHJlZj1cIiNcIiBkYXRhLXZhbHVlPVwiJHtkYXRhLkRUX1Jvd0lkfVwiIGNsYXNzPVwidWkgZGVsZXRlIGJ1dHRvblwiPlxuICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImljb24gdHJhc2ggJHtkYXRhPy5jcmVhdGVkID4gMCA/ICdibHVlJyA6ICdyZWQnfVwiIC8+XG4gICAgICAgICAgICAgICAgPC9hPlxuICAgICAgICAgICAgPC9kaXY+YDtcblxuICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMCkuaHRtbCgnPGkgY2xhc3M9XCJ1aSB1c2VyIGNpcmNsZSBpY29uXCI+PC9pPicpO1xuICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMSkuaHRtbChuYW1lVGVtcGxhdGUpO1xuICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMikuaHRtbChudW1iZXJUZW1wbGF0ZSk7XG4gICAgICAgICQoJ3RkJywgcm93KS5lcSgzKS5odG1sKGRlbGV0ZUJ1dHRvblRlbXBsYXRlKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQXBwbHkgYSBzZWFyY2ggZmlsdGVyIHRvIHRoZSBEYXRhVGFibGUuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIFRoZSBzZWFyY2ggdGV4dCB0byBhcHBseS5cbiAgICAgKi9cbiAgICBhcHBseUZpbHRlcih0ZXh0KSB7XG4gICAgICAgIGNvbnN0ICRjaGFuZ2VkRmllbGRzID0gJCgnLmNoYW5nZWQtZmllbGQnKTtcbiAgICAgICAgJGNoYW5nZWRGaWVsZHMuZWFjaCgoXywgb2JqKSA9PiB7XG4gICAgICAgICAgICBjb25zdCAkaW5wdXQgPSAkKG9iaikuZmluZCgnaW5wdXQnKTtcbiAgICAgICAgICAgICRpbnB1dC52YWwoJGlucHV0LmRhdGEoJ3ZhbHVlJykpO1xuICAgICAgICAgICAgJGlucHV0LmF0dHIoJ3JlYWRvbmx5JywgdHJ1ZSk7XG4gICAgICAgICAgICAkKG9iaikucmVtb3ZlQ2xhc3MoJ2NoYW5nZWQtZmllbGQnKS5hZGRDbGFzcygndHJhbnNwYXJlbnQnKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuZGF0YVRhYmxlLnNlYXJjaCh0ZXh0KS5kcmF3KCk7XG4gICAgICAgIHRoaXMuJGdsb2JhbFNlYXJjaC5jbG9zZXN0KCdkaXYnKS5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGlucHV0IG1hc2tzIGZvciBwaG9uZSBudW1iZXIgZmllbGRzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICRlbCAtIFRoZSBpbnB1dCBlbGVtZW50cyB0byBhcHBseSBtYXNrcyB0by5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplSW5wdXRtYXNrKCRlbCkge1xuICAgICAgICBpZiAodGhpcy4kZGlzYWJsZUlucHV0TWFza1RvZ2dsZS5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSByZXR1cm47XG5cbiAgICAgICAgaWYgKHRoaXMuJG1hc2tMaXN0ID09PSBudWxsKSB7XG4gICAgICAgICAgICB0aGlzLiRtYXNrTGlzdCA9ICQubWFza3NTb3J0KElucHV0TWFza1BhdHRlcm5zLCBbJyMnXSwgL1swLTldfCMvLCAnbWFzaycpO1xuICAgICAgICB9XG5cbiAgICAgICAgJGVsLmlucHV0bWFza3Moe1xuICAgICAgICAgICAgaW5wdXRtYXNrOiB7XG4gICAgICAgICAgICAgICAgZGVmaW5pdGlvbnM6IHtcbiAgICAgICAgICAgICAgICAgICAgJyMnOiB7dmFsaWRhdG9yOiAnWzAtOV0nLCBjYXJkaW5hbGl0eTogMX0sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBzaG93TWFza09uSG92ZXI6IGZhbHNlLFxuICAgICAgICAgICAgICAgIG9uQmVmb3JlUGFzdGU6IHRoaXMuY2JPbk51bWJlckJlZm9yZVBhc3RlLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG1hdGNoOiAvWzAtOV0vLFxuICAgICAgICAgICAgcmVwbGFjZTogJzknLFxuICAgICAgICAgICAgbGlzdDogdGhpcy4kbWFza0xpc3QsXG4gICAgICAgICAgICBsaXN0S2V5OiAnbWFzaycsXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZW5kIHRoZSBjaGFuZ2VzIGZvciBhIHNwZWNpZmljIHJvdyB0byB0aGUgc2VydmVyLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHJlY29yZElkIC0gVGhlIElEIG9mIHRoZSByZWNvcmQgdG8gc2F2ZS5cbiAgICAgKi9cbiAgICBzZW5kQ2hhbmdlc1RvU2VydmVyKHJlY29yZElkKSB7XG4gICAgICAgIGNvbnN0IGNhbGxlcklkID0gJChgdHIjJHtyZWNvcmRJZH0gLmNhbGxlci1pZC1pbnB1dGApLnZhbCgpO1xuICAgICAgICBjb25zdCBudW1iZXJJbnB1dFZhbCA9ICQoYHRyIyR7cmVjb3JkSWR9IC5udW1iZXItaW5wdXRgKS52YWwoKTtcblxuICAgICAgICBpZiAoIWNhbGxlcklkIHx8ICFudW1iZXJJbnB1dFZhbCkgcmV0dXJuO1xuXG4gICAgICAgIGNvbnN0IGRhdGEgPSB7XG4gICAgICAgICAgICBjYWxsX2lkOiBjYWxsZXJJZCxcbiAgICAgICAgICAgIG51bWJlcl9yZXA6IG51bWJlcklucHV0VmFsLFxuICAgICAgICAgICAgaWQ6IHJlY29yZElkXG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5kaXNwbGF5U2F2aW5nSWNvbihyZWNvcmRJZCk7XG5cbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB0aGlzLnNhdmVSZWNvcmRBSkFYVXJsLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBkYXRhLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IChyZXNwb25zZSkgPT4gcmVzcG9uc2UgJiYgcmVzcG9uc2Uuc3VjY2VzcyA9PT0gdHJ1ZSxcbiAgICAgICAgICAgIG9uU3VjY2VzczogKHJlc3BvbnNlKSA9PiB0aGlzLm9uU2F2ZVN1Y2Nlc3MocmVzcG9uc2UsIHJlY29yZElkKSxcbiAgICAgICAgICAgIG9uRmFpbHVyZTogKHJlc3BvbnNlKSA9PiBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZSksXG4gICAgICAgICAgICBvbkVycm9yOiAoZXJyb3JNZXNzYWdlLCBlbGVtZW50LCB4aHIpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoeGhyLnN0YXR1cyA9PT0gNDAzKSB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERpc3BsYXkgYSBzYXZpbmcgaWNvbiBmb3IgdGhlIGdpdmVuIHJlY29yZC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSByZWNvcmRJZCAtIFRoZSBJRCBvZiB0aGUgcmVjb3JkIGJlaW5nIHNhdmVkLlxuICAgICAqL1xuICAgIGRpc3BsYXlTYXZpbmdJY29uKHJlY29yZElkKSB7XG4gICAgICAgICQoYHRyIyR7cmVjb3JkSWR9IC51c2VyLmNpcmNsZWApXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ3VzZXIgY2lyY2xlJylcbiAgICAgICAgICAgIC5hZGRDbGFzcygnc3Bpbm5lciBsb2FkaW5nJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBzdWNjZXNzZnVsIHNhdmluZyBvZiBhIHJlY29yZC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSBzZXJ2ZXIgcmVzcG9uc2UuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHJlY29yZElkIC0gVGhlIElEIG9mIHRoZSByZWNvcmQgdGhhdCB3YXMgc2F2ZWQuXG4gICAgICovXG4gICAgb25TYXZlU3VjY2VzcyhyZXNwb25zZSwgcmVjb3JkSWQpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgIGxldCBvbGRJZCA9IHJlc3BvbnNlLmRhdGEub2xkSWQgfHwgcmVjb3JkSWQ7XG4gICAgICAgICAgICAkKGB0ciMke29sZElkfSBpbnB1dGApLmF0dHIoJ3JlYWRvbmx5JywgdHJ1ZSk7XG4gICAgICAgICAgICAkKGB0ciMke29sZElkfSBhLmRlbGV0ZS5idXR0b25gKS5hdHRyKCdkYXRhLXZhbHVlJywgcmVzcG9uc2UuZGF0YS5uZXdJZCk7XG4gICAgICAgICAgICAkKGB0ciMke29sZElkfSBkaXZgKS5yZW1vdmVDbGFzcygnY2hhbmdlZC1maWVsZCBsb2FkaW5nJykuYWRkQ2xhc3MoJ3RyYW5zcGFyZW50Jyk7XG4gICAgICAgICAgICAkKGB0ciMke29sZElkfSAuc3Bpbm5lci5sb2FkaW5nYCkuYWRkQ2xhc3MoJ3VzZXIgY2lyY2xlJykucmVtb3ZlQ2xhc3MoJ3NwaW5uZXIgbG9hZGluZycpO1xuICAgICAgICAgICAgaWYgKG9sZElkICE9PSByZXNwb25zZS5kYXRhLm5ld0lkKSB7XG4gICAgICAgICAgICAgICAgJChgdHIjJHtvbGRJZH1gKS5hdHRyKCdpZCcsIHJlc3BvbnNlLmRhdGEubmV3SWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERlbGV0ZSBhIHJvdyBmcm9tIHRoZSBwaG9uZWJvb2sgdGFibGUuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2pRdWVyeX0gJHRhcmdldCAtIFRoZSBkZWxldGUgYnV0dG9uIGVsZW1lbnQuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGlkIC0gVGhlIElEIG9mIHRoZSByZWNvcmQgdG8gZGVsZXRlLlxuICAgICAqL1xuICAgIGRlbGV0ZVJvdygkdGFyZ2V0LCBpZCkge1xuICAgICAgICBpZiAoaWQgPT09ICduZXcnKSB7XG4gICAgICAgICAgICAkdGFyZ2V0LmNsb3Nlc3QoJ3RyJykucmVtb3ZlKCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IGAke3RoaXMuZGVsZXRlUmVjb3JkQUpBWFVybH0vJHtpZH1gLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgb25TdWNjZXNzOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2Uuc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgICAgICAkdGFyZ2V0LmNsb3Nlc3QoJ3RyJykucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLiRyZWNvcmRzVGFibGUuZmluZCgndGJvZHkgPiB0cicpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy4kcmVjb3Jkc1RhYmxlLmZpbmQoJ3Rib2R5JykuYXBwZW5kKCc8dHIgY2xhc3M9XCJvZGRcIj48L3RyPicpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENsZWFuIG51bWJlciBiZWZvcmUgcGFzdGluZy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXN0ZWRWYWx1ZSAtIFRoZSBwYXN0ZWQgcGhvbmUgbnVtYmVyLlxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSBjbGVhbmVkIG51bWJlci5cbiAgICAgKi9cbiAgICBjYk9uTnVtYmVyQmVmb3JlUGFzdGUocGFzdGVkVmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIHBhc3RlZFZhbHVlLnJlcGxhY2UoL1xcRCsvZywgJycpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxjdWxhdGUgdGhlIG51bWJlciBvZiByb3dzIHRoYXQgY2FuIGZpdCBvbiBhIHBhZ2UgYmFzZWQgb24gd2luZG93IGhlaWdodC5cbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHtudW1iZXJ9IFRoZSBjYWxjdWxhdGVkIG51bWJlciBvZiByb3dzLlxuICAgICAqL1xuICAgIGNhbGN1bGF0ZVBhZ2VMZW5ndGgoKSB7XG4gICAgICAgIC8vIENhbGN1bGF0ZSByb3cgaGVpZ2h0XG4gICAgICAgIGxldCByb3dIZWlnaHQgPSB0aGlzLiRyZWNvcmRzVGFibGUuZmluZCgndHInKS5maXJzdCgpLm91dGVySGVpZ2h0KCk7XG5cbiAgICAgICAgLy8gQ2FsY3VsYXRlIHdpbmRvdyBoZWlnaHQgYW5kIGF2YWlsYWJsZSBzcGFjZSBmb3IgdGFibGVcbiAgICAgICAgY29uc3Qgd2luZG93SGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0O1xuICAgICAgICBjb25zdCBoZWFkZXJGb290ZXJIZWlnaHQgPSA1NTA7IC8vIEVzdGltYXRlIGhlaWdodCBmb3IgaGVhZGVyLCBmb290ZXIsIGFuZCBvdGhlciBlbGVtZW50c1xuXG4gICAgICAgIC8vIENhbGN1bGF0ZSBuZXcgcGFnZSBsZW5ndGhcbiAgICAgICAgcmV0dXJuIE1hdGgubWF4KE1hdGguZmxvb3IoKHdpbmRvd0hlaWdodCAtIGhlYWRlckZvb3RlckhlaWdodCkgLyByb3dIZWlnaHQpLCA1KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IHRoZSB2YWx1ZSBvZiBhIHF1ZXJ5IHBhcmFtZXRlciBmcm9tIHRoZSBVUkwuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFyYW0gLSBUaGUgbmFtZSBvZiB0aGUgcXVlcnkgcGFyYW1ldGVyIHRvIHJldHJpZXZlLlxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd8bnVsbH0gVGhlIHZhbHVlIG9mIHRoZSBxdWVyeSBwYXJhbWV0ZXIsIG9yIG51bGwgaWYgbm90IGZvdW5kLlxuICAgICAqL1xuICAgIGdldFF1ZXJ5UGFyYW0ocGFyYW0pIHtcbiAgICAgICAgY29uc3QgdXJsUGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcbiAgICAgICAgcmV0dXJuIHVybFBhcmFtcy5nZXQocGFyYW0pO1xuICAgIH0sXG59O1xuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgTW9kdWxlUGhvbmVCb29rRFQuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=