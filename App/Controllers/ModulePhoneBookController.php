<?php

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

namespace Modules\ModulePhoneBook\App\Controllers;

use MikoPBX\AdminCabinet\Controllers\BaseController;
use MikoPBX\AdminCabinet\Providers\AssetProvider;
use Modules\ModulePhoneBook\App\Forms\ModuleConfigForm;
use Modules\ModulePhoneBook\Models\PhoneBook;
use Modules\ModulePhoneBook\Models\Settings;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use Phalcon\Http\Request\File as PhalconFile;

class ModulePhoneBookController extends BaseController
{
    private $moduleUniqueID = 'ModulePhoneBook';

    /**
     * Basic initial class
     */
    public function initialize(): void
    {
        if ($this->request->isAjax() === false) {
            $this->view->logoImagePath = "{$this->url->get()}assets/img/cache/{$this->moduleUniqueID}/logo.svg";
            $this->view->submitMode = null;
        }
        parent::initialize();
    }

    /**
     * Index page controller
     */
    public function indexAction(): void
    {
        $headerCollectionCSS = $this->assets->collection(AssetProvider::HEADER_CSS);
        $headerCollectionCSS
            ->addCss('css/vendor/datatable/dataTables.semanticui.min.css', true)
            ->addCss("css/cache/{$this->moduleUniqueID}/module-phonebook.css", true);

        $footerCollection = $this->assets->collection(AssetProvider::FOOTER_JS);
        $footerCollection
            ->addJs('js/vendor/inputmask/inputmask.js', true)
            ->addJs('js/vendor/inputmask/jquery.inputmask.js', true)
            ->addJs('js/vendor/inputmask/jquery.inputmask-multi.js', true)
            ->addJs('js/vendor/inputmask/bindings/inputmask.binding.js', true)
            ->addJs('js/vendor/datatable/dataTables.semanticui.js', true)
            ->addJs('js/pbx/Extensions/input-mask-patterns.js', true)
            ->addJs("js/cache/{$this->moduleUniqueID}/module-phonebook-index.js", true);

        $settings = Settings::findFirst();
        if ($settings === null) {
            $settings = new Settings();
            $settings->disableInputMask = '0';
        }
        $this->view->form = new ModuleConfigForm($settings);
    }

    /**
     * Запрос нового пакета истории разговоров для DataTable JSON
     */
    public function getNewRecordsAction(): void
    {
        $currentPage = $this->request->getPost('draw');
        $position = $this->request->getPost('start');
        $recordsPerPage = $this->request->getPost('length');
        $searchPhrase = $this->request->getPost('search');
        $this->view->draw = $currentPage;
        $this->view->recordsTotal = 0;
        $this->view->recordsFiltered = 0;
        $this->view->data = [];

        // Посчитаем количество уникальных записей в таблице телефонов
        $parameters['columns'] = 'COUNT(*) as rows';
        $recordsTotalReq = PhoneBook::findFirst($parameters);
        if ($recordsTotalReq !== null) {
            $recordsTotal = $recordsTotalReq->rows;
            $this->view->recordsTotal = $recordsTotal;
        } else {
            return;
        }
        // Посчитаем количество записей с учетом фильтра
        if (!empty($searchPhrase['value'])) {
            $this->prepareConditionsForSearchPhrases($searchPhrase['value'], $parameters);
            // Если мы не смогли расшифровать строку запроса вернем пустой результата
            if (empty($parameters['conditions'])) {
                return;
            }
        }
        $recordsFilteredReq = PhoneBook::findFirst($parameters);
        if ($recordsFilteredReq !== null) {
            $recordsFiltered = $recordsFilteredReq->rows;
            $this->view->recordsFiltered = $recordsFiltered;
        }

        // Найдем все записи подходящие под заданный фильтр
        $parameters['columns'] = [
            'call_id',
            'number' => 'number_rep',
            'DT_RowId' => 'id',
        ];
        $parameters['order'] = ['call_id desc'];
        $parameters['limit'] = $recordsPerPage;
        $parameters['offset'] = $position;
        $records = PhoneBook::find($parameters);
        $this->view->data = $records->toArray();
    }


    /**
     * Подготовка параметров запроса для фильтрации записей телефонной книги
     *
     * @param $searchPhrase - поисковая фраза, которую ввел пользователь
     * @param $parameters - параметры запроса к телефонной кнгие
     */
    private function prepareConditionsForSearchPhrases(&$searchPhrase, &$parameters): void
    {
        $parameters['conditions'] = '';

        // Поищем номер телефона
        $searchPhrase = str_replace(['(', ')', '-', '+'], '', $searchPhrase);
        if (preg_match_all("/\d+/", $searchPhrase, $matches)) {
            if (count($matches[0]) === 1) {
                $seekNumber = '1' . substr($matches[0][0], -9);
                $parameters['conditions'] = 'number LIKE :SearchPhrase:';
                $parameters['bind']['SearchPhrase'] = "%{$seekNumber}%";
            }
            $searchPhrase = str_replace($matches[0][0], '', $searchPhrase);
        }

        // Ищем по caller_id
        if (preg_match_all('/^([а-яА-ЯЁёa-zA-Z0-9_ ]+)$/u', $searchPhrase, $matches) && count($matches[0]) > 0) {
            $parameters['conditions'] = 'call_id like :SearchPhrase1:';
            $parameters['bind']['SearchPhrase1'] = "%{$matches[0][0]}%";
        }
    }

    /**
     * Save settings AJAX action
     */
    public function saveAction(): void
    {
        if (!$this->request->isPost()) {
            return;
        }
        $data = $this->request->getPost();

        if (empty($data['call_id']) || empty($data['number'])) {
            return;
        }

        // We haven't ability to change primary filed, we have to delete it and recreate
        $oldId = null;
        $record = null;
        if (stripos($data['id'], 'new') === false) {
            $record = PhoneBook::findFirstById($data['id']);
            if ($record->number !== $data['number']) {
                $oldId = $record->id;
                $record->delete();
                $record = null;
            }
        }

        if ($record === null) {
            $record = new PhoneBook();
        }

        foreach ($record as $key => $value) {
            switch ($key) {
                case 'id':
                    break;
                default:
                    if (array_key_exists($key, $data)) {
                        $record->$key = $data[$key];
                    } else {
                        $record->$key = '';
                    }
            }
        }

        if ($record->save() === false) {
            $errors = $record->getMessages();
            $this->flash->error(implode('<br>', $errors));
            $this->view->success = false;

            return;
        }
        $this->view->data = ['oldId' => $oldId, 'newId' => $record->id];
        $this->view->success = true;
    }

    /**
     * Delete phonebook record
     *
     * @param string|null $id record ID
     */
    public function deleteAction(?string $id = null): void
    {
        $record = PhoneBook::findFirstById($id);
        if ($record !== null && !$record->delete()) {
            $this->flash->error(implode('<br>', $record->getMessages()));
            $this->view->success = false;

            return;
        }
        $this->view->success = true;
    }

    /**
     * Upload and import phonebook records from an Excel file
     */
    public function importFromExcelAction(): void
    {
        // Проверка на наличие загруженного файла
        if (!$this->request->hasFiles()) {
            $this->flash->error("No file uploaded");
            return;
        }

        $uploadedFile = $this->request->getUploadedFiles()[0]; // Получаем первый загруженный файл
        if (!$this->validateFile($uploadedFile)) {
            $this->flash->error("Invalid file format");
            return;
        }
        include_once __DIR__ . '/../../vendor/autoload.php';
        // Загружаем файл и парсим его
        try {
            $spreadsheet = IOFactory::load($uploadedFile->getTempName());
            $sheet = $spreadsheet->getActiveSheet();

            // Получаем количество строк
            $highestRow = $sheet->getHighestDataRow();
            $highestColumn = $sheet->getHighestDataColumn();
            $highestColumnIndex = Coordinate::columnIndexFromString($highestColumn);

            // Пробегаемся по каждой строке и колонке
            for ($row = 2; $row <= $highestRow; ++$row) {
                $callId = $sheet->getCell([1, $row])->getValue();
                $numberRep = $sheet->getCell([2, $row])->getValue();
                $number = preg_replace('/\D+/', '', $numberRep); // Очищаем от нецифровых символов

                // Добавляем запись в базу данных
                $this->savePhonebookRecord($callId, $numberRep, $number);
            }
        } catch (\Exception $e) {
            $this->flash->error("Error loading Excel file: " . $e->getMessage());
        }
        $this->forward('module-phone-book/module-phone-book/index/');
    }

    /**
     * Validate uploaded file format
     * @param PhalconFile $file
     * @return bool
     */
    private function validateFile(PhalconFile $file): bool
    {
        $validMimeTypes = [
            'application/vnd.ms-excel',  // xls
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'  // xlsx
        ];
        return in_array($file->getType(), $validMimeTypes);
    }

    /**
     * Save a single phonebook record to the database
     * @param string $callId
     * @param string $numberRep
     * @param string $number
     */
    private function savePhonebookRecord(string $callId, string $numberRep, string $number): void
    {
        $record = new PhoneBook();
        $record->call_id = $callId;
        $record->number_rep = $numberRep;
        $record->number = $number;

        if (!$record->save()) {
            $errors = implode('<br>', $record->getMessages());
            $message = $this->translation->_("module_phnbk_ImportError");
            $this->flash->error("$message: $errors");
        }
    }
}
