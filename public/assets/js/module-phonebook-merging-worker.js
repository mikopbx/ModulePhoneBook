"use strict";

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2021 Alexey Portnov and Nikolay Beketov
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

/* global PbxApi, globalTranslate, UserMessage, ModulePhoneBookImport */

/**
 * Worker object for checking file merging status.
 *
 * @module mergingCheckWorker
 */
var mergingCheckWorker = {
  /**
   * Time in milliseconds before fetching new request.
   * @type {number}
   */
  timeOut: 3000,

  /**
   * The id of the timer function for the worker.
   * @type {number}
   */
  timeOutHandle: 0,

  /**
   * Number of errors encountered during the merging process.
   * @type {number}
   */
  errorCounts: 0,

  /**
   * jQuery object for the progress bar label.
   * @type {jQuery}
   */
  $progressBarLabel: $('#upload-progress-bar-label'),

  /**
   * The ID of the file being merged.
   * @type {string|null}
   */
  fileID: null,

  /**
   * The path of the file being merged.
   * @type {string}
   */
  filePath: '',

  /**
   * Initializes the merging check worker.
   * @param {string} fileID - The ID of the file being merged.
   * @param {string} filePath - The path of the file being merged.
   */
  initialize: function initialize(fileID, filePath) {
    mergingCheckWorker.fileID = fileID;
    mergingCheckWorker.filePath = filePath;
    mergingCheckWorker.restartWorker(fileID);
  },

  /**
   * Restarts the merging check worker.
   */
  restartWorker: function restartWorker() {
    window.clearTimeout(mergingCheckWorker.timeoutHandle);
    mergingCheckWorker.worker();
  },

  /**
   * Worker function for checking file merging status.
   */
  worker: function worker() {
    PbxApi.FilesGetStatusUploadFile(mergingCheckWorker.fileID, mergingCheckWorker.cbAfterResponse);
    mergingCheckWorker.timeoutHandle = window.setTimeout(mergingCheckWorker.worker, mergingCheckWorker.timeOut);
  },

  /**
   * Callback function after receiving a response from the server.
   * @param {Object} response - The response object from the server.
   */
  cbAfterResponse: function cbAfterResponse(response) {
    if (mergingCheckWorker.errorCounts > 10) {
      ModulePhoneBookImport.$importButton.removeClass('loading');
      mergingCheckWorker.$progressBarLabel.text(globalTranslate.module_phnbk_UploadError);
      UserMessage.showMultiString(globalTranslate.module_phnbk_UploadError);
      window.clearTimeout(mergingCheckWorker.timeoutHandle);
    }

    if (response === undefined || Object.keys(response).length === 0) {
      mergingCheckWorker.errorCounts += 1;
      return;
    }

    if (response.d_status === 'UPLOAD_COMPLETE') {
      mergingCheckWorker.$progressBarLabel.text(globalTranslate.module_phnbk_UploadInProgress);
      ModulePhoneBookImport.importExcelFile(mergingCheckWorker.filePath);
      window.clearTimeout(mergingCheckWorker.timeoutHandle);
    } else if (response.d_status !== undefined) {
      mergingCheckWorker.$progressBarLabel.text(globalTranslate.module_phnbk_UploadInProgress);
      mergingCheckWorker.errorCounts = 0;
    } else {
      mergingCheckWorker.errorCounts += 1;
    }
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9tb2R1bGUtcGhvbmVib29rLW1lcmdpbmctd29ya2VyLmpzIl0sIm5hbWVzIjpbIm1lcmdpbmdDaGVja1dvcmtlciIsInRpbWVPdXQiLCJ0aW1lT3V0SGFuZGxlIiwiZXJyb3JDb3VudHMiLCIkcHJvZ3Jlc3NCYXJMYWJlbCIsIiQiLCJmaWxlSUQiLCJmaWxlUGF0aCIsImluaXRpYWxpemUiLCJyZXN0YXJ0V29ya2VyIiwid2luZG93IiwiY2xlYXJUaW1lb3V0IiwidGltZW91dEhhbmRsZSIsIndvcmtlciIsIlBieEFwaSIsIkZpbGVzR2V0U3RhdHVzVXBsb2FkRmlsZSIsImNiQWZ0ZXJSZXNwb25zZSIsInNldFRpbWVvdXQiLCJyZXNwb25zZSIsIk1vZHVsZVBob25lQm9va0ltcG9ydCIsIiRpbXBvcnRCdXR0b24iLCJyZW1vdmVDbGFzcyIsInRleHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJtb2R1bGVfcGhuYmtfVXBsb2FkRXJyb3IiLCJVc2VyTWVzc2FnZSIsInNob3dNdWx0aVN0cmluZyIsInVuZGVmaW5lZCIsIk9iamVjdCIsImtleXMiLCJsZW5ndGgiLCJkX3N0YXR1cyIsIm1vZHVsZV9waG5ia19VcGxvYWRJblByb2dyZXNzIiwiaW1wb3J0RXhjZWxGaWxlIl0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLGtCQUFrQixHQUFHO0FBRXZCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLE9BQU8sRUFBRSxJQU5jOztBQVF2QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxhQUFhLEVBQUUsQ0FaUTs7QUFjdkI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsV0FBVyxFQUFFLENBbEJVOztBQW9CdkI7QUFDSjtBQUNBO0FBQ0E7QUFD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c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjEgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIFBieEFwaSwgZ2xvYmFsVHJhbnNsYXRlLCBVc2VyTWVzc2FnZSwgTW9kdWxlUGhvbmVCb29rSW1wb3J0ICovXG5cbi8qKlxuICogV29ya2VyIG9iamVjdCBmb3IgY2hlY2tpbmcgZmlsZSBtZXJnaW5nIHN0YXR1cy5cbiAqXG4gKiBAbW9kdWxlIG1lcmdpbmdDaGVja1dvcmtlclxuICovXG5jb25zdCBtZXJnaW5nQ2hlY2tXb3JrZXIgPSB7XG5cbiAgICAvKipcbiAgICAgKiBUaW1lIGluIG1pbGxpc2Vjb25kcyBiZWZvcmUgZmV0Y2hpbmcgbmV3IHJlcXVlc3QuXG4gICAgICogQHR5cGUge251bWJlcn1cbiAgICAgKi9cbiAgICB0aW1lT3V0OiAzMDAwLFxuICAgIFxuICAgIC8qKlxuICAgICAqIFRoZSBpZCBvZiB0aGUgdGltZXIgZnVuY3Rpb24gZm9yIHRoZSB3b3JrZXIuXG4gICAgICogQHR5cGUge251bWJlcn1cbiAgICAgKi9cbiAgICB0aW1lT3V0SGFuZGxlOiAwLFxuXG4gICAgLyoqXG4gICAgICogTnVtYmVyIG9mIGVycm9ycyBlbmNvdW50ZXJlZCBkdXJpbmcgdGhlIG1lcmdpbmcgcHJvY2Vzcy5cbiAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAqL1xuICAgIGVycm9yQ291bnRzOiAwLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHByb2dyZXNzIGJhciBsYWJlbC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRwcm9ncmVzc0JhckxhYmVsOiAkKCcjdXBsb2FkLXByb2dyZXNzLWJhci1sYWJlbCcpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIElEIG9mIHRoZSBmaWxlIGJlaW5nIG1lcmdlZC5cbiAgICAgKiBAdHlwZSB7c3RyaW5nfG51bGx9XG4gICAgICovXG4gICAgZmlsZUlEOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogVGhlIHBhdGggb2YgdGhlIGZpbGUgYmVpbmcgbWVyZ2VkLlxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgZmlsZVBhdGg6ICcnLFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIG1lcmdpbmcgY2hlY2sgd29ya2VyLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlSUQgLSBUaGUgSUQgb2YgdGhlIGZpbGUgYmVpbmcgbWVyZ2VkLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlUGF0aCAtIFRoZSBwYXRoIG9mIHRoZSBmaWxlIGJlaW5nIG1lcmdlZC5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKGZpbGVJRCwgZmlsZVBhdGgpIHtcbiAgICAgICAgbWVyZ2luZ0NoZWNrV29ya2VyLmZpbGVJRCA9IGZpbGVJRDtcbiAgICAgICAgbWVyZ2luZ0NoZWNrV29ya2VyLmZpbGVQYXRoID0gZmlsZVBhdGg7XG4gICAgICAgIG1lcmdpbmdDaGVja1dvcmtlci5yZXN0YXJ0V29ya2VyKGZpbGVJRCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlc3RhcnRzIHRoZSBtZXJnaW5nIGNoZWNrIHdvcmtlci5cbiAgICAgKi9cbiAgICByZXN0YXJ0V29ya2VyKCkge1xuICAgICAgICB3aW5kb3cuY2xlYXJUaW1lb3V0KG1lcmdpbmdDaGVja1dvcmtlci50aW1lb3V0SGFuZGxlKTtcbiAgICAgICAgbWVyZ2luZ0NoZWNrV29ya2VyLndvcmtlcigpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBXb3JrZXIgZnVuY3Rpb24gZm9yIGNoZWNraW5nIGZpbGUgbWVyZ2luZyBzdGF0dXMuXG4gICAgICovXG4gICAgd29ya2VyKCkge1xuICAgICAgICBQYnhBcGkuRmlsZXNHZXRTdGF0dXNVcGxvYWRGaWxlKG1lcmdpbmdDaGVja1dvcmtlci5maWxlSUQsIG1lcmdpbmdDaGVja1dvcmtlci5jYkFmdGVyUmVzcG9uc2UpO1xuICAgICAgICBtZXJnaW5nQ2hlY2tXb3JrZXIudGltZW91dEhhbmRsZSA9IHdpbmRvdy5zZXRUaW1lb3V0KFxuICAgICAgICAgICAgbWVyZ2luZ0NoZWNrV29ya2VyLndvcmtlcixcbiAgICAgICAgICAgIG1lcmdpbmdDaGVja1dvcmtlci50aW1lT3V0LFxuICAgICAgICApO1xuICAgIH0sXG5cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGFmdGVyIHJlY2VpdmluZyBhIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlci5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2Ugb2JqZWN0IGZyb20gdGhlIHNlcnZlci5cbiAgICAgKi9cbiAgICBjYkFmdGVyUmVzcG9uc2UocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKG1lcmdpbmdDaGVja1dvcmtlci5lcnJvckNvdW50cyA+IDEwKSB7XG4gICAgICAgICAgICBNb2R1bGVQaG9uZUJvb2tJbXBvcnQuJGltcG9ydEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgbWVyZ2luZ0NoZWNrV29ya2VyLiRwcm9ncmVzc0JhckxhYmVsLnRleHQoZ2xvYmFsVHJhbnNsYXRlLm1vZHVsZV9waG5ia19VcGxvYWRFcnJvcik7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoZ2xvYmFsVHJhbnNsYXRlLm1vZHVsZV9waG5ia19VcGxvYWRFcnJvcik7XG4gICAgICAgICAgICB3aW5kb3cuY2xlYXJUaW1lb3V0KG1lcmdpbmdDaGVja1dvcmtlci50aW1lb3V0SGFuZGxlKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzcG9uc2UgPT09IHVuZGVmaW5lZCB8fCBPYmplY3Qua2V5cyhyZXNwb25zZSkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBtZXJnaW5nQ2hlY2tXb3JrZXIuZXJyb3JDb3VudHMgKz0gMTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzcG9uc2UuZF9zdGF0dXMgPT09ICdVUExPQURfQ09NUExFVEUnKSB7XG4gICAgICAgICAgICBtZXJnaW5nQ2hlY2tXb3JrZXIuJHByb2dyZXNzQmFyTGFiZWwudGV4dChnbG9iYWxUcmFuc2xhdGUubW9kdWxlX3BobmJrX1VwbG9hZEluUHJvZ3Jlc3MpO1xuICAgICAgICAgICAgTW9kdWxlUGhvbmVCb29rSW1wb3J0LmltcG9ydEV4Y2VsRmlsZShtZXJnaW5nQ2hlY2tXb3JrZXIuZmlsZVBhdGgpO1xuICAgICAgICAgICAgd2luZG93LmNsZWFyVGltZW91dChtZXJnaW5nQ2hlY2tXb3JrZXIudGltZW91dEhhbmRsZSk7XG4gICAgICAgIH0gZWxzZSBpZiAocmVzcG9uc2UuZF9zdGF0dXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgbWVyZ2luZ0NoZWNrV29ya2VyLiRwcm9ncmVzc0JhckxhYmVsLnRleHQoZ2xvYmFsVHJhbnNsYXRlLm1vZHVsZV9waG5ia19VcGxvYWRJblByb2dyZXNzKTtcbiAgICAgICAgICAgIG1lcmdpbmdDaGVja1dvcmtlci5lcnJvckNvdW50cyA9IDA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBtZXJnaW5nQ2hlY2tXb3JrZXIuZXJyb3JDb3VudHMgKz0gMTtcbiAgICAgICAgfVxuICAgIH0sXG59OyJdfQ==