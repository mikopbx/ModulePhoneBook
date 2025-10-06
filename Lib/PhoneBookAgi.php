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

use MikoPBX\Core\Asterisk\AGI;
use MikoPBX\Core\System\Util;
use Modules\ModulePhoneBook\Models\PhoneBook;
use Modules\ModulePhoneBook\Models\Settings;
use Phalcon\Di\Injectable;

/**
 * Class PhoneBookAgi
 * Handles setting the caller ID for inbound and outbound calls using the phonebook.
 */
class PhoneBookAgi extends Injectable
{
    /**
     * Set the caller ID or connected line ID based on the type of call (inbound or outbound)
     *
     * @param string $type The type of the call: 'in' for inbound calls or 'out' for outbound calls
     * @return void
     */
    public static function setCallerID(string $type): void
    {
        try {
            $agi = new AGI();

            // For inbound calls, use the caller's number; for outbound, use the extension number
            if ($type === 'in') {
                $number = $agi->request['agi_callerid'];
            } else {
                $number = $agi->request['agi_extension'];
            }
            $number_orig = $number;
            // Normalize the phone number to match the expected format (last 9 digits)
            $number =  PhoneBook::cleanPhoneNumber($number, TRUE);

            // Find the corresponding phonebook entry by the number
            $result = PhoneBook::findFirstByNumber($number);

            if (!($result !== NULL && !empty($result->call_id))){
                // The record was not found - we are searching through the API
                $result = self::findApiByNumber($number, $number_orig);
            }

            // If a matching record is found and the call_id is not empty, set the appropriate caller ID
            if ($result !== null && !empty($result->call_id)) {
                if ($type === 'in') {
                    $agi->set_variable('CALLERID(name)', $result->call_id);
                } else {
                    $agi->set_variable('CONNECTEDLINE(name,i)', $result->call_id);
                }
            }
        } catch (\Throwable $e) {
            // Log the error message if an exception occurs
            Util::sysLogMsg('PhoneBookAGI', $e->getMessage(), LOG_ERR);
        }
    }

    /**
     * Find CallerID from API
     *
     * @param string $number
     * @param string|null $number_orig
     * @return PhoneBook|null
     */
    private static function findApiByNumber(string $number, ?string $number_orig = null): ?PhoneBook
    {
        if (!empty($number)) {
            $settings = Settings::findFirst();
            $url = !empty($settings->phoneBookApiUrl) ? str_replace(
                '%number%',
                $number,
                $settings->phoneBookApiUrl
            ) : null;

            if (!empty($url)) {
                $callerID = self::curl_get_contents($url);

                // Logging
                Util::sysLogMsg(
                    'PhoneBookAGI',
                    'Find CallerID from API: ' . $number . ' => ' . (empty($callerID) ? 'NOT FOUND' : $callerID),
                    LOG_INFO
                );

                if ($callerID !== NULL) {
                    // Saving the number in the phonebook
                    $numberRep = empty($number_orig) ? substr($number, -9) : $number_orig;
                    $record = new PhoneBook();
                    $record->setPhonebookRecord($callerID, $record->cleanPhoneNumber($numberRep), $_SERVER['REQUEST_TIME']);
                    if (!$record->save()) {
                        // Log the error message if an exception occurs
                        Util::sysLogMsg('PhoneBookAGI', implode(' | ', $record->getMessages()), LOG_ERR);
                    }else{
                        return $record;
                    }
                }
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
    private static function curl_get_contents(string $url): ?string
    {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($ch, CURLOPT_TIMEOUT, 3); // Short timeout - 3 sec
        $result = curl_exec($ch);
        curl_close($ch);
        return empty(trim($result)) ? NULL : trim($result);
    }
}
