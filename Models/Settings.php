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
     * Validates the instance by ensuring the uniqueness of the 'number' attribute.
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
                        return empty($data->phoneBookApiUrl) || (filter_var($data->phoneBookApiUrl, FILTER_VALIDATE_URL) && stripos($data->phoneBookApiUrl, '%number%') !== FALSE);
                    },
                    'message' => $this->t('module_phnbk_UrlNotValid'),
                ]
            )
        );

        return $this->validate($validation);
    }
}
