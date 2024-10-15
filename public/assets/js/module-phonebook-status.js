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
var ModulePhoneBookStatus = {
  $moduleStatus: $('#status'),
  $statusToggle: $('#module-status'),
  $disabilityFields: $('#module-phonebook-form .disability'),

  /**
   * Initializes the module's status checks.
   * Adds event listeners to update the status of the form based on the module's enabled/disabled state.
   */
  initialize: function initialize() {
    ModulePhoneBookStatus.checkStatusToggle();
    window.addEventListener('ModuleStatusChanged', ModulePhoneBookStatus.checkStatusToggle);
  },

  /**
   * Toggle the status of buttons and fields when the module status changes.
   * If the module is enabled, fields are activated; otherwise, they are disabled.
   */
  checkStatusToggle: function checkStatusToggle() {
    if (ModulePhoneBookStatus.$statusToggle.checkbox('is checked')) {
      ModulePhoneBookStatus.$disabilityFields.removeClass('disabled');
      ModulePhoneBookStatus.$moduleStatus.show();
    } else {
      ModulePhoneBookStatus.$disabilityFields.addClass('disabled');
      ModulePhoneBookStatus.$moduleStatus.hide();
    }
  }
}; // Initialize the module status handler when the document is ready.

$(document).ready(function () {
  ModulePhoneBookStatus.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9tb2R1bGUtcGhvbmVib29rLXN0YXR1cy5qcyJdLCJuYW1lcyI6WyJNb2R1bGVQaG9uZUJvb2tTdGF0dXMiLCIkbW9kdWxlU3RhdHVzIiwiJCIsIiRzdGF0dXNUb2dnbGUiLCIkZGlzYWJpbGl0eUZpZWxkcyIsImluaXRpYWxpemUiLCJjaGVja1N0YXR1c1RvZ2dsZSIsIndpbmRvdyIsImFkZEV2ZW50TGlzdGVuZXIiLCJjaGVja2JveCIsInJlbW92ZUNsYXNzIiwic2hvdyIsImFkZENsYXNzIiwiaGlkZSIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUVBLElBQU1BLHFCQUFxQixHQUFHO0FBQzFCQyxFQUFBQSxhQUFhLEVBQUVDLENBQUMsQ0FBQyxTQUFELENBRFU7QUFFMUJDLEVBQUFBLGFBQWEsRUFBRUQsQ0FBQyxDQUFDLGdCQUFELENBRlU7QUFHMUJFLEVBQUFBLGlCQUFpQixFQUFFRixDQUFDLENBQUMsb0NBQUQsQ0FITTs7QUFLMUI7QUFDSjtBQUNBO0FBQ0E7QUFDSUcsRUFBQUEsVUFUMEIsd0JBU2I7QUFDVEwsSUFBQUEscUJBQXFCLENBQUNNLGlCQUF0QjtBQUNBQyxJQUFBQSxNQUFNLENBQUNDLGdCQUFQLENBQXdCLHFCQUF4QixFQUErQ1IscUJBQXFCLENBQUNNLGlCQUFyRTtBQUNILEdBWnlCOztBQWMxQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQSxFQUFBQSxpQkFsQjBCLCtCQWtCTjtBQUNoQixRQUFJTixxQkFBcUIsQ0FBQ0csYUFBdEIsQ0FBb0NNLFFBQXBDLENBQTZDLFlBQTdDLENBQUosRUFBZ0U7QUFDNURULE1BQUFBLHFCQUFxQixDQUFDSSxpQkFBdEIsQ0FBd0NNLFdBQXhDLENBQW9ELFVBQXBEO0FBQ0FWLE1BQUFBLHFCQUFxQixDQUFDQyxhQUF0QixDQUFvQ1UsSUFBcEM7QUFDSCxLQUhELE1BR087QUFDSFgsTUFBQUEscUJBQXFCLENBQUNJLGlCQUF0QixDQUF3Q1EsUUFBeEMsQ0FBaUQsVUFBakQ7QUFDQVosTUFBQUEscUJBQXFCLENBQUNDLGFBQXRCLENBQW9DWSxJQUFwQztBQUNIO0FBQ0o7QUExQnlCLENBQTlCLEMsQ0E2QkE7O0FBQ0FYLENBQUMsQ0FBQ1ksUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQmYsRUFBQUEscUJBQXFCLENBQUNLLFVBQXRCO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI0IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbmNvbnN0IE1vZHVsZVBob25lQm9va1N0YXR1cyA9IHtcbiAgICAkbW9kdWxlU3RhdHVzOiAkKCcjc3RhdHVzJyksXG4gICAgJHN0YXR1c1RvZ2dsZTogJCgnI21vZHVsZS1zdGF0dXMnKSxcbiAgICAkZGlzYWJpbGl0eUZpZWxkczogJCgnI21vZHVsZS1waG9uZWJvb2stZm9ybSAuZGlzYWJpbGl0eScpLFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIG1vZHVsZSdzIHN0YXR1cyBjaGVja3MuXG4gICAgICogQWRkcyBldmVudCBsaXN0ZW5lcnMgdG8gdXBkYXRlIHRoZSBzdGF0dXMgb2YgdGhlIGZvcm0gYmFzZWQgb24gdGhlIG1vZHVsZSdzIGVuYWJsZWQvZGlzYWJsZWQgc3RhdGUuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgTW9kdWxlUGhvbmVCb29rU3RhdHVzLmNoZWNrU3RhdHVzVG9nZ2xlKCk7XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdNb2R1bGVTdGF0dXNDaGFuZ2VkJywgTW9kdWxlUGhvbmVCb29rU3RhdHVzLmNoZWNrU3RhdHVzVG9nZ2xlKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVG9nZ2xlIHRoZSBzdGF0dXMgb2YgYnV0dG9ucyBhbmQgZmllbGRzIHdoZW4gdGhlIG1vZHVsZSBzdGF0dXMgY2hhbmdlcy5cbiAgICAgKiBJZiB0aGUgbW9kdWxlIGlzIGVuYWJsZWQsIGZpZWxkcyBhcmUgYWN0aXZhdGVkOyBvdGhlcndpc2UsIHRoZXkgYXJlIGRpc2FibGVkLlxuICAgICAqL1xuICAgIGNoZWNrU3RhdHVzVG9nZ2xlKCkge1xuICAgICAgICBpZiAoTW9kdWxlUGhvbmVCb29rU3RhdHVzLiRzdGF0dXNUb2dnbGUuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuICAgICAgICAgICAgTW9kdWxlUGhvbmVCb29rU3RhdHVzLiRkaXNhYmlsaXR5RmllbGRzLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgTW9kdWxlUGhvbmVCb29rU3RhdHVzLiRtb2R1bGVTdGF0dXMuc2hvdygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgTW9kdWxlUGhvbmVCb29rU3RhdHVzLiRkaXNhYmlsaXR5RmllbGRzLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgTW9kdWxlUGhvbmVCb29rU3RhdHVzLiRtb2R1bGVTdGF0dXMuaGlkZSgpO1xuICAgICAgICB9XG4gICAgfSxcbn07XG5cbi8vIEluaXRpYWxpemUgdGhlIG1vZHVsZSBzdGF0dXMgaGFuZGxlciB3aGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeS5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBNb2R1bGVQaG9uZUJvb2tTdGF0dXMuaW5pdGlhbGl6ZSgpO1xufSk7Il19