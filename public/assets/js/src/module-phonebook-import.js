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

const ModulePhoneBookImport = {
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
     * jQuery object for the progress bar label.
     * @type {jQuery}
     */
    $progressBarLabel: $('#upload-progress-bar-label'),

    /**
     * jQuery object for the file input field.
     * @type {jQuery}
     */
    $fileInput: $('#file'),
    
    importFromExcelAJAXUrl: `${Config.pbxUrl}/pbxcore/api/modules/ModulePhoneBook/import-from-excel`,

    initialize() {

        // Trigger file input click when clicking on text input or button
        $('input:text, .select-file-for-upload', '.ui.action.input').on('click', (e) => {
            $('input:file', $(e.target).parents()).click();
        });

        // Update text input value when selecting a file
        $('input:file', '.ui.action.input').on('change', (e) => {
            if (e.target.files[0] !== undefined) {
                const filename = e.target.files[0].name;
                $('input:text', $(e.target).parent()).val(filename);
                ModulePhoneBookImport.$importButton.removeClass('disabled');
            }
        });

        // Инициализируем нажатие на кнопку
        ModulePhoneBookImport.$importButton.on('click', ModulePhoneBookImport.uploadExcelFile);
    },

    /**
     * Функция импорта файла через POST-запрос с использованием Semantic UI API и FormData
     */
    uploadExcelFile() {
        const file = $('input:file')[0].files[0];

        // Проверяем, выбран ли файл
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
    cbResumableUploadFile(action, params) {
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
                    percent: parseInt(params.percent, 10),
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
    checkStatusFileMerging(response) {
        if (response === undefined || PbxApi.tryParseJSON(response) === false) {
            UserMessage.showMultiString(`${globalTranslate.module_phnbk_UploadError}`);
            return;
        }
        const json = JSON.parse(response);
        if (json === undefined || json.data === undefined) {
            UserMessage.showMultiString(`${globalTranslate.module_phnbk_UploadError}`);
            return;
        }
        const fileID = json.data.upload_id;
        const filePath = json.data.filename;
        // Wait until system glued all parts of file
        mergingCheckWorker.initialize(fileID, filePath);
    },
    importExcelFile(uploadedFilePath){
        ModulePhoneBookImport.$progressBarLabel.text(globalTranslate.module_phnbk_RecognitionOnProgress);
        $.api({
            url: ModulePhoneBookImport.importFromExcelAJAXUrl,
            method: 'POST',
            on: 'now',
            data: {uploadedFilePath:uploadedFilePath},
            beforeXHR(xhr) {
                xhr.setRequestHeader('X-Processor-Timeout', '600');
            },
            successTest: PbxApi.successTest,
            onSuccess(response) {
                ModulePhoneBookImport.$progressBarLabel.text(globalTranslate.module_phnbk_RecognitionFinished);
                ModulePhoneBookImport.$importButton.removeClass('loading');
                window.location.reload(); // Обновляем страницу после успешного импорта
            },
            onFailure(response) {
                ModulePhoneBookImport.$importButton.removeClass('loading');
                UserMessage.showMultiString(response.messages || globalTranslate.module_phnbk_GeneraLFileUploadError);
            }
        });
    }
};

$(document).ready(() => {
    ModulePhoneBookImport.initialize();
});