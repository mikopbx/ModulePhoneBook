<div class="ui grid">
    <div class="ui row">
        <div class="ui five wide column">
            {{ link_to("#", '<i class="add user icon"></i>  '~t._('module_phnbk_AddNewRecord'), "class": "ui blue button", "id":"add-new-button") }}
        </div>
        <div class="ui eleven wide column">
            <div class="ui icon fluid input">
                <input type="search" id="globalsearch" placeholder="{{ t._('Enter search') }}"
                       aria-controls="KeysTable">
                <i class="icon search"></i>
            </div>
        </div>

    </div>
</div>
<div class="ui hidden divider"></div>
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