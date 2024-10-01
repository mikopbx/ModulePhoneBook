<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 12 2019
 */


namespace Modules\ModulePhoneBook\Models;

use MikoPBX\Modules\Models\ModulesModelsBase;
use Modules\ModulePhoneBook\Lib\MikoPBXVersion;


/**
 * Class PhoneBook
 *
 * @package Modules\ModulePhoneBook\Models
 *
 * @method static mixed findFirstByNumber(array|string|int $parameters = null)
 * @Indexes(
 *     [name='number', columns=['number'], type=''],
 *     [name='CallerID', columns=['CallerID'], type='']
 * )
 */
class PhoneBook extends ModulesModelsBase
{

    /**
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public $id;

    /**
     * Number for search i.e. 79065554343
     *
     * @Primary
     * @Column(type="integer", nullable=true)
     */
    public $number;

    /**
     * Number in visual format +7(926)991-12-12
     *
     * @Column(type="string", nullable=true)
     */
    public $number_rep;

    /**
     * CallerID - MIKO - Nikolay Beketov
     *
     * @Column(type="string", nullable=true)
     */
    public $call_id;

    public function initialize(): void
    {
        $this->setSource('m_PhoneBook');
        parent::initialize();
        $this->useDynamicUpdate(true);
    }


    public function validation(): bool
    {
        $validationClass = MikoPBXVersion::getValidationClass();
        $uniquenessClass = MikoPBXVersion::getUniquenessClass();
        $validation = new $validationClass();
        $validation->add(
            'number',
            $uniquenessClass(
                [
                    'message' => $this->t('module_phnbk_AlreadyExistWithThisNumber', ['repesent' => $this->number_rep]),
                ]
            )
        );

        return $this->validate($validation);
    }
}