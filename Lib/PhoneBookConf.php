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
 * Handles phone book configuration for the module
 */
class PhoneBookConf extends ConfigClass
{
    /**
     * Process CoreAPI requests with root privileges
     *
     * @param array $request The request data passed to the API
     * @return PBXApiResult An object containing the result of the API call
     */
    public function moduleRestAPICallback(array $request): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $action = strtoupper($request['action']);
        $data = $request['data'];

        switch ($action) {
            case 'IMPORT-FROM-EXCEL':
                $processor = new PhoneBookImport();
                $res = $processor->run($data['uploadedFilePath']);
                break;
            default:
                $res->success = false;
                $res->messages[] = 'API action not found in moduleRestAPICallback ModulePhoneBook';
        }

        return $res;
    }

    /**
     * Customize the incoming route context for a specific route
     *
     * @param string $rout_number The route number
     * @return string The generated incoming route context
     */
    public function generateIncomingRoutBeforeDial($rout_number): string
    {
        return "same => n,AGI({$this->moduleDir}/agi-bin/agi_phone_book.php,in)" . PHP_EOL;
    }

    /**
     * Generate the outgoing route context for a specific route
     *
     * @param array $rout The route configuration array
     * @return string The generated outgoing route context
     */
    public function generateOutRoutContext(array $rout): string
    {
        return 'same => n,Set(CONNECTED_LINE_SEND_SUB=phone-book-out,${EXTEN},1)' . "\n\t";
    }

    /**
     * Prepares additional context sections in the extensions.conf file
     *
     * @return string The context generated for phone book operations in extensions.conf
     */
    public function extensionGenContexts(): string
    {
        // Set(CONNECTEDLINE(name,i)=Zavod)
        return '[phone-book-out]' . PHP_EOL .
            'exten => ' . ExtensionsConf::ALL_NUMBER_EXTENSION . ",1,AGI({$this->moduleDir}/agi-bin/agi_phone_book.php,out)\n\t" .
            'same => n,return' . PHP_EOL;
    }

    /**
     * Triggered after the module is enabled in the web interface
     *
     * @return void
     */
    public function onAfterModuleEnable(): void
    {
        PBX::dialplanReload();
    }
}
