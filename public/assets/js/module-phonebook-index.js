"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 11 2018
 *
 */

/* global globalRootUrl,globalTranslate,
SemanticLocalization, UserMessage, InputMaskPatterns */
var ModulePhoneBook = {
  $formObj: $('#module-phonebook-form'),
  $checkBoxes: $('#module-phonebook-form .ui.checkbox'),
  $disabilityFields: $('#module-phonebook-form  .disability'),
  $statusToggle: $('#module-status-toggle'),
  $moduleStatus: $('#status'),
  $globalSearch: $('#globalsearch'),
  $recordsTable: $('#phonebook-table'),
  $addNewButton: $('#add-new-button'),
  inputNumberJQTPL: 'input.number-input',
  getNewRecordsAJAXUrl: "".concat(globalRootUrl, "module-phone-book/getNewRecords"),
  deleteRecordAJAXUrl: "".concat(globalRootUrl, "module-phone-book/delete"),
  saveRecordAJAXUrl: "".concat(globalRootUrl, "module-phone-book/save"),
  $maskList: null,
  validateRules: {},
  initialize: function () {
    function initialize() {
      ModulePhoneBook.checkStatusToggle();
      window.addEventListener('ModuleStatusChanged', ModulePhoneBook.checkStatusToggle); // Global Search filter

      ModulePhoneBook.$globalSearch.on('keyup', function (e) {
        if (e.keyCode === 13 || e.keyCode === 8 || ModulePhoneBook.$globalSearch.val().length === 0) {
          var text = "".concat(ModulePhoneBook.$globalSearch.val());
          ModulePhoneBook.applyFilter(text);
        }
      }); // Initialize DatTable

      ModulePhoneBook.$recordsTable.dataTable({
        search: {
          search: ModulePhoneBook.$globalSearch.val()
        },
        serverSide: true,
        processing: true,
        ajax: {
          url: ModulePhoneBook.getNewRecordsAJAXUrl,
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
        // scrollY: $(window).height() - ModulePhoneBook.$recordsTable.offset().top-200,
        // stateSave: true,
        sDom: 'rtip',
        deferRender: true,
        pageLength: 17,
        // scrollCollapse: true,
        // scroller: true,

        /**
         * Builder row presentation
         * @param row
         * @param data
         */
        createdRow: function () {
          function createdRow(row, data) {
            var templateName = '<div class="ui transparent fluid input inline-edit">' + "<input class=\"caller-id-input\" type=\"text\" data-value=\"".concat(data.call_id, "\" value=\"").concat(data.call_id, "\">") + '</div>';
            var templateCid = '<div class="ui transparent input inline-edit">' + "<input class=\"number-input\" type=\"text\" data-value=\"".concat(data.number, "\" value=\"").concat(data.number, "\">") + '</div>';
            var templateDeleteButton = '<div class="ui small basic icon buttons action-buttons">' + "<a href=\"".concat(ModulePhoneBook.deleteRecordAJAXUrl, "/").concat(data.DT_RowId, "\" data-value = \"").concat(data.DT_RowId, "\"") + " class=\"ui button delete two-steps-delete popuped\" data-content=\"".concat(globalTranslate.bt_ToolTipDelete, "\">") + '<i class="icon trash red"></i></a></div>';
            $('td', row).eq(0).html('<i class="ui user circle icon"></i>');
            $('td', row).eq(1).html(templateName);
            $('td', row).eq(2).html(templateCid);
            $('td', row).eq(3).html(templateDeleteButton);
          }

          return createdRow;
        }(),

        /**
         * Draw event - fired once the table has completed a draw.
         */
        drawCallback: function () {
          function drawCallback() {
            ModulePhoneBook.initializeInputmask($(ModulePhoneBook.inputNumberJQTPL));
          }

          return drawCallback;
        }(),
        language: SemanticLocalization.dataTableLocalisation,
        ordering: false
      });
      ModulePhoneBook.dataTable = ModulePhoneBook.$recordsTable.DataTable();
      ModulePhoneBook.dataTable.on('draw', function () {
        ModulePhoneBook.$globalSearch.closest('div').removeClass('loading');
      }); // Двойной клик на поле ввода номера

      $('body').on('focusin', '.caller-id-input, .number-input', function (e) {
        var currentRowId = $(e.target).closest('tr').attr('id');
        $(e.target).transition('glow');
        $(e.target).closest('div').removeClass('transparent').addClass('changed-field');
        $(e.target).attr('readonly', false);
      }); // Отправка формы на сервер по Enter или Tab

      $(document).on('keydown', function (e) {
        var keyCode = e.keyCode || e.which;

        if (keyCode === 13 || keyCode === 9 && !$(':focus').hasClass('.number-input')) {
          var $el = $('.changed-field').closest('tr');
          $el.each(function (index, obj) {
            var currentRowId = $(obj).attr('id');

            if (currentRowId !== undefined) {
              ModulePhoneBook.sendChangesToServer(currentRowId);
            }
          });
        }
      }); // Отправка формы на сервер по уходу с поля ввода

      $('body').on('focusout', '.caller-id-input, .number-input', function () {
        var $el = $('.changed-field').closest('tr');
        $el.each(function (index, obj) {
          var currentRowId = $(obj).attr('id');

          if (currentRowId !== undefined) {
            ModulePhoneBook.sendChangesToServer(currentRowId);
          }
        });
      }); // Клик на кнопку удалить

      $('body').on('click', 'a.delete', function (e) {
        e.preventDefault();
        var id = $(e.target).closest('a').attr('data-value');
        ModulePhoneBook.deleteRow($(e.target), id);
      }); // Добавление новой строки

      ModulePhoneBook.$addNewButton.on('click', function (e) {
        e.preventDefault();
        $('.dataTables_empty').remove(); // Отправим на запись все что не записано еще

        var $el = $('.changed-field').closest('tr');
        $el.each(function (index, obj) {
          var currentRowId = $(obj).attr('id');

          if (currentRowId !== undefined) {
            ModulePhoneBook.sendChangesToServer(currentRowId);
          }
        });
        var id = "new".concat(Math.floor(Math.random() * Math.floor(500)));
        var rowTemplate = "<tr id=\"".concat(id, "\">") + '<td><i class="ui user circle icon"></i></td>' + '<td><div class="ui fluid input inline-edit changed-field"><input class="caller-id-input" type="text" data-value="" value=""></div></td>' + '<td><div class="ui fluid input inline-edit changed-field"><input class="number-input" type="text" data-value="" value=""></div></td>' + '<td><div class="ui small basic icon buttons action-buttons">' + "<a href=\"#\" class=\"ui button delete two-steps-delete popuped\" data-value = \"new\" data-content=\"".concat(globalTranslate.bt_ToolTipDelete, "\">") + '<i class="icon trash red"></i></a></div></td>' + '</tr>';
        ModulePhoneBook.$recordsTable.find('tbody > tr:first').before(rowTemplate);
        $("tr#".concat(id, " input")).transition('glow');
        $("tr#".concat(id, " .caller-id-input")).focus();
        ModulePhoneBook.initializeInputmask($("tr#".concat(id, " .number-input")));
      });
    }

    return initialize;
  }(),

  /**
   * Отправка данных на сервер при измении
   */
  sendChangesToServer: function () {
    function sendChangesToServer(recordId) {
      var callerIdInputVal = $("tr#".concat(recordId, " .caller-id-input")).val();
      var numberInputVal = $("tr#".concat(recordId, " .number-input")).val();

      if (!callerIdInputVal || !numberInputVal) {
        return;
      }

      var number = numberInputVal.replace(/\D+/g, '');
      number = "1".concat(number.substr(number.length - 9));
      var data = {
        call_id: callerIdInputVal,
        number_rep: numberInputVal,
        number: number,
        id: recordId
      }; // Добавим иконку сохранения

      $("tr#".concat(recordId, " .user.circle")).removeClass('user circle').addClass('spinner loading');
      $.api({
        url: ModulePhoneBook.saveRecordAJAXUrl,
        on: 'now',
        method: 'POST',
        data: data,
        successTest: function () {
          function successTest(response) {
            // test whether a JSON response is valid
            return response !== undefined && Object.keys(response).length > 0 && response.success === true;
          }

          return successTest;
        }(),
        onSuccess: function () {
          function onSuccess(response) {
            if (response.data !== undefined) {
              var oldId = response.data.oldId;

              if (oldId === null) {
                oldId = recordId;
              }

              $("tr#".concat(oldId, " input")).attr('readonly', true);
              $("tr#".concat(oldId, " div")).removeClass('changed-field loading').addClass('transparent'); //ModulePhoneBook.$addNewButton.removeClass('disabled');

              $("tr#".concat(oldId, " .spinner.loading")).addClass('user circle').removeClass('spinner loading');

              if (oldId !== response.data.newId) {
                $("tr#".concat(oldId)).attr('id', response.data.newId);
              }
            }
          }

          return onSuccess;
        }(),
        onFailure: function () {
          function onFailure(response) {
            if (response.message !== undefined) {
              UserMessage.showMultiString(response.message);
            }

            $("tr#".concat(recordId, " .spinner.loading")).addClass('user circle').removeClass('spinner loading');
          }

          return onFailure;
        }(),
        onError: function () {
          function onError(errorMessage, element, xhr) {
            if (xhr.status === 403) {
              window.location = "".concat(globalRootUrl, "session/index");
            }
          }

          return onError;
        }()
      });
    }

    return sendChangesToServer;
  }(),

  /**
   * Инициализирует красивое представление номеров
   */
  initializeInputmask: function () {
    function initializeInputmask($el) {
      if (ModulePhoneBook.$maskList === null) {
        // Подготовим таблицу для сортировки
        ModulePhoneBook.$maskList = $.masksSort(InputMaskPatterns, ['#'], /[0-9]|#/, 'mask');
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
          // oncleared: extension.cbOnClearedMobileNumber,
          // oncomplete: extension.cbOnCompleteMobileNumber,
          // clearIncomplete: true,
          onBeforePaste: ModulePhoneBook.cbOnNumberBeforePaste // regex: /\D+/,

        },
        match: /[0-9]/,
        replace: '9',
        list: ModulePhoneBook.$maskList,
        listKey: 'mask'
      });
    }

    return initializeInputmask;
  }(),

  /**
   * Изменение статуса кнопок при изменении статуса модуля
   */
  checkStatusToggle: function () {
    function checkStatusToggle() {
      if (ModulePhoneBook.$statusToggle.checkbox('is checked')) {
        ModulePhoneBook.$disabilityFields.removeClass('disabled');
        ModulePhoneBook.$moduleStatus.show();
      } else {
        ModulePhoneBook.$disabilityFields.addClass('disabled');
        ModulePhoneBook.$moduleStatus.hide();
      }
    }

    return checkStatusToggle;
  }(),

  /**
   * Server side filter
   * @param text
   */
  applyFilter: function () {
    function applyFilter(text) {
      var $changedFields = $('.changed-field');
      $changedFields.each(function (index, obj) {
        $(obj).removeClass('changed-field').addClass('transparent');
        var $input = $(obj).find('input');
        $input.val($input.attr('data-value'));
        $input.attr('readonly', true);
      });
      ModulePhoneBook.dataTable.search(text).draw();
      ModulePhoneBook.$globalSearch.closest('div').addClass('loading');
    }

    return applyFilter;
  }(),

  /**
   * Очистка номера перед вставкой от лишних символов
   * @returns {boolean|*|void|string}
   */
  cbOnNumberBeforePaste: function () {
    function cbOnNumberBeforePaste(pastedValue) {
      return pastedValue.replace(/\D+/g, '');
    }

    return cbOnNumberBeforePaste;
  }(),

  /**
   * Удаление строки
   * @param $target - jquery button target
   * @param id - record id
   */
  deleteRow: function () {
    function deleteRow($target, id) {
      if (id === 'new') {
        $target.closest('tr').remove();
        return;
      }

      $.api({
        url: "".concat(globalRootUrl, "module-phone-book/delete/").concat(id),
        on: 'now',
        onSuccess: function () {
          function onSuccess(response) {
            if (response.success) {
              $target.closest('tr').remove();

              if (ModulePhoneBook.$recordsTable.find('tbody > tr').length === 0) {
                ModulePhoneBook.$recordsTable.find('tbody').append('<tr class="odd"></tr>');
              }
            }
          }

          return onSuccess;
        }()
      });
    }

    return deleteRow;
  }()
};
$(document).ready(function () {
  ModulePhoneBook.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9tb2R1bGUtcGhvbmVib29rLWluZGV4LmpzIl0sIm5hbWVzIjpbIk1vZHVsZVBob25lQm9vayIsIiRmb3JtT2JqIiwiJCIsIiRjaGVja0JveGVzIiwiJGRpc2FiaWxpdHlGaWVsZHMiLCIkc3RhdHVzVG9nZ2xlIiwiJG1vZHVsZVN0YXR1cyIsIiRnbG9iYWxTZWFyY2giLCIkcmVjb3Jkc1RhYmxlIiwiJGFkZE5ld0J1dHRvbiIsImlucHV0TnVtYmVySlFUUEwiLCJnZXROZXdSZWNvcmRzQUpBWFVybCIsImdsb2JhbFJvb3RVcmwiLCJkZWxldGVSZWNvcmRBSkFYVXJsIiwic2F2ZVJlY29yZEFKQVhVcmwiLCIkbWFza0xpc3QiLCJ2YWxpZGF0ZVJ1bGVzIiwiaW5pdGlhbGl6ZSIsImNoZWNrU3RhdHVzVG9nZ2xlIiwid2luZG93IiwiYWRkRXZlbnRMaXN0ZW5lciIsIm9uIiwiZSIsImtleUNvZGUiLCJ2YWwiLCJsZW5ndGgiLCJ0ZXh0IiwiYXBwbHlGaWx0ZXIiLCJkYXRhVGFibGUiLCJzZWFyY2giLCJzZXJ2ZXJTaWRlIiwicHJvY2Vzc2luZyIsImFqYXgiLCJ1cmwiLCJ0eXBlIiwiZGF0YVNyYyIsImNvbHVtbnMiLCJkYXRhIiwicGFnaW5nIiwic0RvbSIsImRlZmVyUmVuZGVyIiwicGFnZUxlbmd0aCIsImNyZWF0ZWRSb3ciLCJyb3ciLCJ0ZW1wbGF0ZU5hbWUiLCJjYWxsX2lkIiwidGVtcGxhdGVDaWQiLCJudW1iZXIiLCJ0ZW1wbGF0ZURlbGV0ZUJ1dHRvbiIsIkRUX1Jvd0lkIiwiZ2xvYmFsVHJhbnNsYXRlIiwiYnRfVG9vbFRpcERlbGV0ZSIsImVxIiwiaHRtbCIsImRyYXdDYWxsYmFjayIsImluaXRpYWxpemVJbnB1dG1hc2siLCJsYW5ndWFnZSIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiZGF0YVRhYmxlTG9jYWxpc2F0aW9uIiwib3JkZXJpbmciLCJEYXRhVGFibGUiLCJjbG9zZXN0IiwicmVtb3ZlQ2xhc3MiLCJjdXJyZW50Um93SWQiLCJ0YXJnZXQiLCJhdHRyIiwidHJhbnNpdGlvbiIsImFkZENsYXNzIiwiZG9jdW1lbnQiLCJ3aGljaCIsImhhc0NsYXNzIiwiJGVsIiwiZWFjaCIsImluZGV4Iiwib2JqIiwidW5kZWZpbmVkIiwic2VuZENoYW5nZXNUb1NlcnZlciIsInByZXZlbnREZWZhdWx0IiwiaWQiLCJkZWxldGVSb3ciLCJyZW1vdmUiLCJNYXRoIiwiZmxvb3IiLCJyYW5kb20iLCJyb3dUZW1wbGF0ZSIsImZpbmQiLCJiZWZvcmUiLCJmb2N1cyIsInJlY29yZElkIiwiY2FsbGVySWRJbnB1dFZhbCIsIm51bWJlcklucHV0VmFsIiwicmVwbGFjZSIsInN1YnN0ciIsIm51bWJlcl9yZXAiLCJhcGkiLCJtZXRob2QiLCJzdWNjZXNzVGVzdCIsInJlc3BvbnNlIiwiT2JqZWN0Iiwia2V5cyIsInN1Y2Nlc3MiLCJvblN1Y2Nlc3MiLCJvbGRJZCIsIm5ld0lkIiwib25GYWlsdXJlIiwibWVzc2FnZSIsIlVzZXJNZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwib25FcnJvciIsImVycm9yTWVzc2FnZSIsImVsZW1lbnQiLCJ4aHIiLCJzdGF0dXMiLCJsb2NhdGlvbiIsIm1hc2tzU29ydCIsIklucHV0TWFza1BhdHRlcm5zIiwiaW5wdXRtYXNrcyIsImlucHV0bWFzayIsImRlZmluaXRpb25zIiwidmFsaWRhdG9yIiwiY2FyZGluYWxpdHkiLCJzaG93TWFza09uSG92ZXIiLCJvbkJlZm9yZVBhc3RlIiwiY2JPbk51bWJlckJlZm9yZVBhc3RlIiwibWF0Y2giLCJsaXN0IiwibGlzdEtleSIsImNoZWNrYm94Iiwic2hvdyIsImhpZGUiLCIkY2hhbmdlZEZpZWxkcyIsIiRpbnB1dCIsImRyYXciLCJwYXN0ZWRWYWx1ZSIsIiR0YXJnZXQiLCJhcHBlbmQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7Ozs7QUFRQTs7QUFHQSxJQUFNQSxlQUFlLEdBQUc7QUFDdkJDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLHdCQUFELENB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QUhLO0FBQUEsNkJBR0tKLFFBSEwsRUFHZTtBQUNuQixnQkFBSUEsUUFBUSxDQUFDRyxPQUFiLEVBQXNCO0FBQ3JCa0MsY0FBQUEsT0FBTyxDQUFDekUsT0FBUixDQUFnQixJQUFoQixFQUFzQm1CLE1BQXRCOztBQUNBLGtCQUFJaEYsZUFBZSxDQUFDUSxhQUFoQixDQUE4QjZFLElBQTlCLENBQW1DLFlBQW5DLEVBQWlENUQsTUFBakQsS0FBMEQsQ0FBOUQsRUFBZ0U7QUFDL0R6QixnQkFBQUEsZUFBZSxDQUFDUSxhQUFoQixDQUE4QjZFLElBQTlCLENBQW1DLE9BQW5DLEVBQTRDa0QsTUFBNUMsQ0FBbUQsdUJBQW5EO0FBQ0E7QUFDRDtBQUNEOztBQVZJO0FBQUE7QUFBQSxPQUFOO0FBWUE7O0FBclVzQjtBQUFBO0FBQUEsQ0FBeEI7QUF3VUFySSxDQUFDLENBQUNrRSxRQUFELENBQUQsQ0FBWW9FLEtBQVosQ0FBa0IsWUFBTTtBQUN2QnhJLEVBQUFBLGVBQWUsQ0FBQ2lCLFVBQWhCO0FBQ0EsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBDb3B5cmlnaHQgKEMpIE1JS08gTExDIC0gQWxsIFJpZ2h0cyBSZXNlcnZlZFxuICogVW5hdXRob3JpemVkIGNvcHlpbmcgb2YgdGhpcyBmaWxlLCB2aWEgYW55IG1lZGl1bSBpcyBzdHJpY3RseSBwcm9oaWJpdGVkXG4gKiBQcm9wcmlldGFyeSBhbmQgY29uZmlkZW50aWFsXG4gKiBXcml0dGVuIGJ5IE5pa29sYXkgQmVrZXRvdiwgMTEgMjAxOFxuICpcbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCxnbG9iYWxUcmFuc2xhdGUsXG5TZW1hbnRpY0xvY2FsaXphdGlvbiwgVXNlck1lc3NhZ2UsIElucHV0TWFza1BhdHRlcm5zICovIFxuXG5jb25zdCBNb2R1bGVQaG9uZUJvb2sgPSB7XG5cdCRmb3JtT2JqOiAkKCcjbW9kdWxlLXBob25lYm9vay1mb3JtJyksXG5cdCRjaGVja0JveGVzOiAkKCcjbW9kdWxlLXBob25lYm9vay1mb3JtIC51aS5jaGVja2JveCcpLFxuXHQkZGlzYWJpbGl0eUZpZWxkczogJCgnI21vZHVsZS1waG9uZWJvb2stZm9ybSAgLmRpc2FiaWxpdHknKSxcblx0JHN0YXR1c1RvZ2dsZTogJCgnI21vZHVsZS1zdGF0dXMtdG9nZ2xlJyksXG5cdCRtb2R1bGVTdGF0dXM6ICQoJyNzdGF0dXMnKSxcblx0JGdsb2JhbFNlYXJjaDogJCgnI2dsb2JhbHNlYXJjaCcpLFxuXHQkcmVjb3Jkc1RhYmxlOiAkKCcjcGhvbmVib29rLXRhYmxlJyksXG5cdCRhZGROZXdCdXR0b246ICQoJyNhZGQtbmV3LWJ1dHRvbicpLFxuXHRpbnB1dE51bWJlckpRVFBMOiAnaW5wdXQubnVtYmVyLWlucHV0Jyxcblx0Z2V0TmV3UmVjb3Jkc0FKQVhVcmw6IGAke2dsb2JhbFJvb3RVcmx9bW9kdWxlLXBob25lLWJvb2svZ2V0TmV3UmVjb3Jkc2AsXG5cdGRlbGV0ZVJlY29yZEFKQVhVcmw6IGAke2dsb2JhbFJvb3RVcmx9bW9kdWxlLXBob25lLWJvb2svZGVsZXRlYCxcblx0c2F2ZVJlY29yZEFKQVhVcmw6IGAke2dsb2JhbFJvb3RVcmx9bW9kdWxlLXBob25lLWJvb2svc2F2ZWAsXG5cdCRtYXNrTGlzdDogbnVsbCxcblx0dmFsaWRhdGVSdWxlczoge1xuXHR9LFxuXHRpbml0aWFsaXplKCkge1xuXHRcdE1vZHVsZVBob25lQm9vay5jaGVja1N0YXR1c1RvZ2dsZSgpO1xuXHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdNb2R1bGVTdGF0dXNDaGFuZ2VkJywgTW9kdWxlUGhvbmVCb29rLmNoZWNrU3RhdHVzVG9nZ2xlKTtcblxuXHRcdC8vIEdsb2JhbCBTZWFyY2ggZmlsdGVyXG5cdFx0TW9kdWxlUGhvbmVCb29rLiRnbG9iYWxTZWFyY2gub24oJ2tleXVwJywgKGUpID0+IHtcblx0XHRcdGlmIChlLmtleUNvZGUgPT09IDEzXG5cdFx0XHRcdHx8IGUua2V5Q29kZSA9PT0gOFxuXHRcdFx0XHR8fCBNb2R1bGVQaG9uZUJvb2suJGdsb2JhbFNlYXJjaC52YWwoKS5sZW5ndGggPT09IDApIHtcblx0XHRcdFx0Y29uc3QgdGV4dCA9IGAke01vZHVsZVBob25lQm9vay4kZ2xvYmFsU2VhcmNoLnZhbCgpfWA7XG5cdFx0XHRcdE1vZHVsZVBob25lQm9vay5hcHBseUZpbHRlcih0ZXh0KTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdC8vIEluaXRpYWxpemUgRGF0VGFibGVcblx0XHRNb2R1bGVQaG9uZUJvb2suJHJlY29yZHNUYWJsZS5kYXRhVGFibGUoe1xuXHRcdFx0c2VhcmNoOiB7XG5cdFx0XHRcdHNlYXJjaDogTW9kdWxlUGhvbmVCb29rLiRnbG9iYWxTZWFyY2gudmFsKCksXG5cdFx0XHR9LFxuXHRcdFx0c2VydmVyU2lkZTogdHJ1ZSxcblx0XHRcdHByb2Nlc3Npbmc6IHRydWUsXG5cdFx0XHRhamF4OiB7XG5cdFx0XHRcdHVybDogTW9kdWxlUGhvbmVCb29rLmdldE5ld1JlY29yZHNBSkFYVXJsLFxuXHRcdFx0XHR0eXBlOiAnUE9TVCcsXG5cdFx0XHRcdGRhdGFTcmM6ICdkYXRhJyxcblx0XHRcdH0sXG5cdFx0XHRjb2x1bW5zOiBbXG5cdFx0XHRcdHsgZGF0YTogbnVsbCB9LFxuXHRcdFx0XHR7IGRhdGE6ICdjYWxsX2lkJyB9LFxuXHRcdFx0XHR7IGRhdGE6ICdudW1iZXInIH0sXG5cdFx0XHRcdHsgZGF0YTogbnVsbCB9LFxuXHRcdFx0XSxcblx0XHRcdHBhZ2luZzogdHJ1ZSxcblx0XHRcdC8vIHNjcm9sbFk6ICQod2luZG93KS5oZWlnaHQoKSAtIE1vZHVsZVBob25lQm9vay4kcmVjb3Jkc1RhYmxlLm9mZnNldCgpLnRvcC0yMDAsXG5cdFx0XHQvLyBzdGF0ZVNhdmU6IHRydWUsXG5cdFx0XHRzRG9tOiAncnRpcCcsXG5cdFx0XHRkZWZlclJlbmRlcjogdHJ1ZSxcblx0XHRcdHBhZ2VMZW5ndGg6IDE3LFxuXG5cdFx0XHQvLyBzY3JvbGxDb2xsYXBzZTogdHJ1ZSxcblx0XHRcdC8vIHNjcm9sbGVyOiB0cnVlLFxuXHRcdFx0LyoqXG5cdFx0XHQgKiBCdWlsZGVyIHJvdyBwcmVzZW50YXRpb25cblx0XHRcdCAqIEBwYXJhbSByb3dcblx0XHRcdCAqIEBwYXJhbSBkYXRhXG5cdFx0XHQgKi9cblx0XHRcdGNyZWF0ZWRSb3cocm93LCBkYXRhKSB7XG5cdFx0XHRcdGNvbnN0IHRlbXBsYXRlTmFtZSA9XG5cdFx0XHRcdFx0JzxkaXYgY2xhc3M9XCJ1aSB0cmFuc3BhcmVudCBmbHVpZCBpbnB1dCBpbmxpbmUtZWRpdFwiPicgK1xuXHRcdFx0XHRcdGA8aW5wdXQgY2xhc3M9XCJjYWxsZXItaWQtaW5wdXRcIiB0eXBlPVwidGV4dFwiIGRhdGEtdmFsdWU9XCIke2RhdGEuY2FsbF9pZH1cIiB2YWx1ZT1cIiR7ZGF0YS5jYWxsX2lkfVwiPmAgK1xuXHRcdFx0XHRcdCc8L2Rpdj4nO1xuXG5cdFx0XHRcdGNvbnN0IHRlbXBsYXRlQ2lkID1cblx0XHRcdFx0XHQnPGRpdiBjbGFzcz1cInVpIHRyYW5zcGFyZW50IGlucHV0IGlubGluZS1lZGl0XCI+JyArXG5cdFx0XHRcdFx0YDxpbnB1dCBjbGFzcz1cIm51bWJlci1pbnB1dFwiIHR5cGU9XCJ0ZXh0XCIgZGF0YS12YWx1ZT1cIiR7ZGF0YS5udW1iZXJ9XCIgdmFsdWU9XCIke2RhdGEubnVtYmVyfVwiPmAgK1xuXHRcdFx0XHRcdCc8L2Rpdj4nO1xuXG5cdFx0XHRcdGNvbnN0IHRlbXBsYXRlRGVsZXRlQnV0dG9uID0gJzxkaXYgY2xhc3M9XCJ1aSBzbWFsbCBiYXNpYyBpY29uIGJ1dHRvbnMgYWN0aW9uLWJ1dHRvbnNcIj4nICtcblx0XHRcdFx0XHRgPGEgaHJlZj1cIiR7TW9kdWxlUGhvbmVCb29rLmRlbGV0ZVJlY29yZEFKQVhVcmx9LyR7ZGF0YS5EVF9Sb3dJZH1cIiBkYXRhLXZhbHVlID0gXCIke2RhdGEuRFRfUm93SWR9XCJgICtcblx0XHRcdFx0XHRgIGNsYXNzPVwidWkgYnV0dG9uIGRlbGV0ZSB0d28tc3RlcHMtZGVsZXRlIHBvcHVwZWRcIiBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwRGVsZXRlfVwiPmAgK1xuXHRcdFx0XHRcdCc8aSBjbGFzcz1cImljb24gdHJhc2ggcmVkXCI+PC9pPjwvYT48L2Rpdj4nO1xuXG5cdFx0XHRcdCQoJ3RkJywgcm93KS5lcSgwKS5odG1sKCc8aSBjbGFzcz1cInVpIHVzZXIgY2lyY2xlIGljb25cIj48L2k+Jyk7XG5cdFx0XHRcdCQoJ3RkJywgcm93KS5lcSgxKS5odG1sKHRlbXBsYXRlTmFtZSk7XG5cdFx0XHRcdCQoJ3RkJywgcm93KS5lcSgyKS5odG1sKHRlbXBsYXRlQ2lkKTtcblx0XHRcdFx0JCgndGQnLCByb3cpLmVxKDMpLmh0bWwodGVtcGxhdGVEZWxldGVCdXR0b24pO1xuXHRcdFx0fSxcblx0XHRcdC8qKlxuXHRcdFx0ICogRHJhdyBldmVudCAtIGZpcmVkIG9uY2UgdGhlIHRhYmxlIGhhcyBjb21wbGV0ZWQgYSBkcmF3LlxuXHRcdFx0ICovXG5cdFx0XHRkcmF3Q2FsbGJhY2soKSB7XG5cdFx0XHRcdE1vZHVsZVBob25lQm9vay5pbml0aWFsaXplSW5wdXRtYXNrKCQoTW9kdWxlUGhvbmVCb29rLmlucHV0TnVtYmVySlFUUEwpKTtcblx0XHRcdH0sXG5cdFx0XHRsYW5ndWFnZTogU2VtYW50aWNMb2NhbGl6YXRpb24uZGF0YVRhYmxlTG9jYWxpc2F0aW9uLFxuXHRcdFx0b3JkZXJpbmc6IGZhbHNlLFxuXHRcdH0pO1xuXHRcdE1vZHVsZVBob25lQm9vay5kYXRhVGFibGUgPSBNb2R1bGVQaG9uZUJvb2suJHJlY29yZHNUYWJsZS5EYXRhVGFibGUoKTtcblxuXHRcdE1vZHVsZVBob25lQm9vay5kYXRhVGFibGUub24oJ2RyYXcnLCAoKSA9PiB7XG5cdFx0XHRNb2R1bGVQaG9uZUJvb2suJGdsb2JhbFNlYXJjaC5jbG9zZXN0KCdkaXYnKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXHRcdH0pO1xuXG5cdFx0Ly8g0JTQstC+0LnQvdC+0Lkg0LrQu9C40Log0L3QsCDQv9C+0LvQtSDQstCy0L7QtNCwINC90L7QvNC10YDQsFxuXHRcdCQoJ2JvZHknKS5vbignZm9jdXNpbicsICcuY2FsbGVyLWlkLWlucHV0LCAubnVtYmVyLWlucHV0JywgKGUpID0+IHtcblx0XHRcdGNvbnN0IGN1cnJlbnRSb3dJZCA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJykuYXR0cignaWQnKTtcblx0XHRcdCQoZS50YXJnZXQpLnRyYW5zaXRpb24oJ2dsb3cnKTtcblxuXHRcdFx0JChlLnRhcmdldCkuY2xvc2VzdCgnZGl2Jylcblx0XHRcdFx0LnJlbW92ZUNsYXNzKCd0cmFuc3BhcmVudCcpXG5cdFx0XHRcdC5hZGRDbGFzcygnY2hhbmdlZC1maWVsZCcpO1xuXHRcdFx0JChlLnRhcmdldCkuYXR0cigncmVhZG9ubHknLCBmYWxzZSk7XG5cdFx0fSk7XG5cblx0XHQvLyDQntGC0L/RgNCw0LLQutCwINGE0L7RgNC80Ysg0L3QsCDRgdC10YDQstC10YAg0L/QviBFbnRlciDQuNC70LggVGFiXG5cdFx0JChkb2N1bWVudCkub24oJ2tleWRvd24nLCAoZSkgPT4ge1xuXHRcdFx0Y29uc3Qga2V5Q29kZSA9IGUua2V5Q29kZSB8fCBlLndoaWNoO1xuXHRcdFx0aWYgKGtleUNvZGUgPT09IDEzXG5cdFx0XHR8fCAoa2V5Q29kZSA9PT0gOSAmJiAhJCgnOmZvY3VzJykuaGFzQ2xhc3MoJy5udW1iZXItaW5wdXQnKSlcblx0XHRcdCkge1xuXHRcdFx0XHRjb25zdCAkZWwgPSAkKCcuY2hhbmdlZC1maWVsZCcpLmNsb3Nlc3QoJ3RyJyk7XG5cdFx0XHRcdCRlbC5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG5cdFx0XHRcdFx0Y29uc3QgY3VycmVudFJvd0lkID0gJChvYmopLmF0dHIoJ2lkJyk7XG5cdFx0XHRcdFx0aWYgKGN1cnJlbnRSb3dJZCAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0XHRNb2R1bGVQaG9uZUJvb2suc2VuZENoYW5nZXNUb1NlcnZlcihjdXJyZW50Um93SWQpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHQvLyDQntGC0L/RgNCw0LLQutCwINGE0L7RgNC80Ysg0L3QsCDRgdC10YDQstC10YAg0L/QviDRg9GF0L7QtNGDINGBINC/0L7Qu9GPINCy0LLQvtC00LBcblx0XHQkKCdib2R5Jykub24oJ2ZvY3Vzb3V0JywgJy5jYWxsZXItaWQtaW5wdXQsIC5udW1iZXItaW5wdXQnLCAoKSA9PiB7XG5cdFx0XHRcdGNvbnN0ICRlbCA9ICQoJy5jaGFuZ2VkLWZpZWxkJykuY2xvc2VzdCgndHInKTtcblx0XHRcdFx0JGVsLmVhY2goKGluZGV4LCBvYmopID0+IHtcblx0XHRcdFx0XHRjb25zdCBjdXJyZW50Um93SWQgPSAkKG9iaikuYXR0cignaWQnKTtcblx0XHRcdFx0XHRpZiAoY3VycmVudFJvd0lkICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRcdE1vZHVsZVBob25lQm9vay5zZW5kQ2hhbmdlc1RvU2VydmVyKGN1cnJlbnRSb3dJZCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHR9KTtcblxuXHRcdC8vINCa0LvQuNC6INC90LAg0LrQvdC+0L/QutGDINGD0LTQsNC70LjRgtGMXG5cdFx0JCgnYm9keScpLm9uKCdjbGljaycsICdhLmRlbGV0ZScsIChlKSA9PiB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRjb25zdCBpZCA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ2EnKS5hdHRyKCdkYXRhLXZhbHVlJyk7XG5cdFx0XHRNb2R1bGVQaG9uZUJvb2suZGVsZXRlUm93KCQoZS50YXJnZXQpLCBpZCk7XG5cdFx0fSk7XG5cblx0XHQvLyDQlNC+0LHQsNCy0LvQtdC90LjQtSDQvdC+0LLQvtC5INGB0YLRgNC+0LrQuFxuXHRcdE1vZHVsZVBob25lQm9vay4kYWRkTmV3QnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHQkKCcuZGF0YVRhYmxlc19lbXB0eScpLnJlbW92ZSgpO1xuXHRcdFx0Ly8g0J7RgtC/0YDQsNCy0LjQvCDQvdCwINC30LDQv9C40YHRjCDQstGB0LUg0YfRgtC+INC90LUg0LfQsNC/0LjRgdCw0L3QviDQtdGJ0LVcblx0XHRcdGNvbnN0ICRlbCA9ICQoJy5jaGFuZ2VkLWZpZWxkJykuY2xvc2VzdCgndHInKTtcblx0XHRcdCRlbC5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG5cdFx0XHRcdGNvbnN0IGN1cnJlbnRSb3dJZCA9ICQob2JqKS5hdHRyKCdpZCcpO1xuXHRcdFx0XHRpZiAoY3VycmVudFJvd0lkICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRNb2R1bGVQaG9uZUJvb2suc2VuZENoYW5nZXNUb1NlcnZlcihjdXJyZW50Um93SWQpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblxuXHRcdFx0Y29uc3QgaWQgPSBgbmV3JHtNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBNYXRoLmZsb29yKDUwMCkpfWA7XG5cdFx0XHRjb25zdCByb3dUZW1wbGF0ZSA9IGA8dHIgaWQ9XCIke2lkfVwiPmAgK1xuXHRcdFx0XHQnPHRkPjxpIGNsYXNzPVwidWkgdXNlciBjaXJjbGUgaWNvblwiPjwvaT48L3RkPicgK1xuXHRcdFx0XHQnPHRkPjxkaXYgY2xhc3M9XCJ1aSBmbHVpZCBpbnB1dCBpbmxpbmUtZWRpdCBjaGFuZ2VkLWZpZWxkXCI+PGlucHV0IGNsYXNzPVwiY2FsbGVyLWlkLWlucHV0XCIgdHlwZT1cInRleHRcIiBkYXRhLXZhbHVlPVwiXCIgdmFsdWU9XCJcIj48L2Rpdj48L3RkPicgK1xuXHRcdFx0XHQnPHRkPjxkaXYgY2xhc3M9XCJ1aSBmbHVpZCBpbnB1dCBpbmxpbmUtZWRpdCBjaGFuZ2VkLWZpZWxkXCI+PGlucHV0IGNsYXNzPVwibnVtYmVyLWlucHV0XCIgdHlwZT1cInRleHRcIiBkYXRhLXZhbHVlPVwiXCIgdmFsdWU9XCJcIj48L2Rpdj48L3RkPicgK1xuXHRcdFx0XHQnPHRkPjxkaXYgY2xhc3M9XCJ1aSBzbWFsbCBiYXNpYyBpY29uIGJ1dHRvbnMgYWN0aW9uLWJ1dHRvbnNcIj4nICtcblx0XHRcdFx0XHRgPGEgaHJlZj1cIiNcIiBjbGFzcz1cInVpIGJ1dHRvbiBkZWxldGUgdHdvLXN0ZXBzLWRlbGV0ZSBwb3B1cGVkXCIgZGF0YS12YWx1ZSA9IFwibmV3XCIgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcERlbGV0ZX1cIj5gICtcblx0XHRcdFx0XHQnPGkgY2xhc3M9XCJpY29uIHRyYXNoIHJlZFwiPjwvaT48L2E+PC9kaXY+PC90ZD4nICtcblx0XHRcdFx0JzwvdHI+Jztcblx0XHRcdE1vZHVsZVBob25lQm9vay4kcmVjb3Jkc1RhYmxlLmZpbmQoJ3Rib2R5ID4gdHI6Zmlyc3QnKS5iZWZvcmUocm93VGVtcGxhdGUpO1xuXHRcdFx0JChgdHIjJHtpZH0gaW5wdXRgKS50cmFuc2l0aW9uKCdnbG93Jyk7XG5cdFx0XHQkKGB0ciMke2lkfSAuY2FsbGVyLWlkLWlucHV0YCkuZm9jdXMoKTtcblx0XHRcdE1vZHVsZVBob25lQm9vay5pbml0aWFsaXplSW5wdXRtYXNrKCQoYHRyIyR7aWR9IC5udW1iZXItaW5wdXRgKSk7XG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQntGC0L/RgNCw0LLQutCwINC00LDQvdC90YvRhSDQvdCwINGB0LXRgNCy0LXRgCDQv9GA0Lgg0LjQt9C80LXQvdC40Lhcblx0ICovXG5cdHNlbmRDaGFuZ2VzVG9TZXJ2ZXIocmVjb3JkSWQpIHtcblxuXHRcdGNvbnN0IGNhbGxlcklkSW5wdXRWYWwgPSAkKGB0ciMke3JlY29yZElkfSAuY2FsbGVyLWlkLWlucHV0YCkudmFsKCk7XG5cdFx0Y29uc3QgbnVtYmVySW5wdXRWYWwgPSAkKGB0ciMke3JlY29yZElkfSAubnVtYmVyLWlucHV0YCkudmFsKCk7XG5cdFx0aWYgKCFjYWxsZXJJZElucHV0VmFsIHx8ICFudW1iZXJJbnB1dFZhbCl7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdGxldCBudW1iZXIgPSBudW1iZXJJbnB1dFZhbC5yZXBsYWNlKC9cXEQrL2csICcnKTtcblx0XHRudW1iZXI9YDEke251bWJlci5zdWJzdHIobnVtYmVyLmxlbmd0aCAtIDkpfWA7XG5cdFx0Y29uc3QgZGF0YSA9IHtcblx0XHRcdGNhbGxfaWQ6IGNhbGxlcklkSW5wdXRWYWwsXG5cdFx0XHRudW1iZXJfcmVwOiBudW1iZXJJbnB1dFZhbCxcblx0XHRcdG51bWJlcjogbnVtYmVyLFxuXHRcdFx0aWQ6IHJlY29yZElkLFxuXHRcdH07XG5cblx0XHQvLyDQlNC+0LHQsNCy0LjQvCDQuNC60L7QvdC60YMg0YHQvtGF0YDQsNC90LXQvdC40Y9cblx0XHQkKGB0ciMke3JlY29yZElkfSAudXNlci5jaXJjbGVgKVxuXHRcdFx0LnJlbW92ZUNsYXNzKCd1c2VyIGNpcmNsZScpXG5cdFx0XHQuYWRkQ2xhc3MoJ3NwaW5uZXIgbG9hZGluZycpO1xuXG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBNb2R1bGVQaG9uZUJvb2suc2F2ZVJlY29yZEFKQVhVcmwsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGEsXG5cdFx0XHRzdWNjZXNzVGVzdChyZXNwb25zZSkge1xuXHRcdFx0XHQvLyB0ZXN0IHdoZXRoZXIgYSBKU09OIHJlc3BvbnNlIGlzIHZhbGlkXG5cdFx0XHRcdHJldHVybiByZXNwb25zZSAhPT0gdW5kZWZpbmVkXG5cdFx0XHRcdFx0JiYgT2JqZWN0LmtleXMocmVzcG9uc2UpLmxlbmd0aCA+IDBcblx0XHRcdFx0XHQmJiByZXNwb25zZS5zdWNjZXNzID09PSB0cnVlO1xuXHRcdFx0fSxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRpZiAocmVzcG9uc2UuZGF0YSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0bGV0IG9sZElkID0gcmVzcG9uc2UuZGF0YS5vbGRJZDtcblx0XHRcdFx0XHRpZiAob2xkSWQ9PT1udWxsKXtcblx0XHRcdFx0XHRcdG9sZElkID0gcmVjb3JkSWQ7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0JChgdHIjJHtvbGRJZH0gaW5wdXRgKS5hdHRyKCdyZWFkb25seScsIHRydWUpO1xuXHRcdFx0XHRcdCQoYHRyIyR7b2xkSWR9IGRpdmApLnJlbW92ZUNsYXNzKCdjaGFuZ2VkLWZpZWxkIGxvYWRpbmcnKS5hZGRDbGFzcygndHJhbnNwYXJlbnQnKTtcblx0XHRcdFx0XHQvL01vZHVsZVBob25lQm9vay4kYWRkTmV3QnV0dG9uLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0XHRcdCQoYHRyIyR7b2xkSWR9IC5zcGlubmVyLmxvYWRpbmdgKVxuXHRcdFx0XHRcdFx0LmFkZENsYXNzKCd1c2VyIGNpcmNsZScpXG5cdFx0XHRcdFx0XHQucmVtb3ZlQ2xhc3MoJ3NwaW5uZXIgbG9hZGluZycpO1xuXHRcdFx0XHRcdGlmIChvbGRJZCAhPT0gcmVzcG9uc2UuZGF0YS5uZXdJZCl7XG5cdFx0XHRcdFx0XHQkKGB0ciMke29sZElkfWApLmF0dHIoJ2lkJywgcmVzcG9uc2UuZGF0YS5uZXdJZCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGlmIChyZXNwb25zZS5tZXNzYWdlICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0JChgdHIjJHtyZWNvcmRJZH0gLnNwaW5uZXIubG9hZGluZ2ApXG5cdFx0XHRcdFx0LmFkZENsYXNzKCd1c2VyIGNpcmNsZScpXG5cdFx0XHRcdFx0LnJlbW92ZUNsYXNzKCdzcGlubmVyIGxvYWRpbmcnKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSB7XG5cdFx0XHRcdGlmICh4aHIuc3RhdHVzID09PSA0MDMpIHtcblx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0JjQvdC40YbQuNCw0LvQuNC30LjRgNGD0LXRgiDQutGA0LDRgdC40LLQvtC1INC/0YDQtdC00YHRgtCw0LLQu9C10L3QuNC1INC90L7QvNC10YDQvtCyXG5cdCAqL1xuXHRpbml0aWFsaXplSW5wdXRtYXNrKCRlbCkge1xuXHRcdGlmIChNb2R1bGVQaG9uZUJvb2suJG1hc2tMaXN0ID09PSBudWxsKSB7XG5cdFx0XHQvLyDQn9C+0LTQs9C+0YLQvtCy0LjQvCDRgtCw0LHQu9C40YbRgyDQtNC70Y8g0YHQvtGA0YLQuNGA0L7QstC60Lhcblx0XHRcdE1vZHVsZVBob25lQm9vay4kbWFza0xpc3QgPSAkLm1hc2tzU29ydChJbnB1dE1hc2tQYXR0ZXJucywgWycjJ10sIC9bMC05XXwjLywgJ21hc2snKTtcblx0XHR9XG5cdFx0JGVsLmlucHV0bWFza3Moe1xuXHRcdFx0aW5wdXRtYXNrOiB7XG5cdFx0XHRcdGRlZmluaXRpb25zOiB7XG5cdFx0XHRcdFx0JyMnOiB7XG5cdFx0XHRcdFx0XHR2YWxpZGF0b3I6ICdbMC05XScsXG5cdFx0XHRcdFx0XHRjYXJkaW5hbGl0eTogMSxcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRzaG93TWFza09uSG92ZXI6IGZhbHNlLFxuXHRcdFx0XHQvLyBvbmNsZWFyZWQ6IGV4dGVuc2lvbi5jYk9uQ2xlYXJlZE1vYmlsZU51bWJlcixcblx0XHRcdFx0Ly8gb25jb21wbGV0ZTogZXh0ZW5zaW9uLmNiT25Db21wbGV0ZU1vYmlsZU51bWJlcixcblx0XHRcdFx0Ly8gY2xlYXJJbmNvbXBsZXRlOiB0cnVlLFxuXHRcdFx0XHRvbkJlZm9yZVBhc3RlOiBNb2R1bGVQaG9uZUJvb2suY2JPbk51bWJlckJlZm9yZVBhc3RlLFxuXHRcdFx0XHQvLyByZWdleDogL1xcRCsvLFxuXHRcdFx0fSxcblx0XHRcdG1hdGNoOiAvWzAtOV0vLFxuXHRcdFx0cmVwbGFjZTogJzknLFxuXHRcdFx0bGlzdDogTW9kdWxlUGhvbmVCb29rLiRtYXNrTGlzdCxcblx0XHRcdGxpc3RLZXk6ICdtYXNrJyxcblxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0JjQt9C80LXQvdC10L3QuNC1INGB0YLQsNGC0YPRgdCwINC60L3QvtC/0L7QuiDQv9GA0Lgg0LjQt9C80LXQvdC10L3QuNC4INGB0YLQsNGC0YPRgdCwINC80L7QtNGD0LvRj1xuXHQgKi9cblx0Y2hlY2tTdGF0dXNUb2dnbGUoKSB7XG5cdFx0aWYgKE1vZHVsZVBob25lQm9vay4kc3RhdHVzVG9nZ2xlLmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcblx0XHRcdE1vZHVsZVBob25lQm9vay4kZGlzYWJpbGl0eUZpZWxkcy5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdE1vZHVsZVBob25lQm9vay4kbW9kdWxlU3RhdHVzLnNob3coKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0TW9kdWxlUGhvbmVCb29rLiRkaXNhYmlsaXR5RmllbGRzLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0TW9kdWxlUGhvbmVCb29rLiRtb2R1bGVTdGF0dXMuaGlkZSgpO1xuXHRcdH1cblx0fSxcblx0LyoqXG5cdCAqIFNlcnZlciBzaWRlIGZpbHRlclxuXHQgKiBAcGFyYW0gdGV4dFxuXHQgKi9cblx0YXBwbHlGaWx0ZXIodGV4dCkge1xuXHRcdGNvbnN0ICRjaGFuZ2VkRmllbGRzID0gJCgnLmNoYW5nZWQtZmllbGQnKTtcblx0XHQkY2hhbmdlZEZpZWxkcy5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG5cdFx0XHQkKG9iaikucmVtb3ZlQ2xhc3MoJ2NoYW5nZWQtZmllbGQnKS5hZGRDbGFzcygndHJhbnNwYXJlbnQnKTtcblx0XHRcdGNvbnN0ICRpbnB1dCA9ICQob2JqKS5maW5kKCdpbnB1dCcpO1xuXHRcdFx0JGlucHV0LnZhbCgkaW5wdXQuYXR0cignZGF0YS12YWx1ZScpKTtcblx0XHRcdCRpbnB1dC5hdHRyKCdyZWFkb25seScsIHRydWUpO1xuXHRcdH0pO1xuXHRcdE1vZHVsZVBob25lQm9vay5kYXRhVGFibGUuc2VhcmNoKHRleHQpLmRyYXcoKTtcblx0XHRNb2R1bGVQaG9uZUJvb2suJGdsb2JhbFNlYXJjaC5jbG9zZXN0KCdkaXYnKS5hZGRDbGFzcygnbG9hZGluZycpO1xuXHR9LFxuXHQvKipcblx0ICog0J7Rh9C40YHRgtC60LAg0L3QvtC80LXRgNCwINC/0LXRgNC10LQg0LLRgdGC0LDQstC60L7QuSDQvtGCINC70LjRiNC90LjRhSDRgdC40LzQstC+0LvQvtCyXG5cdCAqIEByZXR1cm5zIHtib29sZWFufCp8dm9pZHxzdHJpbmd9XG5cdCAqL1xuXHRjYk9uTnVtYmVyQmVmb3JlUGFzdGUocGFzdGVkVmFsdWUpIHtcblx0XHRyZXR1cm4gcGFzdGVkVmFsdWUucmVwbGFjZSgvXFxEKy9nLCAnJyk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQo9C00LDQu9C10L3QuNC1INGB0YLRgNC+0LrQuFxuXHQgKiBAcGFyYW0gJHRhcmdldCAtIGpxdWVyeSBidXR0b24gdGFyZ2V0XG5cdCAqIEBwYXJhbSBpZCAtIHJlY29yZCBpZFxuXHQgKi9cblx0ZGVsZXRlUm93KCR0YXJnZXQsIGlkKSB7XG5cdFx0aWYgKGlkID09PSAnbmV3Jykge1xuXHRcdFx0JHRhcmdldC5jbG9zZXN0KCd0cicpLnJlbW92ZSgpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IGAke2dsb2JhbFJvb3RVcmx9bW9kdWxlLXBob25lLWJvb2svZGVsZXRlLyR7aWR9YCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRpZiAocmVzcG9uc2Uuc3VjY2Vzcykge1xuXHRcdFx0XHRcdCR0YXJnZXQuY2xvc2VzdCgndHInKS5yZW1vdmUoKTtcblx0XHRcdFx0XHRpZiAoTW9kdWxlUGhvbmVCb29rLiRyZWNvcmRzVGFibGUuZmluZCgndGJvZHkgPiB0cicpLmxlbmd0aD09PTApe1xuXHRcdFx0XHRcdFx0TW9kdWxlUGhvbmVCb29rLiRyZWNvcmRzVGFibGUuZmluZCgndGJvZHknKS5hcHBlbmQoJzx0ciBjbGFzcz1cIm9kZFwiPjwvdHI+Jyk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxufTtcblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRNb2R1bGVQaG9uZUJvb2suaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=