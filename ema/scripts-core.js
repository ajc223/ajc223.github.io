/// <reference path="~/bootstrap/ema.js" />
/// <reference path="~/bootstrap/ema.templates.js" />

function showSuccess(title, message, duration, callback) {
	if (callback === undefined || typeof callback !== 'function') {
		callback = function() {};
	}

	var modal = $(window.Ema.StaticAssets.Templates.TransientNotifications['TransientNotification']({ 'Title': title, 'Message': message, 'Type': 'success' }));

	modal.one('shown.bs.modal', function (e) {
		setTimeout(function() {
			modal.modal('hide');
			callback();
		}, duration ? duration : 1000);
	});

	modal.on('hidden.bs.modal', function () {
		modal.remove();
	});

	modal.modal();
}

function showFailure(title, message, duration) {
	var modal = $(window.Ema.StaticAssets.Templates.TransientNotifications['TransientNotification']({ 'Title': title, 'Message': message, 'Type': 'failure' }));

	modal.one('shown.bs.modal', function (e) {
		setTimeout(function () {
			modal.modal('hide');
		}, duration ? duration : 1500);
	});

	modal.on('hidden.bs.modal', function () {
		modal.remove();
	});

	modal.modal();
}

function showInfo(title, message, duration) {
	var modal = $(window.Ema.StaticAssets.Templates.TransientNotifications['TransientNotification']({ 'Title': title, 'Message': message, 'Type': 'info' }));

	modal.one('shown.bs.modal', function (e) {
		setTimeout(function () {
			modal.modal('hide');
		}, duration ? duration : 1750);
	});

	modal.on('hidden.bs.modal', function () {
		modal.remove();
	});

	modal.modal();
}
;(function (window) {
	var statusCodes = {
		noStatus: 0,
		internalServerError: 500,
		methodNotAllowed: 405,
		badRequest: 400
	};

	function safeRedirectUrl(redirectUrl) {
		return window.emaApplicationPath + 'Redirect/Safe?redirectUrl=' + window.encodeURIComponent(redirectUrl);
	}

	function tryRedirectOnError(jqXHR) {
		var redirectUrl = jqXHR.getResponseHeader('X-Error-Redirect-Location');
		if ((jqXHR.status === statusCodes.internalServerError || jqXHR.status === statusCodes.noStatus) && redirectUrl) {
			window.location.href = safeRedirectUrl(redirectUrl);
		}
	}

	function call(method, url, data, options) {
		var dfd = $.Deferred();
		var defaultOptions = {
			'cache': false,
			'data': data,
			'method': method,
			'traditional': true,
			//global
			'beforeSend': function (request) {
				request.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
			}
		};
		var ajaxOptions = $.extend(true, defaultOptions, options || {});

		$.ajax(url, ajaxOptions)
			.then(function () {
				dfd.resolveWith(this, arguments);
			}, function (jqXHR) {
				tryRedirectOnError(jqXHR);
				if (jqXHR.status === statusCodes.methodNotAllowed) {
					window.showFailure('Method Not Allowed', 'Verify that the ' + this.type + ' verb is allowed by the server configuration.', 3500);
				} else if (jqXHR.status === statusCodes.badRequest) {
					$(document).trigger('badRequest', arguments);
					dfd.rejectWith(this, arguments);
				} else {
					dfd.rejectWith(this, arguments);
				}
			});

		return dfd.promise();
	}

	window.ajax = {
		'Get': function (url, options) {
			return call('GET', url || '', '', options);
		},
		'Post': function (data, url, options) {
			return call('POST', url || '', data, options);
		},
		'Put': function (data, url, options) {
			return call('PUT', url || '', data, options);
		},
		'Delete': function (data, url, options) {
			return call('DELETE', url || '', data, options);
		},
		'Head': function (data, url, options) {
			return call('HEAD', url || '', data, options);
		}
	};
}(window));
;!function () {
	var names = ["log", "debug", "info", "warn", "error",
		"assert", "dir", "dirxml", "group", "groupEnd", "time",
		"timeEnd", "count", "trace", "profile", "profileEnd"],
		i, l = names.length;

	if (!window.console) {
		window.console = {};
	}

	// let devs use console statements without breaking older IE
	for (i = 0; i < l; i++) {
		if (!window.console[names[i]]) {
			window.console[names[i]] = $.noop;
		}
	}
}();

;/// <reference path="~/bootstrap/ema.js" />

$(function () {
	var contentTemplate = $('#js-menu').html(),
		$header = $('#js-menu-title').clone().removeClass('hide'),
		$title = $header.find('[data-title]'),
		$back = $header.find('[data-back]'),
		MAIN_MENU_TEXT = 'MENU';

	$title.text(MAIN_MENU_TEXT);

	function renderContent() {
		var $content = $(contentTemplate),
			$mainMenu = $content.find('.js-menu-main'),
			$currentMenu = $mainMenu;

		function displayMenu($newMenu) {
			$currentMenu.addClass('hide');
			$newMenu.removeClass('hide');

			$currentMenu = $newMenu;
		}

		function displayTitleText(text) {
			$title.text(text);
		}

		function displaySubmenuTitle(text) {
			$back.removeClass('hide')
				.one('click', function (event) {
					returnToMainMenu();

					// prevent click from closing the popover
					event.stopPropagation();
				});
			displayTitleText(text);
		}

		function returnToMainMenu() {
			displayTitleText(MAIN_MENU_TEXT);
			$back.addClass('hide');
			displayMenu($mainMenu);
		}

		$content.find('[data-menu]').on('click', function () {
			var $link = $(this),
				$submenu = $content.find('.' + $link.data('menu'));

			displaySubmenuTitle($link.text());
			displayMenu($submenu);
		});

		return $content;
	}

	$('.js-popover-menu').popover({
		placement: 'bottom',
		title: $header,
		html: true,
		content: renderContent
	});
});