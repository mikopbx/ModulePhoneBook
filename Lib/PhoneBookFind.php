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

use GuzzleHttp\Client;
use GuzzleHttp\Exception\ClientException;
use GuzzleHttp\Exception\GuzzleException;
use MikoPBX\Core\System\Util;
use Modules\ModulePhoneBook\Models\PhoneBook;
use Modules\ModulePhoneBook\Models\Settings;
use Phalcon\Di\Injectable;

include_once __DIR__ . '/../vendor/autoload.php';

/**
 * Class PhoneBookFind
 *
 */
class PhoneBookFind extends Injectable
{
    /**
     * Find CallerID from API
     *
     * @param string $number_search
     * @param PhoneBook|null $oldPhoneBook
     * @return PhoneBook|null
     */
    public function findApiByNumber(string $number_search, ?PhoneBook $oldPhoneBook = NULL): ?PhoneBook
    {
        // Normalize the phone number to match the expected format (last 9 digits)
        $number = PhoneBook::cleanPhoneNumber($number_search, TRUE);

        if (empty($number)) {
            return NULL;
        }

        $settings = Settings::findFirst();
        $apiUrl = ($settings !== null) ? ($settings->phoneBookApiUrl ?? '') : '';
        if (empty($apiUrl)) {
            return null;
        }
        $url = str_replace('%number%', $number, $apiUrl);
        $callerID = $this->getRequest($url);

        // Logging
        Util::sysLogMsg(
            'PhoneBookAGI',
            "Find CallerID from API: $number => " . (empty($callerID) ? 'NOT FOUND' : $callerID)
        );

        if ($callerID !== NULL) {
            // Saving the number in the phonebook
            $record = $oldPhoneBook !== NULL && $oldPhoneBook->number === $number ? $oldPhoneBook : PhoneBook::findFirstByNumber(
                $number
            );

            if ($record == NULL) {
                $record = new PhoneBook();
            }

            $record->setPhonebookRecord(
                $callerID,
                $number_search,
                time()
            );

            if (!$record->save()) {
                // Log the error message if an exception occurs
                Util::sysLogMsg('PhoneBookAGI', implode(' | ', $record->getMessages()), LOG_ERR);
            } else {
                return $record;
            }
        }

        return NULL;
    }

    /**
     * Get the $url content with CURL
     *
     * @param string $url
     * @return string|null
     */
    private function getRequest(string $url): ?string
    {
        $callerId = NULL;
        try {
            $client = new Client([
                'timeout' => 3,
                'connect_timeout' => 2
            ]);
            $response = $client->get($url);
            $status = $response->getStatusCode();
            if ($status === 200) {
                // Just trim here, sanitization is done in PhoneBook::setPhonebookRecord()
                $callerId = trim($response->getBody()->getContents());
            }
        } catch (ClientException $e) {
            // ClientException catches 4xx errors - not logging as these are expected
        } catch (GuzzleException $e) {
            // Log the error message if an exception occurs
            Util::sysLogMsg('PhoneBookAGI', $e->getMessage(), LOG_ERR);
        }

        return !empty($callerId) ? $callerId : NULL;
    }
}
