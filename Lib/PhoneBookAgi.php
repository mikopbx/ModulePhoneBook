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
use Phalcon\Di\Injectable;

/**
 * Class PhoneBook
 */
class PhoneBookAgi extends Injectable
{
    public static function setCallerID(string $type): void
    {
        try {
            $agi    = new AGI();
            if ($type === 'in') {
                $number = $agi->request['agi_callerid'];
            } else {
                $number = $agi->request['agi_extension'];
            }
            $number = '1' . substr($number, -9);
            $result = PhoneBook::findFirstByNumber($number);
            if ($result !== null && ! empty($result->call_id)) {
                if ($type === 'in') {
                    $agi->set_variable('CALLERID(name)', $result->call_id);
                } else {
                    $agi->set_variable('CONNECTEDLINE(name,i)', $result->call_id);
                }
            }
        } catch (\Throwable $e) {
            Util::sysLogMsg('PhoneBookAGI', $e->getMessage(), LOG_ERR);
        }
    }
}
