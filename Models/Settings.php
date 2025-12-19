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

namespace Modules\ModulePhoneBook\Models;

use MikoPBX\Modules\Models\ModulesModelsBase;
use Modules\ModulePhoneBook\Lib\MikoPBXVersion;

class Settings extends ModulesModelsBase
{
    /**
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public $id;

    /**
     * Disable Input Mask
     *
     * @Column(type="integer", default="0", nullable=true)
     */
    public $disableInputMask;

    /**
     * Url for CallerID search
     *
     * @Column(type="string", nullable=true)
     */
    public $phoneBookApiUrl;

    /**
     * Lifetime in seconds
     *
     * @Column(type="integer", default="0", nullable=false)
     */
    public $phoneBookLifeTime;


    public function initialize(): void
    {
        $this->setSource('m_ModulePhoneBook');
        parent::initialize();
    }

    /**
     * Validates the settings before saving.
     *
     * @return bool Returns true if validation passes, otherwise false.
     */
    public function validation(): bool
    {
        $validationClass = MikoPBXVersion::getValidationClass();
        $callbackClass = MikoPBXVersion::getValidatorCallbackClass();
        $validation = new $validationClass();

        $validation->add(
            'phoneBookApiUrl',
            new $callbackClass(
                [
                    'callback' => function ($data) {
                        if (empty($data->phoneBookApiUrl)) {
                            return true;
                        }
                        // Check URL is valid
                        if (!filter_var($data->phoneBookApiUrl, FILTER_VALIDATE_URL)) {
                            return false;
                        }
                        // Check URL uses http/https scheme (SSRF protection)
                        $scheme = parse_url($data->phoneBookApiUrl, PHP_URL_SCHEME);
                        if (!in_array(strtolower($scheme), ['http', 'https'], true)) {
                            return false;
                        }
                        // Check URL contains %number% placeholder
                        return stripos($data->phoneBookApiUrl, '%number%') !== false;
                    },
                    'message' => $this->t('module_phnbk_UrlNotValid'),
                ]
            )
        );

        $validation->add(
            'phoneBookLifeTime',
            new $callbackClass(
                [
                    'callback' => function ($data) {
                        return $data->phoneBookLifeTime >= 0;
                    },
                    'message' => $this->t('module_phnbk_CacheLifetime') . ' - ' . $this->t('module_phnbk_IntegerPositiveOrZero'),
                ]
            )
        );

        return $this->validate($validation);
    }
}
