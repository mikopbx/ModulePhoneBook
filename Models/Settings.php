<?php

/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2019
 */

/*
 * https://docs.phalconphp.com/3.4/ru-ru/db-models-metadata
 *
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
