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
<form action="{{ url('module-phone-book/module-phone-book/importFromExcel') }}" method="post" enctype="multipart/form-data"
      class="ui form">
    <div class="field">
        <label for="file">{{ t._('module_phnbk_ImportFromExcelLabel') }}</label>
        <input type="file" name="file" id="file" accept=".xls,.xlsx" required>
    </div>
    <button type="submit" class="ui green button">{{ t._('module_phnbk_ImportFromExcel') }}</button>
</form>

