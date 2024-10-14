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


    public function initialize(): void
    {
        $this->setSource('m_ModulePhoneBook');
        parent::initialize();
    }
}
