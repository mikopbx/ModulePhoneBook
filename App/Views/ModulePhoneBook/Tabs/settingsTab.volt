<form method="post" action="{{ url('module-phone-book/module-phone-book/save') }}" role="form" class="ui large form">

<div class="ui toggle checkbox">
    {{ form.render('disableInputMask') }}
    <label for="disableInputMask">{{ t._('module_phnbk_disableInputMask') }}</label>
</div>
    {{ partial("partials/submitbutton",['indexurl':'']) }}
    <div class="ui clearing hidden divider"></div>
</form>