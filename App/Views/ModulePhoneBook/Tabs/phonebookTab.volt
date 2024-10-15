<div class="ui grid">
    <div class="ui row">
        <div class="ui seven wide column">
            {% if isAllowed('save') %}
                {{ link_to("#", '<i class="add user icon"></i>  '~t._('module_phnbk_AddNewRecord'), "class": "ui blue button", "id":"add-new-button") }}
            {% endif %}
        </div>
        <div class="ui nine wide column">
            <div class="ui search right action left icon fluid input" id="search-extensions-input">
                <i class="search link icon" id="search-icon"></i>
                <input type="search" id="global-search" name="global-search" placeholder="{{ t._('ex_EnterSearchPhrase') }}"
                       aria-controls="KeysTable" class="prompt">
                <div class="results"></div>
                <div class="ui basic floating search dropdown button" id="page-length-select">
                    <div class="text">{{ t._('ex_CalculateAutomatically') }}</div>
                    <i class="dropdown icon"></i>
                    <div class="menu">
                        <div class="item" data-value="auto">{{ t._('ex_CalculateAutomatically') }}</div>
                        <div class="item" data-value="25">{{ t._('ex_ShowOnlyRows', {'rows':25}) }}</div>
                        <div class="item" data-value="50">{{ t._('ex_ShowOnlyRows', {'rows':50}) }}</div>
                        <div class="item" data-value="100">{{ t._('ex_ShowOnlyRows', {'rows':100}) }}</div>
                        <div class="item" data-value="500">{{ t._('ex_ShowOnlyRows', {'rows':500}) }}</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div><br>
<table id="phonebook-table" class="ui small very compact single line table">
    <thead>
    <tr>
        <th class="collapsing"></th>
        <th class="ten wide">{{ t._('module_phnbk_ColumnName') }}</th>
        <th class="six wide">{{ t._('module_phnbk_ColumnNumber') }}</th>
        <th class="collapsing"></th>
    </tr>
    </thead>
    <tbody>
</table>