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

/**
 * Class PhoneBook
 *
 * @package Modules\ModulePhoneBook\Models
 *
 * @method static mixed findFirstByNumber(array|string|int $parameters = null)
 * @Indexes(
 *     [name='number', columns=['number'], type=''],
 *     [name='CallerID', columns=['call_id'], type=''],
 *     [name='Created', columns=['created'], type='']
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

    /**
     * Field with search words for full text search, consist of username, number, mobile in lower case
     *
     * @Column(type="string", nullable=true, default="")
     */
    public ?string $search_index = "";

    /**
     * Created - Created timestamp or 0
     *
     * @Column(type="integer", nullable=false, default=0)
     */
    public int $created = 0;

    /**
     * Initializes the model by setting the source table,
     * calling the parent initializer, and enabling dynamic updates.
     *
     * @return void
     */
    public function initialize(): void
    {
        $this->setSource('m_PhoneBook');
        parent::initialize();
        $this->useDynamicUpdate(true);
    }


    /**
     * Validates the instance by ensuring the uniqueness of the 'number' attribute.
     *
     * @return bool Returns true if validation passes, otherwise false.
     */
    public function validation(): bool
    {
        $validationClass = MikoPBXVersion::getValidationClass();
        $uniquenessClass = MikoPBXVersion::getUniquenessClass();
        $validation = new $validationClass();

        $validation->add(
            'number',
            new $uniquenessClass(
                [
                    'message' => $this->t('module_phnbk_AlreadyExistWithThisNumber', ['repesent' => $this->number_rep]),
                ]
            )
        );

        return $this->validate($validation);
    }


    /**
     *
     * @param string $callId
     * @param string $numberRep
     * @param int $created
     * @return void
     */
    public function setPhonebookRecord(string $callId, string $numberRep, int $created = 0): void
    {
        $this->call_id = trim(strip_tags(str_replace('"',"'", $callId)));
        $this->number_rep = $numberRep;
        $this->number = $this->cleanPhoneNumber($numberRep, TRUE);
        $this->created = $created;

        // Combine all fields into a single string
        $this->search_index = mb_strtolower($callId) . $this->number . $this->number_rep;
    }

    /**
     * Clean phone number by removing non-numeric characters
     *
     * @param string $numberRep The original phone number (including special characters)
     * @param boolean $isNormalize Is Normalize number
     * @return string The cleaned phone number (digits only)
     */
    public static function cleanPhoneNumber(string $numberRep, bool $isNormalize = FALSE): string
    {
        // Remove all non-numeric characters
        $numberRep = preg_replace('/\D+/', '', $numberRep);
        // Normalize number
        return $isNormalize ? '1' . substr($numberRep, -9) : $numberRep;
    }
}
