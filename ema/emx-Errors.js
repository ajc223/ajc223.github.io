/// <reference path="~/bootstrap/ema.js" />
/// <reference path="~/bootstrap/ema.templates.js" />
/// <reference path="~/bootstrap/ema.validation.js" />
/*! errors.js */

!function ($, Handlebars) {
	var $document = $(document),
		$error = $('#error');

	var showError = function (error) {
		if (typeof error !== 'object') {
			error = { 'Message': error };
		}

		$error.empty()
			.html(Handlebars.templates.Error(error))
			.show();
	};

	//------- Error Events -------
	$error.on('click', '.close', function () {
		$error.hide();
	});
	$document.on('badRequest', function () {
		var jqXHR = arguments[1],
			json;
		if (jqXHR.getResponseHeader('Content-Type') === 'application/json; charset=utf-8') {
			json = JSON.parse(jqXHR.responseText);
			console.error('Bad Request: ' + JSON.stringify(json));
			// don't show the banner for Mindy, the form will highlight the invalid fields
		}
	});
	$document.on('badRequest', function () {
		var jqXHR = arguments[1],
			json, modelState, key, parts, name, value, $form, errors = {};
		if (jqXHR.getResponseHeader('Content-Type') === 'application/json; charset=utf-8') {
			json = JSON.parse(jqXHR.responseText);
			if (json) {
				if (json.ModelState) {
					modelState = json.ModelState;
					$form = $('.js-handlebadrequest');

					// build a name/value pair without the 'model.' prefix
					for (key in modelState) {
						parts = key.split('.');
						if (parts.length <= 2) {
							name = parts[1] || parts;
							value = modelState[key];

							// only show the first error per key
							errors[name] = ($.isArray(value) ? value[0] : value);
						}
					}

					// indicate the invalid fields in the form
					$form.validate().showErrors(errors);
				}
			}
		}
	});

	function safeRedirectUrl(redirectUrl) {
		return window.emaApplicationPath + 'Redirect/Safe?redirectUrl=' + window.encodeURIComponent(redirectUrl);
	}

	$document.on('notAuthorized', function () {
		var jqXHR = arguments[1];
		var redirectUrl = jqXHR.getResponseHeader('X-Error-Redirect-Location');
		if (redirectUrl) {
			console.error('Not Authorized, redirecting to ' + window.encodeURIComponent(redirectUrl));
			window.location.href = safeRedirectUrl(redirectUrl);
		} else {
			console.error('Not Authorized');
		}
	});
	$document.on('serviceUnavailable', function () {
		showError('The system is currently undergoing maintenance.');
		console.error('Service Unavailable');
	});
	$document.on('methodNotAllowed', function (event, method, url) {
		console.warn('Method ' + method + ' Not Allowed: ' + url);
		showError('The method ' + method + ' is not allowed for the route ' + url + '.');
	});
	$document.on('notFound', function (event, url) {
		console.warn('Not Found: ' + url);
		showError('The route ' + url + ' does not exist.');
	});
	$document.on('error', function () {
		var jqXHR = arguments[1],
			json;

		if (jqXHR.getResponseHeader('Content-Type') === 'application/json; charset=utf-8') {
			json = JSON.parse(jqXHR.responseText);

			console.error('Error: ' + JSON.stringify(json));

			showError($.extend({}, json, { 'TraceLogUrl': jqXHR.getResponseHeader('X-TraceLog-Location') }));
		}
		else {
			showError('An unknown error has occurred.');
		}
	});
	$document.on('unknownError', function () {
		showError('An unknown error has occurred.');
	});

}(window.jQuery, Handlebars);