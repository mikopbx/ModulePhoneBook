<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 12 2019
 */

namespace Modules\ModulePhoneBook\Lib;


use MikoPBX\Core\Asterisk\Configs\ExtensionsConf;
use MikoPBX\Core\System\PBX;
use MikoPBX\Modules\Config\ConfigClass;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Class PhoneBook
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
        switch ($action){
            default:
                $res->success = false;
                $res->messages[]='API action not found in moduleRestAPICallback ModulePhoneBook';
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
        return "same => n,AGI({$this->moduleDir}/agi-bin/agi_phone_book.php,in)".PHP_EOL;
    }

    public function generateOutRoutContext(array $rout): string
    {
        return 'same => n,Set(CONNECTED_LINE_SEND_SUB=phone-book-out,${EXTEN},1)'."\n\t";
    }

    /**
     * Prepares additional contexts sections in the extensions.conf file
     *
     * @return string
     */
    public function extensionGenContexts(): string
    {
        // Set(CONNECTEDLINE(name,i)=Zavod)
        return  '[phone-book-out]'.PHP_EOL.
            'exten => '.ExtensionsConf::ALL_NUMBER_EXTENSION.",1,AGI({$this->moduleDir}/agi-bin/agi_phone_book.php,out)\n\t".
            'same => n,return'.PHP_EOL;
    }

    /**
     * Process after enable action in web interface
     *
     * @return void
     */
    public function onAfterModuleEnable(): void
    {
        PBX::dialplanReload();
    }

}
