<div class="ui message">
    <div class="header">
        {{ t._('module_phnbk_ExcelInstructionHeader') }}
    </div>
    <ul class="list">
        <li>{{ t._('module_phnbk_ExcelInstructionStep1') }}</li>
        <li>{{ t._('module_phnbk_ExcelInstructionStep2') }}</li>
        <ul>
            <li>{{ t._('module_phnbk_ExcelInstructionStep2_1') }}</li>
            <li>{{ t._('module_phnbk_ExcelInstructionStep2_2') }}</li>
        </ul>
        <li>{{ t._('module_phnbk_ExcelInstructionStep3') }}</li>
        <li>{{ t._('module_phnbk_ExcelInstructionStep4') }}</li>
    </ul>
</div>


<div class="field">
    <label>{{ t._('module_phnbk_ImportFromExcelLabel') }}</label>
    <div class="ui action input select-file-for-upload">
        <input type="text" readonly>
        <input type="file" name="update-file" accept=".xls,.xlsx" style="display: none!important;"/>
        <div class="ui icon button select-file-for-upload">
            <i class="cloud upload alternate icon"></i>
        </div>
    </div>
</div>

<div class="field">
    <div class="ui indicating progress" id="upload-progress-bar">
        <div class="bar">
            <div class="progress"></div>
        </div>
        <div class="label" id="upload-progress-bar-label"></div>
    </div>
</div>

<div class="ui positive right floated buttons ">
    <div class="ui large left labeled icon button disabled" id="import-from-excel-button">
        <i class="file excel icon"></i>
        {{ t._('module_phnbk_ImportFromExcel') }}</div>
</div>
<div class="ui clearing hidden divider"></div>
