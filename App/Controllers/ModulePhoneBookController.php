<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 11 2018
 */

namespace Modules\ModulePhoneBook\App\Controllers;

use MikoPBX\Modules\PbxExtensionUtils;
use Modules\ModulePhoneBook\Models\PhoneBook;
use MikoPBX\AdminCabinet\Controllers\BaseController;

class ModulePhoneBookController extends BaseController
{

    private $moduleUniqueID = 'ModulePhoneBook';
    private $moduleDir;

    /**
     * Basic initial class
     */
    public function initialize(): void
    {
        $this->moduleDir           = PbxExtensionUtils::getModuleDir($this->moduleUniqueID);
        if ($this->request->isAjax() === false) {
            $this->view->logoImagePath = "{$this->url->get()}assets/img/cache/{$this->moduleUniqueID}/logo.svg";
            $this->view->submitMode    = null;
        }
        parent::initialize();
    }

    /**
     * Index page controller
     */
    public function indexAction(): void
    {
        $headerCollectionCSS = $this->assets->collection('headerCSS');
        $headerCollectionCSS
            ->addCss('css/vendor/datatable/dataTables.semanticui.min.css', true)
            ->addCss("css/cache/{$this->moduleUniqueID}/module-phonebook.css", true);

        $footerCollection = $this->assets->collection('footerJS');
        $footerCollection
            ->addJs('js/vendor/inputmask/inputmask.js', true)
            ->addJs('js/vendor/inputmask/jquery.inputmask.js', true)
            ->addJs('js/vendor/inputmask/jquery.inputmask-multi.js', true)
            ->addJs('js/vendor/inputmask/bindings/inputmask.binding.js', true)
            ->addJs('js/vendor/datatable/dataTables.semanticui.js', true)
            ->addJs('js/pbx/Extensions/input-mask-patterns.js', true)
            ->addJs("js/cache/{$this->moduleUniqueID}/module-phonebook-index.js", true);

        $this->view->pick("{$this->moduleDir}/App/Views/index");
    }

    /**
     * Запрос нового пакета истории разговоров для DataTable JSON
     */
    public function getNewRecordsAction(): void
    {
        $currentPage                 = $this->request->getPost('draw');
        $position                    = $this->request->getPost('start');
        $recordsPerPage              = $this->request->getPost('length');
        $searchPhrase                = $this->request->getPost('search');
        $this->view->draw            = $currentPage;
        $this->view->recordsTotal    = 0;
        $this->view->recordsFiltered = 0;
        $this->view->data            = [];

        // Посчитаем количество уникальных записей в таблице телефонов
        $parameters['columns'] = 'COUNT(*) as rows';
        $recordsTotalReq       = PhoneBook::findFirst($parameters);
        if ($recordsTotalReq !== null) {
            $recordsTotal             = $recordsTotalReq->rows;
            $this->view->recordsTotal = $recordsTotal;
        } else {
            return;
        }
        // Посчитаем количество записей с учетом фильтра
        if ( ! empty($searchPhrase['value'])) {
            $this->prepareConditionsForSearchPhrases($searchPhrase['value'], $parameters);
            // Если мы не смогли расшифровать строку запроса вернем пустой результата
            if (empty($parameters['conditions'])) {
                return;
            }
        }
        $recordsFilteredReq = PhoneBook::findFirst($parameters);
        if ($recordsFilteredReq !== null) {
            $recordsFiltered             = $recordsFilteredReq->rows;
            $this->view->recordsFiltered = $recordsFiltered;
        }

        // Найдем все записи подходящие под заданный фильтр
        $parameters['columns'] = [
            'call_id',
            'number'   => 'number_rep',
            'DT_RowId' => 'id',
        ];
        $parameters['order']   = ['call_id desc'];
        $parameters['limit']   = $recordsPerPage;
        $parameters['offset']  = $position;
        $records               = PhoneBook::find($parameters);
        $this->view->data      = $records->toArray();
    }


    /**
     * Подготовка параметров запроса для фильтрации записей телефонной книги
     *
     * @param $searchPhrase - поисковая фраза, которую ввел пользователь
     * @param $parameters   - параметры запроса к телефонной кнгие
     */
    private function prepareConditionsForSearchPhrases(&$searchPhrase, &$parameters): void
    {
        $parameters['conditions'] = '';

        // Поищем номер телефона
        $searchPhrase = str_replace(['(', ')', '-', '+'], '', $searchPhrase);
        if (preg_match_all("/\d+/", $searchPhrase, $matches)) {
            if (count($matches[0]) === 1) {
                $seekNumber                         = '1'.substr($matches[0][0], -9);
                $parameters['conditions']           = 'number LIKE :SearchPhrase:';
                $parameters['bind']['SearchPhrase'] = "%{$seekNumber}%";
            }
            $searchPhrase = str_replace($matches[0][0], '', $searchPhrase);
        }

        // Ищем по caller_id
        if (preg_match_all('/^([а-яА-ЯЁёa-zA-Z0-9_ ]+)$/u', $searchPhrase, $matches) && count($matches[0]) > 0) {
            $parameters['conditions']            = 'call_id like :SearchPhrase1:';
            $parameters['bind']['SearchPhrase1'] = "%{$matches[0][0]}%";
        }
    }

    /**
     * Save settings AJAX action
     */
    public function saveAction(): void
    {
        if ( ! $this->request->isPost()) {
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
            if ($record->number!==$data['number']){
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
        $this->view->data = ['oldId'=>$oldId,'newId'=>$record->id];
        $this->view->success = true;
    }

    /**
     * Delete phonebook record
     *
     * @param string $id record ID
     */
    public function deleteAction($id = null): void
    {
        $record = PhoneBook::findFirstById($id);
        if ($record !== null && ! $record->delete()) {
            $this->flash->error(implode('<br>', $record->getMessages()));
            $this->view->success = false;

            return;
        }
        $this->view->success = true;
    }
}