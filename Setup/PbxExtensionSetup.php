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
namespace Modules\ModulePhoneBook\Setup;

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Modules\Setup\PbxExtensionSetupBase;
use Modules\ModulePhoneBook\Lib\MikoPBXVersion;
use Modules\ModulePhoneBook\Models\PhoneBook;

class PbxExtensionSetup extends PbxExtensionSetupBase
{
    /**
     * Creates the database structure according to models' annotations.
     * If necessary, it fills some default settings and changes the sidebar menu item representation for this module.
     * After installation, it registers the module on the PbxExtensionModules model.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-installer#fixfilesrights
     *
     * @return bool The result of the installation process.
     */
    public function installDB(): bool
    {
        $result = parent::installDB();

        if ($result) {
            $records = PhoneBook::find();
            foreach ($records as $record) {
                // Collect data for the search index
                $username = mb_strtolower($record->call_id);
                // Combine all fields into a single string
                $record->search_index =  $username . $record->number . $record->number_rep;
                $result = $record->save();
                if (!$result) {
                    SystemMessages::sysLogMsg(__METHOD__, implode(' ', $result->getMessages()));
                    return false;
                }
            }
        }
        return $result;
    }
    /**
     * Добавляет модуль в боковое меню
     *
     * @return bool
     */
    public function addToSidebar(): bool
    {
        $menuSettingsKey           = "AdditionalMenuItem{$this->moduleUniqueID}";
        $texClass = MikoPBXVersion::getTextClass();
        $unCamelizedControllerName = $texClass::uncamelize($this->moduleUniqueID, '-');
        $menuSettings              = PbxSettings::findFirstByKey($menuSettingsKey);
        if ($menuSettings === null) {
            $menuSettings      = new PbxSettings();
            $menuSettings->key = $menuSettingsKey;
        }
        $value               = [
            'uniqid'        => $this->moduleUniqueID,
            'href'          => "/admin-cabinet/$unCamelizedControllerName/$unCamelizedControllerName/index",
            'group'         => 'setup',
            'iconClass'     => 'address book',
            'caption'       => "Breadcrumb$this->moduleUniqueID",
            'showAtSidebar' => true,
        ];
        $menuSettings->value = json_encode($value);

        return $menuSettings->save();
    }
}
