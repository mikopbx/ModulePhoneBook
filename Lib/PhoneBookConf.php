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

use MikoPBX\Core\Asterisk\Configs\ExtensionsConf;
use MikoPBX\Core\System\PBX;
use MikoPBX\Modules\Config\ConfigClass;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Class PhoneBookConf
 */
class PhoneBookConf extends ConfigClass
{
    /**
     *  Process CoreAPI requests under root rights
     *
     * @param array $request
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public function moduleRestAPICallback(array $request): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $action = strtoupper($request['action']);
        switch ($action) {
            default:
                $res->success = false;
                $res->messages[] = 'API action not found in moduleRestAPICallback ModulePhoneBook';
        }
        return $res;
    }

    /**
     * Кастомизация входящего контекста для конкретного маршрута.
     *
     * @param $rout_number
     *
     * @return string
     */
    public function generateIncomingRoutBeforeDial($rout_number): string
    {
        return "same => n,AGI({$this->moduleDir}/agi-bin/agi_phone_book.php,in)" . PHP_EOL;
    }

    public function generateOutRoutContext(array $rout): string
    {
        return 'same => n,Set(CONNECTED_LINE_SEND_SUB=phone-book-out,${EXTEN},1)' . "\n\t";
    }

    /**
     * Prepares additional contexts sections in the extensions.conf file
     *
     * @return string
     */
    public function extensionGenContexts(): string
    {
        // Set(CONNECTEDLINE(name,i)=Zavod)
        return  '[phone-book-out]' . PHP_EOL .
            'exten => ' . ExtensionsConf::ALL_NUMBER_EXTENSION . ",1,AGI({$this->moduleDir}/agi-bin/agi_phone_book.php,out)\n\t" .
            'same => n,return' . PHP_EOL;
    }

    /**
     * Process after enables action in web interface
     *
     * @return void
     */
    public function onAfterModuleEnable(): void
    {
        PBX::dialplanReload();
    }
}
