#!/usr/bin/php
<?php

use MikoPBX\Core\System\Util;
use MikoPBX\Core\Asterisk\AGI;
use Modules\ModulePhoneBook\Models\PhoneBook;
require_once 'Globals.php';

$type = $argv[1]??'in';
try {
    $agi    = new AGI();
    if($type === 'in'){
        $number = $agi->request['agi_callerid'];
    }else{
        $number = $agi->request['agi_extension'];
    }
    $number = '1' . substr($number, -9);
    $result = PhoneBook::findFirstByNumber($number);
    if ($result !== null && ! empty($result->call_id)) {
        if($type === 'in'){
            $agi->set_variable('CALLERID(name)', $result->call_id);
        }else{
            $agi->set_variable('CONNECTEDLINE(name,i)', $result->call_id);
        }
    }
} catch (\Throwable $e) {
    Util::sysLogMsg('PhoneBookAGI', $e->getMessage(), LOG_ERR);
}