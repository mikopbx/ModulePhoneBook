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
        <div class="ui segment">
            <div class="wide field">
                <label for="phoneBookApiUrl">{{ t._('module_phnbk_ApiUrl') }}</label>
                {{ form.render('phoneBookApiUrl') }}
                <div>{{ t._('module_phnbk_ApiUrlDescription', {'repesent': '%number%'}) }}</div>
            </div>
            <div class="wide field">
                <label for="phoneBookLifeTime">{{ t._('module_phnbk_СacheLifetime') }}</label>
                {{ form.render('phoneBookLifeTime') }}
                <div>{{ t._('module_phnbk_СacheLifetimeDescription') }}</div>
            </div>
            <div class="field">
                <div class="ui labeled icon positive button" id="btn-save-settings-api"><i class="save icon"></i>{{ t._('module_phnbk_SaveBtn') }}</div>
            </div>
        </div>
    </div>
    <div class="field">
        <div class="ui labeled icon basic button" id="delete-all-records"><i class="red trash icon"></i>{{ t._('module_phnbk_DeleteAllRecords') }}</div>
    </div>
