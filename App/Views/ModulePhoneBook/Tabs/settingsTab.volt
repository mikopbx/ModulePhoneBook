<div class="ui modal" id="delete-all-modal-form">
    <div class="header">
        {{ t._('module_phnbk_DeleteAllTitle') }}
    </div>
    <div class="image content">
        <div class="image">
            <i class="icon attention"></i>
        </div>
        <div class="description">
            {{ t._('module_phnbk_DeleteAllDescription') }}
        </div>
    </div>
    <div class="actions">
        <div class="ui cancel button">{{ t._('module_phnbk_CancelBtn') }}</div>
        <div class="ui approve red button">{{ t._('module_phnbk_Approve') }}</div>
    </div>
</div>


    <div class="field">
        <div class="ui segment">
            <div class="ui toggle checkbox" id="disable-input-mask">
                {{ form.render('disableInputMask') }}
                <label for="disableInputMask">{{ t._('module_phnbk_disableInputMask') }}</label>
            </div>
        </div>
    </div>
    <div class="field">
        <div class="ui labeled icon basic button" id="delete-all-records"><i class="red trash icon"></i>{{ t._('module_phnbk_DeleteAllRecords') }}</div>
    </div>
