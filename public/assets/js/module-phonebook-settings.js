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

/* global globalRootUrl, globalTranslate,
SemanticLocalization, UserMessage, InputMaskPatterns */
var ModulePhoneBookSettings = {
  $disableInputMaskToggle: $('#disable-input-mask'),
  $deleteAllRecordsButton: $('#delete-all-records'),
  $deleteAllModal: $('#delete-all-modal-form'),
  deleteAllRecordsAJAXUrl: "".concat(globalRootUrl, "module-phone-book/module-phone-book/deleteAllRecords"),
  disableInputMaskAJAXUrl: "".concat(globalRootUrl, "module-phone-book/module-phone-book/toggleDisableInputMask"),

  /**
   * Initialize the settings module for the phonebook.
   * It sets up the event listeners for toggling input masks and deleting all records.
   */
  initialize: function initialize() {
    // Hide the delete confirmation modal initially
    ModulePhoneBookSettings.$deleteAllModal.modal('hide'); // Set up the checkbox for disabling/enabling the input mask

    ModulePhoneBookSettings.$disableInputMaskToggle.checkbox({
      change: ModulePhoneBookSettings.onChangeInputMaskToggle
    }); // Attach event listener for the "Delete All Records" button

    ModulePhoneBookSettings.$deleteAllRecordsButton.on('click', function () {
      ModulePhoneBookSettings.deleteAllRecords();
    });
  },

  /**
   * Handle the deletion of all records.
   * Displays a confirmation modal, and if approved, sends a request to delete all phonebook records.
   */
  deleteAllRecords: function deleteAllRecords() {
    ModulePhoneBookSettings.$deleteAllModal.modal({
      closable: false,
      // Prevent closing the modal without user action
      onDeny: function onDeny() {
        return true; // Allows modal to close on "Cancel"
      },
      onApprove: function onApprove() {
        // On approval, send a request to delete all records
        $.api({
          url: ModulePhoneBookSettings.deleteAllRecordsAJAXUrl,
          on: 'now',
          method: 'POST',
          successTest: PbxApi.successTest,
          onSuccess: function onSuccess(response) {
            // Reload the page after successful deletion
            window.location.reload();
          },
          onFailure: function onFailure(response) {
            // Show error message if deletion fails
            UserMessage.showMultiString(response.messages);
          }
        });
        return true;
      }
    }).modal('show'); // Display the confirmation modal
  },

  /**
   * Handle the toggle of the input mask.
   * Sends a request to update the setting for enabling or disabling input masks.
   */
  onChangeInputMaskToggle: function onChangeInputMaskToggle() {
    var currentState = ModulePhoneBookSettings.$disableInputMaskToggle.checkbox('is checked'); // Send request to toggle the input mask setting

    $.api({
      url: ModulePhoneBookSettings.disableInputMaskAJAXUrl,
      on: 'now',
      method: 'POST',
      data: {
        disableInputMask: currentState
      },
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        // Reload the page after successful update
        window.location.reload();
      },
      onFailure: function onFailure(response) {
        // Show error message if the update fails
        UserMessage.showMultiString(response.messages);
      }
    });
    return true;
  }
}; // Initialize the settings module when the document is ready

$(document).ready(function () {
  ModulePhoneBookSettings.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9tb2R1bGUtcGhvbmVib29rLXNldHRpbmdzLmpzIl0sIm5hbWVzIjpbIk1vZHVsZVBob25lQm9va1NldHRpbmdzIiwiJGRpc2FibGVJbnB1dE1hc2tUb2dnbGUiLCIkIiwiJGRlbGV0ZUFsbFJlY29yZHNCdXR0b24iLCIkZGVsZXRlQWxsTW9kYWwiLCJkZWxldGVBbGxSZWNvcmRzQUpBWFVybCIsImdsb2JhbFJvb3RVcmwiLCJkaXNhYmxlSW5wdXRNYXNrQUpBWFVybCIsImluaXRpYWxpemUiLCJtb2RhbCIsImNoZWNrYm94IiwiY2hhbmdlIiwib25DaGFuZ2VJbnB1dE1hc2tUb2dnbGUiLCJvbiIsImRlbGV0ZUFsbFJlY29yZHMiLCJjbG9zYWJsZSIsIm9uRGVueSIsIm9uQXBwcm92ZSIsImFwaSIsInVybCIsIm1ldGhvZCIsInN1Y2Nlc3NUZXN0IiwiUGJ4QXBpIiwib25TdWNjZXNzIiwicmVzcG9uc2UiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInJlbG9hZCIsIm9uRmFpbHVyZSIsIlVzZXJNZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwibWVzc2FnZXMiLCJjdXJyZW50U3RhdGUiLCJkYXRhIiwiZGlzYWJsZUlucHV0TWFzayIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBRUEsSUFBTUEsdUJBQXVCLEdBQUc7QUFDNUJDLEVBQUFBLHVCQUF1QixFQUFFQyxDQUFDLENBQUMscUJBQUQsQ0FERTtBQUU1QkMsRUFBQUEsdUJBQXVCLEVBQUVELENBQUMsQ0FBQyxxQkFBRCxDQUZFO0FBRzVCRSxFQUFBQSxlQUFlLEVBQUVGLENBQUMsQ0FBQyx3QkFBRCxDQUhVO0FBSTVCRyxFQUFBQSx1QkFBdUIsWUFBS0MsYUFBTCx5REFKSztBQUs1QkMsRUFBQUEsdUJBQXVC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bmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNCBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLFxuU2VtYW50aWNMb2NhbGl6YXRpb24sIFVzZXJNZXNzYWdlLCBJbnB1dE1hc2tQYXR0ZXJucyAqL1xuXG5jb25zdCBNb2R1bGVQaG9uZUJvb2tTZXR0aW5ncyA9IHtcbiAgICAkZGlzYWJsZUlucHV0TWFza1RvZ2dsZTogJCgnI2Rpc2FibGUtaW5wdXQtbWFzaycpLFxuICAgICRkZWxldGVBbGxSZWNvcmRzQnV0dG9uOiAkKCcjZGVsZXRlLWFsbC1yZWNvcmRzJyksXG4gICAgJGRlbGV0ZUFsbE1vZGFsOiAkKCcjZGVsZXRlLWFsbC1tb2RhbC1mb3JtJyksXG4gICAgZGVsZXRlQWxsUmVjb3Jkc0FKQVhVcmw6IGAke2dsb2JhbFJvb3RVcmx9bW9kdWxlLXBob25lLWJvb2svbW9kdWxlLXBob25lLWJvb2svZGVsZXRlQWxsUmVjb3Jkc2AsXG4gICAgZGlzYWJsZUlucHV0TWFza0FKQVhVcmw6IGAke2dsb2JhbFJvb3RVcmx9bW9kdWxlLXBob25lLWJvb2svbW9kdWxlLXBob25lLWJvb2svdG9nZ2xlRGlzYWJsZUlucHV0TWFza2AsXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBzZXR0aW5ncyBtb2R1bGUgZm9yIHRoZSBwaG9uZWJvb2suXG4gICAgICogSXQgc2V0cyB1cCB0aGUgZXZlbnQgbGlzdGVuZXJzIGZvciB0b2dnbGluZyBpbnB1dCBtYXNrcyBhbmQgZGVsZXRpbmcgYWxsIHJlY29yZHMuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gSGlkZSB0aGUgZGVsZXRlIGNvbmZpcm1hdGlvbiBtb2RhbCBpbml0aWFsbHlcbiAgICAgICAgTW9kdWxlUGhvbmVCb29rU2V0dGluZ3MuJGRlbGV0ZUFsbE1vZGFsLm1vZGFsKCdoaWRlJyk7XG5cbiAgICAgICAgLy8gU2V0IHVwIHRoZSBjaGVja2JveCBmb3IgZGlzYWJsaW5nL2VuYWJsaW5nIHRoZSBpbnB1dCBtYXNrXG4gICAgICAgIE1vZHVsZVBob25lQm9va1NldHRpbmdzLiRkaXNhYmxlSW5wdXRNYXNrVG9nZ2xlLmNoZWNrYm94KHtcbiAgICAgICAgICAgIGNoYW5nZTogTW9kdWxlUGhvbmVCb29rU2V0dGluZ3Mub25DaGFuZ2VJbnB1dE1hc2tUb2dnbGVcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQXR0YWNoIGV2ZW50IGxpc3RlbmVyIGZvciB0aGUgXCJEZWxldGUgQWxsIFJlY29yZHNcIiBidXR0b25cbiAgICAgICAgTW9kdWxlUGhvbmVCb29rU2V0dGluZ3MuJGRlbGV0ZUFsbFJlY29yZHNCdXR0b24ub24oJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgTW9kdWxlUGhvbmVCb29rU2V0dGluZ3MuZGVsZXRlQWxsUmVjb3JkcygpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIHRoZSBkZWxldGlvbiBvZiBhbGwgcmVjb3Jkcy5cbiAgICAgKiBEaXNwbGF5cyBhIGNvbmZpcm1hdGlvbiBtb2RhbCwgYW5kIGlmIGFwcHJvdmVkLCBzZW5kcyBhIHJlcXVlc3QgdG8gZGVsZXRlIGFsbCBwaG9uZWJvb2sgcmVjb3Jkcy5cbiAgICAgKi9cbiAgICBkZWxldGVBbGxSZWNvcmRzKCkge1xuICAgICAgICBNb2R1bGVQaG9uZUJvb2tTZXR0aW5ncy4kZGVsZXRlQWxsTW9kYWxcbiAgICAgICAgICAgIC5tb2RhbCh7XG4gICAgICAgICAgICAgICAgY2xvc2FibGU6IGZhbHNlLCAvLyBQcmV2ZW50IGNsb3NpbmcgdGhlIG1vZGFsIHdpdGhvdXQgdXNlciBhY3Rpb25cbiAgICAgICAgICAgICAgICBvbkRlbnk6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7IC8vIEFsbG93cyBtb2RhbCB0byBjbG9zZSBvbiBcIkNhbmNlbFwiXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvbkFwcHJvdmU6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gT24gYXBwcm92YWwsIHNlbmQgYSByZXF1ZXN0IHRvIGRlbGV0ZSBhbGwgcmVjb3Jkc1xuICAgICAgICAgICAgICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICAgICAgICAgICAgICB1cmw6IE1vZHVsZVBob25lQm9va1NldHRpbmdzLmRlbGV0ZUFsbFJlY29yZHNBSkFYVXJsLFxuICAgICAgICAgICAgICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmVsb2FkIHRoZSBwYWdlIGFmdGVyIHN1Y2Nlc3NmdWwgZGVsZXRpb25cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2hvdyBlcnJvciBtZXNzYWdlIGlmIGRlbGV0aW9uIGZhaWxzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5tb2RhbCgnc2hvdycpOyAvLyBEaXNwbGF5IHRoZSBjb25maXJtYXRpb24gbW9kYWxcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIHRoZSB0b2dnbGUgb2YgdGhlIGlucHV0IG1hc2suXG4gICAgICogU2VuZHMgYSByZXF1ZXN0IHRvIHVwZGF0ZSB0aGUgc2V0dGluZyBmb3IgZW5hYmxpbmcgb3IgZGlzYWJsaW5nIGlucHV0IG1hc2tzLlxuICAgICAqL1xuICAgIG9uQ2hhbmdlSW5wdXRNYXNrVG9nZ2xlKCkge1xuICAgICAgICBjb25zdCBjdXJyZW50U3RhdGUgPSBNb2R1bGVQaG9uZUJvb2tTZXR0aW5ncy4kZGlzYWJsZUlucHV0TWFza1RvZ2dsZS5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuXG4gICAgICAgIC8vIFNlbmQgcmVxdWVzdCB0byB0b2dnbGUgdGhlIGlucHV0IG1hc2sgc2V0dGluZ1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IE1vZHVsZVBob25lQm9va1NldHRpbmdzLmRpc2FibGVJbnB1dE1hc2tBSkFYVXJsLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7IGRpc2FibGVJbnB1dE1hc2s6IGN1cnJlbnRTdGF0ZSB9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIC8vIFJlbG9hZCB0aGUgcGFnZSBhZnRlciBzdWNjZXNzZnVsIHVwZGF0ZVxuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAvLyBTaG93IGVycm9yIG1lc3NhZ2UgaWYgdGhlIHVwZGF0ZSBmYWlsc1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSxcbn07XG5cbi8vIEluaXRpYWxpemUgdGhlIHNldHRpbmdzIG1vZHVsZSB3aGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeVxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIE1vZHVsZVBob25lQm9va1NldHRpbmdzLmluaXRpYWxpemUoKTtcbn0pOyJdfQ==