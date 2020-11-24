#!/usr/bin/php
<?php

use MikoPBX\Core\System\Util;
use MikoPBX\Core\Asterisk\AGI;
use Modules\ModulePhoneBook\Models\PhoneBook;
require_once 'Globals.php';
try {
    $agi    = new AGI();
    $number = $agi->request['agi_callerid'];
    $number = '1' . substr($number, -9);
    $result = PhoneBook::findFirstByNumber($number);
    if ($result !== null && ! empty($result->call_id)) {
        $agi->set_variable('CALLERID(name)', $result->call_id);
    }
} catch (Exception $e) {
    Util::sysLogMsg('PhoneBookAGI', $e->getMessage());
}