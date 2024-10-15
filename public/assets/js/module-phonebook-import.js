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

/* global Config, globalTranslate, UserMessage, PbxApi, mergingCheckWorker */
var ModulePhoneBookImport = {
  /**
   * jQuery object for the progress bar.
   * @type {jQuery}
   */
  $progressBar: $('#upload-progress-bar'),

  /**
   * jQuery object for the import button
   * @type {jQuery}
   */
  $importButton: $('#import-from-excel-button'),

  /**
   * jQuery object for the file input field.
   * @type {jQuery}
   */
  $fileInput: $('#file'),
  importFromExcelAJAXUrl: "".concat(Config.pbxUrl, "/pbxcore/api/modules/module-phone-book/import-from-excel"),
  initialize: function initialize() {
    // Инициализируем нажатие на кнопку
    ModulePhoneBookImport.$importButton.on('click', ModulePhoneBookImport.uploadExcelFile);
  },

  /**
   * Функция импорта файла через POST-запрос с использованием Semantic UI API и FormData
   */
  uploadExcelFile: function uploadExcelFile() {
    var file = ModulePhoneBookImport.$fileInput[0].files[0]; // Проверяем, выбран ли файл

    if (!file) {
      UserMessage.showError(globalTranslate.module_phnbk_ImportFromExcelLabel);
      return;
    }

    PbxApi.FilesUploadFile(file, ModulePhoneBookImport.cbResumableUploadFile);
  },

  /**
   * Callback function for resumable file upload.
   * @param {string} action - The action of the upload.
   * @param {object} params - Additional parameters for the upload.
   */
  cbResumableUploadFile: function cbResumableUploadFile(action, params) {
    switch (action) {
      case 'fileSuccess':
        ModulePhoneBookImport.checkStatusFileMerging(params.response);
        break;

      case 'uploadStart':
        ModulePhoneBookImport.$importButton.addClass('loading');
        ModulePhoneBookImport.$progressBar.show();
        ModulePhoneBookImport.$progressBarLabel.text(globalTranslate.module_phnbk_UploadInProgress);
        break;

      case 'progress':
        ModulePhoneBookImport.$progressBar.progress({
          percent: parseInt(params.percent, 10)
        });
        break;

      case 'error':
        ModulePhoneBookImport.$importButton.removeClass('loading');
        ModulePhoneBookImport.$progressBarLabel.text(globalTranslate.module_phnbk_UploadError);
        UserMessage.showMultiString(globalTranslate.module_phnbk_UploadError);
        break;

      default:
    }
  },

  /**
   * Checks the status of the file merging process.
   * @param {string} response - The response from the /pbxcore/api/upload/status function.
   */
  checkStatusFileMerging: function checkStatusFileMerging(response) {
    if (response === undefined || PbxApi.tryParseJSON(response) === false) {
      UserMessage.showMultiString("".concat(globalTranslate.module_phnbk_UploadError));
      return;
    }

    var json = JSON.parse(response);

    if (json === undefined || json.data === undefined) {
      UserMessage.showMultiString("".concat(globalTranslate.module_phnbk_UploadError));
      return;
    }

    var fileID = json.data.upload_id;
    var filePath = json.data.filename; // Wait until system glued all parts of file

    mergingCheckWorker.initialize(fileID, filePath);
  },
  importExcelFile: function importExcelFile(uploadedFilePath) {
    $.api({
      url: ModulePhoneBookImport.importFromExcelAJAXUrl,
      method: 'POST',
      data: {
        uploadedFilePath: uploadedFilePath
      },
      beforeSend: function beforeSend(xhr) {
        xhr.setRequestHeader('X-Processor-Timeout', '600');
      },
      onSuccess: function onSuccess(response) {
        ModulePhoneBookImport.$importButton.removeClass('loading');
        window.location.reload(); // Обновляем страницу после успешного импорта
      },
      onFailure: function onFailure(response) {
        ModulePhoneBookImport.$importButton.removeClass('loading');
        UserMessage.showMultiString(response.message || globalTranslate.module_phnbk_GeneraLFileUploadError);
      }
    });
  }
};
$(document).ready(function () {
  ModulePhoneBookImport.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9tb2R1bGUtcGhvbmVib29rLWltcG9ydC5qcyJdLCJuYW1lcyI6WyJNb2R1bGVQaG9uZUJvb2tJbXBvcnQiLCIkcHJvZ3Jlc3NCYXIiLCIkIiwiJGltcG9ydEJ1dHRvbiIsIiRmaWxlSW5wdXQiLCJpbXBvcnRGcm9tRXhjZWxBSkFYVXJsIiwiQ29uZmlnIiwicGJ4VXJsIiwiaW5pdGlhbGl6ZSIsIm9uIiwidXBsb2FkRXhjZWxGaWxlIiwiZmlsZSIsImZpbGVzIiwiVXNlck1lc3NhZ2UiLCJzaG93RXJyb3IiLCJnbG9iYWxUcmFuc2xhdGUiLCJtb2R1bGVfcGhuYmtfSW1wb3J0RnJvbUV4Y2VsTGFiZWwiLCJQYnhBcGkiLCJGaWxlc1VwbG9hZEZpbGUiLCJjYlJlc3VtYWJsZVVwbG9hZEZpbGUiLCJhY3Rpb24iLCJwYXJhbXMiLCJjaGVja1N0YXR1c0ZpbGVNZXJnaW5nIiwicmVzcG9uc2UiLCJhZGRDbGFzcyIsInNob3ciLCIkcHJvZ3Jlc3NCYXJMYWJlbCIsInRleHQiLCJtb2R1bGVfcGhuYmtfVXBsb2FkSW5Qcm9ncmVzcyIsInByb2dyZXNzIiwicGVyY2VudCIsInBhcnNlSW50IiwicmVtb3ZlQ2xhc3MiLCJtb2R1bGVfcGhuYmtfVXBsb2FkRXJyb3IiLCJzaG93TXVsdGlTdHJpbmciLCJ1bmRlZmluZWQiLCJ0cnlQYXJzZUpTT04iLCJqc29uIiwiSlNPTiIsInBhcnNlIiwiZGF0YSIsImZpbGVJRCIsInVwbG9hZF9pZCIsImZpbGVQYXRoIiwiZmlsZW5hbWUiLCJtZXJnaW5nQ2hlY2tXb3JrZXIiLCJpbXBvcnRFeGNlbEZpbGUiLCJ1cGxvYWRlZEZpbGVQYXRoIiwiYXBpIiwidXJsIiwibWV0aG9kIiwiYmVmb3JlU2VuZCIsInhociIsInNldFJlcXVlc3RIZWFkZXIiLCJvblN1Y2Nlc3MiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInJlbG9hZCIsIm9uRmFpbHVyZSIsIm1lc3NhZ2UiLCJtb2R1bGVfcGhuYmtfR2VuZXJhTEZpbGVVcGxvYWRFcnJvciIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFDQTtBQUVBLElBQU1BLHFCQUFxQixHQUFHO0FBQzFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFlBQVksRUFBRUMsQ0FBQyxDQUFDLHNCQUFELENBTFc7O0FBTzFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGFBQWEsRUFBRUQsQ0FBQyxDQUFDLDJCQUFELENBWFU7O0FBYTFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lFLEVBQUFBLFVBQVUsRUFBRUYsQ0FBQyxDQUFDLE9BQUQsQ0FqQmE7QUFtQjFCRyxFQUFBQSxzQkFBc0IsWUFBS0MsTUFBTSxDQUFDQyxNQUFaLDZEQW5CSTtBQXFCMUJDLEVBQUFBLFVBckIwQix3QkFxQmI7QUFDVDtBQUNBUixJQUFBQSxxQkFBcUIsQ0FBQ0csYUFBdEIsQ0FBb0NNLEVBQXBDLENBQXVDLE9BQXZDLEVBQWdEVCxxQkFBcUIsQ0FBQ1UsZUFBdEU7QUFDSCxHQXhCeUI7O0FBMEIxQjtBQUNKO0FBQ0E7QUFDSUEsRUFBQUEsZUE3QjBCLDZCQTZCUjtBQUNkLFFBQU1DLElBQUksR0FBR1gscUJBQXFCLENBQUNJLFVBQXRCLENBQWlDLENBQWpDLEVBQW9DUSxLQUFwQyxDQUEwQyxDQUExQyxDQUFiLENBRGMsQ0FHZDs7QUFDQSxRQUFJLENBQUNELElBQUwsRUFBVztBQUNQRSxNQUFBQSxXQUFXLENBQUNDLFNBQVosQ0FBc0JDLGVBQWUsQ0FBQ0MsaUNBQXRDO0FBQ0E7QUFDSDs7QUFFREMsSUFBQUEsTUFBTSxDQUFDQyxlQUFQLENBQXVCUCxJQUF2QixFQUE2QlgscUJBQXFCLENBQUNtQixxQkFBbkQ7QUFDSCxHQXZDeUI7O0FBd0MxQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lBLEVBQUFBLHFCQTdDMEIsaUNBNkNKQyxNQTdDSSxFQTZDSUMsTUE3Q0osRUE2Q1k7QUFDbEMsWUFBUUQsTUFBUjtBQUNJLFdBQUssYUFBTDtBQUNJcEIsUUFBQUEscUJBQXFCLENBQUNzQixzQkFBdEIsQ0FBNkNELE1BQU0sQ0FBQ0UsUUFBcEQ7QUFDQTs7QUFDSixXQUFLLGFBQUw7QUFDSXZCLFFBQUFBLHFCQUFxQixDQUFDRyxhQUF0QixDQUFvQ3FCLFFBQXBDLENBQTZDLFNBQTdDO0FBQ0F4QixRQUFBQSxxQkFBcUIsQ0FBQ0MsWUFBdEIsQ0FBbUN3QixJQUFuQztBQUNBekIsUUFBQUEscUJBQXFCLENBQUMwQixpQkFBdEIsQ0FBd0NDLElBQXhDLENBQTZDWixlQUFlLENBQUNhLDZCQUE3RDtBQUNBOztBQUNKLFdBQUssVUFBTDtBQUNJNUIsUUFBQUEscUJBQXFCLENBQUNDLFlBQXRCLENBQW1DNEIsUUFBbkMsQ0FBNEM7QUFDeENDLFVBQUFBLE9BQU8sRUFBRUMsUUFBUSxDQUFDVixNQUFNLENBQUNTLE9BQVIsRUFBaUIsRUFBakI7QUFEdUIsU0FBNUM7QUFHQTs7QUFDSixXQUFLLE9BQUw7QUFDSTlCLFFBQUFBLHFCQUFxQixDQUFDRyxhQUF0QixDQUFvQzZCLFdBQXBDLENBQWdELFNBQWhEO0FBQ0FoQyxRQUFBQSxxQkFBcUIsQ0FBQzBCLGlCQUF0QixDQUF3Q0MsSUFBeEMsQ0FBNkNaLGVBQWUsQ0FBQ2tCLHdCQUE3RDtBQUNBcEIsUUFBQUEsV0FBVyxDQUFDcUIsZUFBWixDQUE0Qm5CLGVBQWUsQ0FBQ2tCLHdCQUE1QztBQUNBOztBQUNKO0FBbkJKO0FBcUJILEdBbkV5Qjs7QUFvRTFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lYLEVBQUFBLHNCQXhFMEIsa0NBd0VIQyxRQXhFRyxFQXdFTztBQUM3QixRQUFJQSxRQUFRLEtBQUtZLFNBQWIsSUFBMEJsQixNQUFNLENBQUNtQixZQUFQLENBQW9CYixRQUFwQixNQUFrQyxLQUFoRSxFQUF1RTtBQUNuRVYsTUFBQUEsV0FBVyxDQUFDcUIsZUFBWixXQUErQm5CLGVBQWUsQ0FBQ2tCLHdCQUEvQztBQUNBO0FBQ0g7O0FBQ0QsUUFBTUksSUFBSSxHQUFHQyxJQUFJLENBQUNDLEtBQUwsQ0FBV2hCLFFBQVgsQ0FBYjs7QUFDQSxRQUFJYyxJQUFJLEtBQUtGLFNBQVQsSUFBc0JFLElBQUksQ0FBQ0csSUFBTCxLQUFjTCxTQUF4QyxFQUFtRDtBQUMvQ3RCLE1BQUFBLFdBQVcsQ0FBQ3FCLGVBQVosV0FBK0JuQixlQUFlLENBQUNrQix3QkFBL0M7QUFDQTtBQUNIOztBQUNELFFBQU1RLE1BQU0sR0FBR0osSUFBSSxDQUFDRyxJQUFMLENBQVVFLFNBQXpCO0FBQ0EsUUFBTUMsUUFBUSxHQUFHTixJQUFJLENBQUNHLElBQUwsQ0FBVUksUUFBM0IsQ0FYNkIsQ0FZN0I7O0FBQ0FDLElBQUFBLGtCQUFrQixDQUFDckMsVUFBbkIsQ0FBOEJpQyxNQUE5QixFQUFzQ0UsUUFBdEM7QUFDSCxHQXRGeUI7QUF1RjFCRyxFQUFBQSxlQXZGMEIsMkJBdUZWQyxnQkF2RlUsRUF1Rk87QUFDN0I3QyxJQUFBQSxDQUFDLENBQUM4QyxHQUFGLENBQU07QUFDRkMsTUFBQUEsR0FBRyxFQUFFakQscUJBQXFCLENBQUNLLHNCQUR6QjtBQUVGNkMsTUFBQUEsTUFBTSxFQUFFLE1BRk47QUFHRlYsTUFBQUEsSUFBSSxFQUFFO0FBQUNPLFFBQUFBLGdCQUFnQixFQUFDQTtBQUFsQixPQUhKO0FBSUZJLE1BQUFBLFVBSkUsc0JBSVNDLEdBSlQsRUFJYztBQUNaQSxRQUFBQSxHQUFHLENBQUNDLGdCQUFKLENBQXFCLHFCQUFyQixFQUE0QyxLQUE1QztBQUNILE9BTkM7QUFPRkMsTUFBQUEsU0FQRSxxQkFPUS9CLFFBUFIsRUFPa0I7QUFDaEJ2QixRQUFBQSxxQkFBcUIsQ0FBQ0csYUFBdEIsQ0FBb0M2QixXQUFwQyxDQUFnRCxTQUFoRDtBQUNBdUIsUUFBQUEsTUFBTSxDQUFDQyxRQUFQLENBQWdCQyxNQUFoQixHQUZnQixDQUVVO0FBQzdCLE9BVkM7QUFXRkMsTUFBQUEsU0FYRSxxQkFXUW5DLFFBWFIsRUFXa0I7QUFDaEJ2QixRQUFBQSxxQkFBcUIsQ0FBQ0csYUFBdEIsQ0FBb0M2QixXQUFwQyxDQUFnRCxTQUFoRDtBQUNBbkIsUUFBQUEsV0FBVyxDQUFDcUIsZUFBWixDQUE0QlgsUUFBUSxDQUFDb0MsT0FBVCxJQUFvQjVDLGVBQWUsQ0FBQzZDLG1DQUFoRTtBQUNIO0FBZEMsS0FBTjtBQWdCSDtBQXhHeUIsQ0FBOUI7QUEyR0ExRCxDQUFDLENBQUMyRCxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCOUQsRUFBQUEscUJBQXFCLENBQUNRLFVBQXRCO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI0IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG4vKiBnbG9iYWwgQ29uZmlnLCBnbG9iYWxUcmFuc2xhdGUsIFVzZXJNZXNzYWdlLCBQYnhBcGksIG1lcmdpbmdDaGVja1dvcmtlciAqL1xuXG5jb25zdCBNb2R1bGVQaG9uZUJvb2tJbXBvcnQgPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHByb2dyZXNzIGJhci5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRwcm9ncmVzc0JhcjogJCgnI3VwbG9hZC1wcm9ncmVzcy1iYXInKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBpbXBvcnQgYnV0dG9uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkaW1wb3J0QnV0dG9uOiAkKCcjaW1wb3J0LWZyb20tZXhjZWwtYnV0dG9uJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZmlsZSBpbnB1dCBmaWVsZC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmaWxlSW5wdXQ6ICQoJyNmaWxlJyksXG4gICAgXG4gICAgaW1wb3J0RnJvbUV4Y2VsQUpBWFVybDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbW9kdWxlcy9tb2R1bGUtcGhvbmUtYm9vay9pbXBvcnQtZnJvbS1leGNlbGAsXG5cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyDQmNC90LjRhtC40LDQu9C40LfQuNGA0YPQtdC8INC90LDQttCw0YLQuNC1INC90LAg0LrQvdC+0L/QutGDXG4gICAgICAgIE1vZHVsZVBob25lQm9va0ltcG9ydC4kaW1wb3J0QnV0dG9uLm9uKCdjbGljaycsIE1vZHVsZVBob25lQm9va0ltcG9ydC51cGxvYWRFeGNlbEZpbGUpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiDQpNGD0L3QutGG0LjRjyDQuNC80L/QvtGA0YLQsCDRhNCw0LnQu9CwINGH0LXRgNC10LcgUE9TVC3Qt9Cw0L/RgNC+0YEg0YEg0LjRgdC/0L7Qu9GM0LfQvtCy0LDQvdC40LXQvCBTZW1hbnRpYyBVSSBBUEkg0LggRm9ybURhdGFcbiAgICAgKi9cbiAgICB1cGxvYWRFeGNlbEZpbGUoKSB7XG4gICAgICAgIGNvbnN0IGZpbGUgPSBNb2R1bGVQaG9uZUJvb2tJbXBvcnQuJGZpbGVJbnB1dFswXS5maWxlc1swXTtcblxuICAgICAgICAvLyDQn9GA0L7QstC10YDRj9C10LwsINCy0YvQsdGA0LDQvSDQu9C4INGE0LDQudC7XG4gICAgICAgIGlmICghZmlsZSkge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS5tb2R1bGVfcGhuYmtfSW1wb3J0RnJvbUV4Y2VsTGFiZWwpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgUGJ4QXBpLkZpbGVzVXBsb2FkRmlsZShmaWxlLCBNb2R1bGVQaG9uZUJvb2tJbXBvcnQuY2JSZXN1bWFibGVVcGxvYWRGaWxlKTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGZvciByZXN1bWFibGUgZmlsZSB1cGxvYWQuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGFjdGlvbiAtIFRoZSBhY3Rpb24gb2YgdGhlIHVwbG9hZC5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcGFyYW1zIC0gQWRkaXRpb25hbCBwYXJhbWV0ZXJzIGZvciB0aGUgdXBsb2FkLlxuICAgICAqL1xuICAgIGNiUmVzdW1hYmxlVXBsb2FkRmlsZShhY3Rpb24sIHBhcmFtcykge1xuICAgICAgICBzd2l0Y2ggKGFjdGlvbikge1xuICAgICAgICAgICAgY2FzZSAnZmlsZVN1Y2Nlc3MnOlxuICAgICAgICAgICAgICAgIE1vZHVsZVBob25lQm9va0ltcG9ydC5jaGVja1N0YXR1c0ZpbGVNZXJnaW5nKHBhcmFtcy5yZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICd1cGxvYWRTdGFydCc6XG4gICAgICAgICAgICAgICAgTW9kdWxlUGhvbmVCb29rSW1wb3J0LiRpbXBvcnRCdXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICBNb2R1bGVQaG9uZUJvb2tJbXBvcnQuJHByb2dyZXNzQmFyLnNob3coKTtcbiAgICAgICAgICAgICAgICBNb2R1bGVQaG9uZUJvb2tJbXBvcnQuJHByb2dyZXNzQmFyTGFiZWwudGV4dChnbG9iYWxUcmFuc2xhdGUubW9kdWxlX3BobmJrX1VwbG9hZEluUHJvZ3Jlc3MpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAncHJvZ3Jlc3MnOlxuICAgICAgICAgICAgICAgIE1vZHVsZVBob25lQm9va0ltcG9ydC4kcHJvZ3Jlc3NCYXIucHJvZ3Jlc3Moe1xuICAgICAgICAgICAgICAgICAgICBwZXJjZW50OiBwYXJzZUludChwYXJhbXMucGVyY2VudCwgMTApLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnZXJyb3InOlxuICAgICAgICAgICAgICAgIE1vZHVsZVBob25lQm9va0ltcG9ydC4kaW1wb3J0QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgTW9kdWxlUGhvbmVCb29rSW1wb3J0LiRwcm9ncmVzc0JhckxhYmVsLnRleHQoZ2xvYmFsVHJhbnNsYXRlLm1vZHVsZV9waG5ia19VcGxvYWRFcnJvcik7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGdsb2JhbFRyYW5zbGF0ZS5tb2R1bGVfcGhuYmtfVXBsb2FkRXJyb3IpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgfVxuICAgIH0sXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIHRoZSBzdGF0dXMgb2YgdGhlIGZpbGUgbWVyZ2luZyBwcm9jZXNzLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSAvcGJ4Y29yZS9hcGkvdXBsb2FkL3N0YXR1cyBmdW5jdGlvbi5cbiAgICAgKi9cbiAgICBjaGVja1N0YXR1c0ZpbGVNZXJnaW5nKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZSA9PT0gdW5kZWZpbmVkIHx8IFBieEFwaS50cnlQYXJzZUpTT04ocmVzcG9uc2UpID09PSBmYWxzZSkge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGAke2dsb2JhbFRyYW5zbGF0ZS5tb2R1bGVfcGhuYmtfVXBsb2FkRXJyb3J9YCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QganNvbiA9IEpTT04ucGFyc2UocmVzcG9uc2UpO1xuICAgICAgICBpZiAoanNvbiA9PT0gdW5kZWZpbmVkIHx8IGpzb24uZGF0YSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoYCR7Z2xvYmFsVHJhbnNsYXRlLm1vZHVsZV9waG5ia19VcGxvYWRFcnJvcn1gKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBmaWxlSUQgPSBqc29uLmRhdGEudXBsb2FkX2lkO1xuICAgICAgICBjb25zdCBmaWxlUGF0aCA9IGpzb24uZGF0YS5maWxlbmFtZTtcbiAgICAgICAgLy8gV2FpdCB1bnRpbCBzeXN0ZW0gZ2x1ZWQgYWxsIHBhcnRzIG9mIGZpbGVcbiAgICAgICAgbWVyZ2luZ0NoZWNrV29ya2VyLmluaXRpYWxpemUoZmlsZUlELCBmaWxlUGF0aCk7XG4gICAgfSxcbiAgICBpbXBvcnRFeGNlbEZpbGUodXBsb2FkZWRGaWxlUGF0aCl7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogTW9kdWxlUGhvbmVCb29rSW1wb3J0LmltcG9ydEZyb21FeGNlbEFKQVhVcmwsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHt1cGxvYWRlZEZpbGVQYXRoOnVwbG9hZGVkRmlsZVBhdGh9LFxuICAgICAgICAgICAgYmVmb3JlU2VuZCh4aHIpIHtcbiAgICAgICAgICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcignWC1Qcm9jZXNzb3ItVGltZW91dCcsICc2MDAnKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBNb2R1bGVQaG9uZUJvb2tJbXBvcnQuJGltcG9ydEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTsgLy8g0J7QsdC90L7QstC70Y/QtdC8INGB0YLRgNCw0L3QuNGG0YMg0L/QvtGB0LvQtSDRg9GB0L/QtdGI0L3QvtCz0L4g0LjQvNC/0L7RgNGC0LBcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBNb2R1bGVQaG9uZUJvb2tJbXBvcnQuJGltcG9ydEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlIHx8IGdsb2JhbFRyYW5zbGF0ZS5tb2R1bGVfcGhuYmtfR2VuZXJhTEZpbGVVcGxvYWRFcnJvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbn07XG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBNb2R1bGVQaG9uZUJvb2tJbXBvcnQuaW5pdGlhbGl6ZSgpO1xufSk7Il19