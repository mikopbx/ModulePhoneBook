/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 11 2018
 *
 */

/* global globalRootUrl,globalTranslate,
SemanticLocalization, UserMessage, InputMaskPatterns */ 

const ModulePhoneBook = {
	$formObj: $('#module-phonebook-form'),
	$checkBoxes: $('#module-phonebook-form .ui.checkbox'),
	$disabilityFields: $('#module-phonebook-form  .disability'),
	$statusToggle: $('#module-status-toggle'),
	$moduleStatus: $('#status'),
	$globalSearch: $('#globalsearch'),
	$recordsTable: $('#phonebook-table'),
	$addNewButton: $('#add-new-button'),
	inputNumberJQTPL: 'input.number-input',
	getNewRecordsAJAXUrl: `${globalRootUrl}module-phone-book/getNewRecords`,
	deleteRecordAJAXUrl: `${globalRootUrl}module-phone-book/delete`,
	saveRecordAJAXUrl: `${globalRootUrl}module-phone-book/save`,
	$maskList: null,
	validateRules: {
	},
	initialize() {
		ModulePhoneBook.checkStatusToggle();
		window.addEventListener('ModuleStatusChanged', ModulePhoneBook.checkStatusToggle);

		// Global Search filter
		ModulePhoneBook.$globalSearch.on('keyup', (e) => {
			if (e.keyCode === 13
				|| e.keyCode === 8
				|| ModulePhoneBook.$globalSearch.val().length === 0) {
				const text = `${ModulePhoneBook.$globalSearch.val()}`;
				ModulePhoneBook.applyFilter(text);
			}
		});

		// Initialize DatTable
		ModulePhoneBook.$recordsTable.dataTable({
			search: {
				search: ModulePhoneBook.$globalSearch.val(),
			},
			serverSide: true,
			processing: true,
			ajax: {
				url: ModulePhoneBook.getNewRecordsAJAXUrl,
				type: 'POST',
				dataSrc: 'data',
			},
			columns: [
				{ data: null },
				{ data: 'call_id' },
				{ data: 'number' },
				{ data: null },
			],
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
			createdRow(row, data) {
				const templateName =
					'<div class="ui transparent fluid input inline-edit">' +
					`<input class="caller-id-input" type="text" data-value="${data.call_id}" value="${data.call_id}">` +
					'</div>';

				const templateCid =
					'<div class="ui transparent input inline-edit">' +
					`<input class="number-input" type="text" data-value="${data.number}" value="${data.number}">` +
					'</div>';

				const templateDeleteButton = '<div class="ui small basic icon buttons action-buttons">' +
					`<a href="${ModulePhoneBook.deleteRecordAJAXUrl}/${data.DT_RowId}" data-value = "${data.DT_RowId}"` +
					` class="ui button delete two-steps-delete popuped" data-content="${globalTranslate.bt_ToolTipDelete}">` +
					'<i class="icon trash red"></i></a></div>';

				$('td', row).eq(0).html('<i class="ui user circle icon"></i>');
				$('td', row).eq(1).html(templateName);
				$('td', row).eq(2).html(templateCid);
				$('td', row).eq(3).html(templateDeleteButton);
			},
			/**
			 * Draw event - fired once the table has completed a draw.
			 */
			drawCallback() {
				ModulePhoneBook.initializeInputmask($(ModulePhoneBook.inputNumberJQTPL));
			},
			language: SemanticLocalization.dataTableLocalisation,
			ordering: false,
		});
		ModulePhoneBook.dataTable = ModulePhoneBook.$recordsTable.DataTable();

		ModulePhoneBook.dataTable.on('draw', () => {
			ModulePhoneBook.$globalSearch.closest('div').removeClass('loading');
		});

		// Двойной клик на поле ввода номера
		$('body').on('focusin', '.caller-id-input, .number-input', (e) => {
			const currentRowId = $(e.target).closest('tr').attr('id');
			$(e.target).transition('glow');

			$(e.target).closest('div')
				.removeClass('transparent')
				.addClass('changed-field');
			$(e.target).attr('readonly', false);
		});

		// Отправка формы на сервер по Enter или Tab
		$(document).on('keydown', (e) => {
			const keyCode = e.keyCode || e.which;
			if (keyCode === 13
			|| (keyCode === 9 && !$(':focus').hasClass('.number-input'))
			) {
				const $el = $('.changed-field').closest('tr');
				$el.each((index, obj) => {
					const currentRowId = $(obj).attr('id');
					if (currentRowId !== undefined) {
						ModulePhoneBook.sendChangesToServer(currentRowId);
					}
				});
			}
		});

		// Отправка формы на сервер по уходу с поля ввода
		$('body').on('focusout', '.caller-id-input, .number-input', () => {
				const $el = $('.changed-field').closest('tr');
				$el.each((index, obj) => {
					const currentRowId = $(obj).attr('id');
					if (currentRowId !== undefined) {
						ModulePhoneBook.sendChangesToServer(currentRowId);
					}
				});
		});

		// Клик на кнопку удалить
		$('body').on('click', 'a.delete', (e) => {
			e.preventDefault();
			const id = $(e.target).closest('a').attr('data-value');
			ModulePhoneBook.deleteRow($(e.target), id);
		});

		// Добавление новой строки
		ModulePhoneBook.$addNewButton.on('click', (e) => {
			e.preventDefault();
			$('.dataTables_empty').remove();
			// Отправим на запись все что не записано еще
			const $el = $('.changed-field').closest('tr');
			$el.each((index, obj) => {
				const currentRowId = $(obj).attr('id');
				if (currentRowId !== undefined) {
					ModulePhoneBook.sendChangesToServer(currentRowId);
				}
			});

			const id = `new${Math.floor(Math.random() * Math.floor(500))}`;
			const rowTemplate = `<tr id="${id}">` +
				'<td><i class="ui user circle icon"></i></td>' +
				'<td><div class="ui fluid input inline-edit changed-field"><input class="caller-id-input" type="text" data-value="" value=""></div></td>' +
				'<td><div class="ui fluid input inline-edit changed-field"><input class="number-input" type="text" data-value="" value=""></div></td>' +
				'<td><div class="ui small basic icon buttons action-buttons">' +
					`<a href="#" class="ui button delete two-steps-delete popuped" data-value = "new" data-content="${globalTranslate.bt_ToolTipDelete}">` +
					'<i class="icon trash red"></i></a></div></td>' +
				'</tr>';
			ModulePhoneBook.$recordsTable.find('tbody > tr:first').before(rowTemplate);
			$(`tr#${id} input`).transition('glow');
			$(`tr#${id} .caller-id-input`).focus();
			ModulePhoneBook.initializeInputmask($(`tr#${id} .number-input`));
		});
	},
	/**
	 * Отправка данных на сервер при измении
	 */
	sendChangesToServer(recordId) {

		const callerIdInputVal = $(`tr#${recordId} .caller-id-input`).val();
		const numberInputVal = $(`tr#${recordId} .number-input`).val();
		if (!callerIdInputVal || !numberInputVal){
			return;
		}
		let number = numberInputVal.replace(/\D+/g, '');
		number=`1${number.substr(number.length - 9)}`;
		const data = {
			call_id: callerIdInputVal,
			number_rep: numberInputVal,
			number: number,
			id: recordId,
		};

		// Добавим иконку сохранения
		$(`tr#${recordId} .user.circle`)
			.removeClass('user circle')
			.addClass('spinner loading');

		$.api({
			url: ModulePhoneBook.saveRecordAJAXUrl,
			on: 'now',
			method: 'POST',
			data,
			successTest(response) {
				// test whether a JSON response is valid
				return response !== undefined
					&& Object.keys(response).length > 0
					&& response.success === true;
			},
			onSuccess(response) {
				if (response.data !== undefined) {
					let oldId = response.data.oldId;
					if (oldId===null){
						oldId = recordId;
					}

					$(`tr#${oldId} input`).attr('readonly', true);
					$(`tr#${oldId} div`).removeClass('changed-field loading').addClass('transparent');
					//ModulePhoneBook.$addNewButton.removeClass('disabled');
					$(`tr#${oldId} .spinner.loading`)
						.addClass('user circle')
						.removeClass('spinner loading');
					if (oldId !== response.data.newId){
						$(`tr#${oldId}`).attr('id', response.data.newId);
					}
				}
			},
			onFailure(response) {
				if (response.message !== undefined) {
					UserMessage.showMultiString(response.message);
				}
				$(`tr#${recordId} .spinner.loading`)
					.addClass('user circle')
					.removeClass('spinner loading');
			},
			onError(errorMessage, element, xhr) {
				if (xhr.status === 403) {
					window.location = `${globalRootUrl}session/index`;
				}
			},
		});
	},
	/**
	 * Инициализирует красивое представление номеров
	 */
	initializeInputmask($el) {
		if (ModulePhoneBook.$maskList === null) {
			// Подготовим таблицу для сортировки
			ModulePhoneBook.$maskList = $.masksSort(InputMaskPatterns, ['#'], /[0-9]|#/, 'mask');
		}
		$el.inputmasks({
			inputmask: {
				definitions: {
					'#': {
						validator: '[0-9]',
						cardinality: 1,
					},
				},
				showMaskOnHover: false,
				// oncleared: extension.cbOnClearedMobileNumber,
				// oncomplete: extension.cbOnCompleteMobileNumber,
				// clearIncomplete: true,
				onBeforePaste: ModulePhoneBook.cbOnNumberBeforePaste,
				// regex: /\D+/,
			},
			match: /[0-9]/,
			replace: '9',
			list: ModulePhoneBook.$maskList,
			listKey: 'mask',

		});
	},
	/**
	 * Изменение статуса кнопок при изменении статуса модуля
	 */
	checkStatusToggle() {
		if (ModulePhoneBook.$statusToggle.checkbox('is checked')) {
			ModulePhoneBook.$disabilityFields.removeClass('disabled');
			ModulePhoneBook.$moduleStatus.show();
		} else {
			ModulePhoneBook.$disabilityFields.addClass('disabled');
			ModulePhoneBook.$moduleStatus.hide();
		}
	},
	/**
	 * Server side filter
	 * @param text
	 */
	applyFilter(text) {
		const $changedFields = $('.changed-field');
		$changedFields.each((index, obj) => {
			$(obj).removeClass('changed-field').addClass('transparent');
			const $input = $(obj).find('input');
			$input.val($input.attr('data-value'));
			$input.attr('readonly', true);
		});
		ModulePhoneBook.dataTable.search(text).draw();
		ModulePhoneBook.$globalSearch.closest('div').addClass('loading');
	},
	/**
	 * Очистка номера перед вставкой от лишних символов
	 * @returns {boolean|*|void|string}
	 */
	cbOnNumberBeforePaste(pastedValue) {
		return pastedValue.replace(/\D+/g, '');
	},
	/**
	 * Удаление строки
	 * @param $target - jquery button target
	 * @param id - record id
	 */
	deleteRow($target, id) {
		if (id === 'new') {
			$target.closest('tr').remove();
			return;
		}
		$.api({
			url: `${globalRootUrl}module-phone-book/delete/${id}`,
			on: 'now',
			onSuccess(response) {
				if (response.success) {
					$target.closest('tr').remove();
					if (ModulePhoneBook.$recordsTable.find('tbody > tr').length===0){
						ModulePhoneBook.$recordsTable.find('tbody').append('<tr class="odd"></tr>');
					}
				}
			},
		});
	},
};

$(document).ready(() => {
	ModulePhoneBook.initialize();
});
