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

class ModulePhoneBookController extends BaseController
{
    private $moduleUniqueID = 'ModulePhoneBook';

    /**
     * Controller for the index page.
     */
    public function indexAction(): void
    {
        $this->view->logoImagePath = "{$this->url->get()}assets/img/cache/{$this->moduleUniqueID}/logo.svg";
        $this->view->submitMode = null;

        // Add necessary CSS files
        $headerCollectionCSS = $this->assets->collection(AssetProvider::HEADER_CSS);
        $headerCollectionCSS
            ->addCss('css/vendor/datatable/dataTables.semanticui.min.css', true)
            ->addCss("css/cache/{$this->moduleUniqueID}/module-phonebook.css", true);

        // Add Semantic UI modal CSS
        $semanticCollectionCSS = $this->assets->collection(AssetProvider::SEMANTIC_UI_CSS);
        $semanticCollectionCSS->addCss('css/vendor/semantic/modal.min.css', true);

        // Add Semantic UI modal JS
        $semanticCollectionJS = $this->assets->collection(AssetProvider::SEMANTIC_UI_JS);
        $semanticCollectionJS->addJs('js/vendor/semantic/modal.min.js', true);

        // Add JS files required for this page
        $footerCollection = $this->assets->collection(AssetProvider::FOOTER_JS);
        $footerCollection
            ->addJs('js/vendor/inputmask/inputmask.js', true)
            ->addJs('js/vendor/inputmask/jquery.inputmask.js', true)
            ->addJs('js/vendor/inputmask/jquery.inputmask-multi.js', true)
            ->addJs('js/vendor/inputmask/bindings/inputmask.binding.js', true)
            ->addJs('js/vendor/datatable/dataTables.semanticui.js', true)
            ->addJs('js/pbx/Extensions/input-mask-patterns.js', true)
            ->addJs("js/cache/{$this->moduleUniqueID}/module-phonebook-status.js", true)
            ->addJs("js/cache/{$this->moduleUniqueID}/module-phonebook-index.js", true)
            ->addJs("js/cache/{$this->moduleUniqueID}/module-phonebook-settings.js", true)
            ->addJs("js/cache/{$this->moduleUniqueID}/module-phonebook-merging-worker.js", true)
            ->addJs("js/cache/{$this->moduleUniqueID}/module-phonebook-import.js", true)
            ->addJs("js/cache/{$this->moduleUniqueID}/module-phonebook-datatable.js", true);

        $settings = Settings::findFirst();
        if ($settings === null) {
            $settings = new Settings();
            $settings->disableInputMask = '0';
        }

        $this->view->form = new ModuleConfigForm($settings);
    }

    /**
     * Request new call history records for DataTable in JSON format.
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

        // Count the total number of unique records in the phonebook table
        $parameters['columns'] = 'COUNT(*) as rows';
        $recordsTotalReq = PhoneBook::findFirst($parameters);
        if ($recordsTotalReq !== null) {
            $recordsTotal = $recordsTotalReq->rows;
            $this->view->recordsTotal = $recordsTotal;
        } else {
            return;
        }

        // Count the number of records based on the search filter
        if (!empty($searchPhrase['value'])) {
            $this->prepareConditionsForSearchPhrases($searchPhrase['value'], $parameters);
        }
        $recordsFilteredReq = PhoneBook::findFirst($parameters);
        if ($recordsFilteredReq !== null) {
            $recordsFiltered = $recordsFilteredReq->rows;
            $this->view->recordsFiltered = $recordsFiltered;
        }

        // Retrieve all records that match the filter criteria
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
     * Prepare search conditions for filtering phonebook records.
     *
     * @param string $searchPhrase The search phrase entered by the user
     * @param array $parameters The query parameters to filter the phonebook records
     */
    private function prepareConditionsForSearchPhrases(string &$searchPhrase, array &$parameters): void
    {
        $parameters['conditions'] = 'search_index like :SearchPhrase:';
        $parameters['bind']['SearchPhrase'] = "%$searchPhrase%";
    }

    /**
     * Save settings via an AJAX request.
     */
    public function saveAction(): void
    {
        if (!$this->request->isPost()) {
            return;
        }

        $dataId = $this->request->getPost('id', ['string', 'trim']);
        $callId = $this->request->getPost('call_id', ['string', 'trim']);
        $number = $this->request->getPost('number', ['alphanum']);
        $numberRep = $this->request->getPost('number_rep', ['string', 'trim'], $number);

        if (empty($callId) || empty($number)) {
            return;
        }

        // If we are unable to change the primary field, delete the old record and recreate it
        $oldId = null;
        $record = null;
        if (stripos($dataId, 'new') === false) {
            $record = PhoneBook::findFirstById($dataId);
            if ($record->number !== $number) {
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
                case 'number':
                    $record->number = $number;
                    break;
                case 'number_rep':
                    $record->number_rep = $numberRep;
                    break;
                case 'call_id':
                    $record->call_id = $callId;
                    break;
                case 'search_index':
                    // Collect data for the search index
                    $username = mb_strtolower($callId);
                    // Combine all fields into a single string
                    $record->search_index = $username . $number . $numberRep;
                    break;
                default:
                    break;
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
     * Delete a phonebook record.
     *
     * @param string|null $id The record ID to delete
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
     * Delete all phonebook records.
     */
    public function deleteAllRecordsAction(): void
    {
        $records = PhoneBook::find();
        foreach ($records as $record) {
            if (!$record->delete()) {
                $this->flash->error(implode('<br>', $record->getMessages()));
                $this->view->success = false;
                return;
            }
        }
        $this->view->success = true;
    }

    /**
     * Toggle input mask feature.
     */
    public function toggleDisableInputMaskAction(): void
    {
        if (!$this->request->isPost()) {
            return;
        }

        $settings = Settings::findFirst();
        if ($settings === null) {
            $settings = new Settings();
        }

        $settings->disableInputMask = $this->request->getPost('disableInputMask') ? '1' : '0';
        if (!$settings->save()) {
            $this->flash->error(implode('<br>', $settings->getMessages()));
            $this->view->success = false;
            return;
        }
        $this->view->success = true;
    }
}