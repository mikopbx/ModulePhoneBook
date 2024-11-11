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

namespace Modules\ModulePhoneBook\Lib;

use MikoPBX\Common\Handlers\CriticalErrorsHandler;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Modules\ModulePhoneBook\Models\PhoneBook;
use Phalcon\Di\Injectable;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Reader\Exception as ReaderException;

include_once __DIR__ . '/../vendor/autoload.php';
/**
 * Class PhoneBookImport
 *
 * @property \MikoPBX\Common\Providers\TranslationProvider translation
 */
class PhoneBookImport extends Injectable
{
    /**
     * Upload and import phonebook records from an Excel file
     *
     * @param string $uploadedFilePath The path to the uploaded Excel file
     * @return PBXApiResult The result of the import process
     */
    public function run(string $uploadedFilePath): PBXApiResult
    {
        $result = new PBXApiResult();

        // Check if the uploaded file exists
        if (!file_exists($uploadedFilePath)) {
            $result->messages['error'][] = $this->translation->_('module_phnbk_NoFileUploaded');
            return $result;
        }

        // Validate file format
        if (!$this->validateExcelFile($uploadedFilePath)) {
            $result->messages['error'][] = $this->translation->_('module_phnbk_invalidFormat');
            return $result;
        }
        $result->success = true;
        // Load and process the file
        try {
            $spreadsheet = IOFactory::load($uploadedFilePath);
            $sheet = $spreadsheet->getActiveSheet();
            $highestRow = $sheet->getHighestDataRow();

            // Iterate over rows and process each record
            for ($row = 2; $row <= $highestRow; ++$row) {
                $callId = $sheet->getCell([1, $row])->getValue();
                $numberRep = $sheet->getCell([2, $row])->getValue();
                $number = $this->cleanPhoneNumber($numberRep);

                $res = $this->savePhonebookRecord($callId, $numberRep, $number);
                if (!$res->success) {
                    $result->success = false;
                    $result->messages['error'] = array_merge($result->messages['error']??[], $res->messages['error']??[]);
                }
            }
        } catch (\Throwable $e) {
            $result->messages['error'][] = CriticalErrorsHandler::handleExceptionWithSyslog($e);
            $result->success = false;
            return $result;
        }
        return $result;
    }

    /**
     * Validate if the file is a valid Excel file using PhpSpreadsheet
     *
     * @param string $filePath The path to the file to validate
     * @return bool True if the file is a valid Excel file, otherwise false
     */
    private function validateExcelFile(string $filePath): bool
    {
        try {
            // Use createReaderForFile to automatically select the correct reader
            $reader = IOFactory::createReaderForFile($filePath);
            $reader->load($filePath);
            return true;
        } catch (ReaderException $e) {
            return false; // The file is not a valid Excel file
        } catch (\Exception $e) {
            // Catch any other errors
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
            return false;
        }
    }

    /**
     * Save a single phonebook record to the database
     *
     * @param string $callId The caller ID
     * @param string $numberRep The phone number in its original format (with special characters)
     * @param string $number The cleaned phone number (digits only)
     * @return PBXApiResult The result of the save operation
     */
    private function savePhonebookRecord(string $callId, string $numberRep, string $number): PBXApiResult
    {
        $result = new PBXApiResult();

        $record = new PhoneBook();
        $record->call_id = $callId;
        $record->number_rep = $numberRep;
        $record->number = $number;
        // Collect data for the search index
        $username = mb_strtolower($callId);
        // Combine all fields into a single string
        $record->search_index = $username . $number . $numberRep;
        if (!$record->save()) {
            $errors = implode('<br>', $record->getMessages());
            $message = $this->translation->_("module_phnbk_ImportError");
            $result->messages['error'][] = "$message: $errors";
            return $result;
        }

        $result->success = true;
        return $result;
    }

    /**
     * Clean phone number by removing non-numeric characters
     *
     * @param string $numberRep The original phone number (including special characters)
     * @return string The cleaned phone number (digits only)
     */
    private function cleanPhoneNumber(string $numberRep): string
    {
        // Remove all non-numeric characters
        return preg_replace('/\D+/', '', $numberRep);
    }
}
