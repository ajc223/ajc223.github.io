/// <reference path="~/bootstrap/ema.js" />

//------- console support -------
!function () {
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
		'Patch': function (data, url, options) {
			return call('PATCH', url || '', data, options);
		},
		'Head': function (data, url, options) {
			return call('HEAD', url || '', data, options);
		}
	};
}(window));
;/// <reference path="~/bootstrap/ema.js" />

function disableModal($modal) {
	/// <summary>Disable a modal form</summary>
	var $form = $modal.find('form');

	$modal.find('.modal-dialog').addClass('text-muted');
	// if you put a delay on this make sure enableModal works if called quickly after
	$modal.find('.modal-body').addClass('is-loading');
	$form.addClass('form-disabled');
	$form.find(':enabled').prop('disabled', true);
}

function enableModal($modal) {
	/// <summary>Enable a modal form</summary>
	var $form = $modal.find('form');

	$modal.find('.modal-dialog').removeClass('text-muted');
	$modal.find('.modal-body').removeClass('is-loading');
	$form.removeClass('form-disabled');
	$form.find(':disabled').prop('disabled', false);
}
;/// <reference path="~/bootstrap/ema.js" />
/// <reference path="~/bootstrap/ema.templates.js" />
/// <reference path="Modal.js" />

function showConfirmDelete(title, message, deleteRequest, doneCallback, cancelRequest, failCallback) {
	// Due to a bug in IE9 and IE10, if you blur the body, it will switch windows
	var $docElement = $(document.activeElement);
	if ($docElement !== document.body) {
		$docElement.blur();
	}
	var modal = $(Handlebars.templates['ConfirmDeleteModal']({ 'Title': title, 'Message': message }));

	modal.on('shown.bs.modal', function () {
		var cancelButton = $('#js-modal-cancel');
		cancelButton.focus();
		$('#js-modal-delete').on('click', function () {

			var deferred = $.Deferred(function () {
				disableModal(modal);
			})
			.done(function () {
				if (doneCallback) {
					doneCallback();
				}
			})
			.fail(function () {
				if (failCallback) {
					failCallback();
				}
				showFailure('There was a problem.', 'Your delete failed. Please try again.');
			})
			.always(function () {
				modal.modal('hide');
			});

			deleteRequest().done(function () {
				deferred.resolve();
			}).fail(function () {
				deferred.reject();
			});
		});

		//There are some cases in facts where we perform a request on cancel
		cancelButton.on('click', function () {
			if (!cancelRequest)
				return;

			var cancelPromise = $.Deferred(function () {
				disableModal(modal);
			})
			.done(function () {
				if (doneCallback) {
					doneCallback();
				}
			})
			.fail(function () {
				if (failCallback) {
					failCallback();
				}
				showFailure('There was a problem.', 'Your delete failed. Please try again.');
			})
			.always(function () {
				modal.modal('hide');
			});

			cancelRequest().done(function () {
				cancelPromise.resolve();
			}).fail(function () {
				cancelPromise.reject();
			});
		});
	});

	modal.on('hidden.bs.modal', function () {
		modal.remove();
	});

	modal.modal();
};
;/// <reference path="~/bootstrap/ema.js" />

// html.css renders lt-ieXX classes via Conditional Comments to denote the active IE renderer.
// Normally, this is enough for targeting specific ie versions.

// However, when LPL frames us in, and their outer frame is in compatibility view,
// the inner frame (us) has a browser mode of the current version, but a document mode of 8.
// This results in html/css laid out with a modern ruleset, but with an IE8 JS engine.

// For LPL, this means that ie8 targeted JS using lt-ie9 will not be executed
// within their wrapper as the browser mode will report the current version.

// Instead, we will use document mode alone as an indicator of the current JS rendering engined used by IE,
// and apply the class js-lt-ie9 to the <html> tag which can be used reliably.

(function() {

	var documentModeIsSet = function() {
		return typeof document.documentMode !== 'undefined';
	}

	// Document Mode is only set in Internet Explorer
	if (!documentModeIsSet()) {
		return;
	}

	if (document.documentMode < 9) {
		$('html').addClass('js-lt-ie9');
	}

})();

;/// <reference path="~/bootstrap/ema.js" />

$(function () {
	$(document).on('click', '.js-combobox-item', function (e) {
		var parent = $(this).closest('.js-combobox'),
			input = parent.find('input');

		input.val($(this).find('a').text());
		input.trigger('change');
		input.trigger('focus');

		input.trigger('updated.bs.combobox');
	});
});
;/// <reference path="~/bootstrap/ema.js" />
/// <reference path="~/bootstrap/ema.templates.js" />
/// <reference path="../modernizr.custom.js" />

(function (supportsTransitions) {
	function showConfirmDeleteInlineAsync(target) {
		var deferred = new $.Deferred();

		var container = target.closest('.inlinedelete-container'),
			controls = $(Handlebars.templates['InlineDelete']());

		var row = target.closest('tr'),
			dimensions = getDimensions(row);

		function dismissWithTransition() {
			controls.one('webkitTransitionEnd transitionend', controls.remove);

			controls.css({
				left: dimensions.leftHidden
			});
		}

		function dismiss() {
			if (supportsTransitions) {
				dismissWithTransition();
			} else {
				controls.remove();
			}
		}

		controls
			.one('click', '.js-inlinedelete-confirm', deferred.resolve)
			.css({
				top: dimensions.top + 'px',
				left: dimensions.leftHidden + 'px',
				width: dimensions.width + 'px',
				height: dimensions.height + 'px'
			});

		container.append(controls);

		// use a setTimeout so that the controls are rendered hidden before being animated in
		setTimeout(function () {
			controls.css({
				left: dimensions.leftVisible + 'px'
			});

			$(document).one('click', dismiss);
		}, 0);

		return deferred.promise();
	}

	function getDimensions(row) {
		var position = row.position(),
			width = row.width(),
			height = row.height();

		return {
			leftHidden: position.left + width,
			leftVisible: position.left,
			top: position.top,
			width: width,
			height: height
		};
	}

	window.showConfirmDeleteInline = showConfirmDeleteInlineAsync;
}(Modernizr.csstransitions));
;/// <reference path="~/bootstrap/ema.js" />
/// <reference path="~/bootstrap/ema.templates.js" />
/// <reference path="Modal.js" />

function showConfirmModal(model, request, doneCallback, failCallback) {
	var defaultModel = {
		'Title': 'Confirmation',
		'Message': 'Are you sure?',
		'ButtonClass': 'btn-primary',
		'ButtonText': 'Confirm',
		'ButtonLoadingText': 'Confirming...',
		'TitleIconClass': '',
		'HideFailureMessage': false
		},
		effectiveModel = $.extend({}, defaultModel, model),
		$modal = $(Handlebars.templates['ConfirmModal'](effectiveModel));

	$modal.on('shown.bs.modal', function () {
		$('#js-modal-confirm').on('click', function () {
			var $btn = $(this);
			$btn.button('loading');

			var deferred = $.Deferred(function () {
				disableModal($modal);
			})
			.done(function (result) {
				if (doneCallback) {
					doneCallback(result);
				}
			})
			.fail(function () {
				if (failCallback) {
					failCallback();
				}
				if (!effectiveModel.HideFailureMessage) {
					showFailure('There was a problem.', 'Please try again.');
				}
			})
			.always(function () {
				$btn.button('reset');
				$modal.modal('hide');
			});

			request().done(function (result) {
				deferred.resolve(result);
			})
			.fail(function () {
				deferred.reject();
			});
		});
	});

	$modal.on('hidden.bs.modal', function () {
		$modal.remove();
	});

	$modal.modal();
};
;/// <reference path="~/bootstrap/ema.js" />
/// <reference path="~/bootstrap/ema.templates.js" />
/// <reference path="~/bootstrap/ema.validation.js" />
/// <reference path="ajax.js" />
/// <reference path="Modal.js" />
/// <reference path="TransientNotifications.js" />

$(document).on('click', '.js-contactus', function (e) {
	var contactSupportEndpoint = window.emaApplicationPath + "Advisor/Services/ContactSupport";

	ajax.Get(contactSupportEndpoint).done(function (data) {
		var modal = $(Handlebars.templates['ContactSupportModal'](data));

		modal.on('shown.bs.modal', function (e) {
			var form = $(this).find('form');

			$.validator.unobtrusive.parse(form);
			form.find(':text:first').focus();

			form.on('submit', function (e) {
				if (form.valid()) {
					var data = form.serialize();
					disableModal(modal);
					ajax.Post(data, contactSupportEndpoint)
						.done(function () {
							showSuccess('Success!', 'Your message has been sent.');
						})
						.fail(function () {
							showFailure('There was a problem', 'Your message was not sent. Please try again.');
						})
						.always(function () {
							modal.modal('hide');
						});
				}
				return false;
			});
		});

		modal.on('hidden.bs.modal', function () {
			modal.remove();
		});

		modal.modal();
	})
	.fail(function () {
		showFailure('There was a problem.', 'Please try again.');
	});
});
;/// <reference path="~/bootstrap/ema.js" />
/// <reference path="~/bootstrap/ema.templates.js" />
/*! handlebars.helpers.js */

!function (Handlebars) {
	Handlebars.registerHelper('json', function (context) {
		return JSON.stringify(context);
	});
}(Handlebars);
;var Navigation = (function () {
	var cacheKey = 'emaNavigation';
	var autoPushNavigation = true;

	function getStack() {
		/// <returns type="Array" />

		var entry = sessionStorage.getItem(cacheKey);
		if (entry === null)
			return [];

		return JSON.parse(entry);
	}

	function setStack(stack) {
		/// <param name="stack" type="Array">The stack that should be stored.</param>

		//  If the stack is empty, just remove the key from session storage
		if (!stack || stack.length === 0) {
			sessionStorage.removeItem(cacheKey);
			return;
		}

		sessionStorage.setItem(cacheKey, JSON.stringify(stack));
	}

	function top () {
		return get(0);
	};

	function previous() {
		//  See if the current page corresponds to the topmost entry, if NOT then we
		//  must be on page that wasn't pushed onto the stack.
		//  In this case, the topmost entry must be the page we just came from.
		var entry = top();

		if (entry === null) {
			return null;
		}

		if (entry.url !== document.location.href) {
			return entry;
		}

		//  Return the next entry
		return get(1);
	};

	function get(delta) {
		var stack = getStack();
		if (stack.length <= delta)
			return null;

		var index = stack.length - Math.abs(delta) - 1;
		var untrustedEntry = stack[index];

		// Check indexOf('http') === 0 to prevent a malicious string that starts with 'javascript:'.
		var entry = {
			url: untrustedEntry.url.indexOf('http') === 0 ? untrustedEntry.url : '#',
			urlKey: untrustedEntry.urlKey,
			text: Encoder.encodeHTML(untrustedEntry.text)
		};

		return entry;
	};

	return {
		clear: function () {
			setStack(null);
		},
		top: top,
		previous: previous,
		get: get,
		push: function (text, url, urlKey) {
			/// <param name="text" type="String" optional="true">The text that should be shown on the back link.</param>
			/// <param name="url" type="String" optional="true">The Url that the back link should direct the user to.</param>
			/// <param name="urlKey" type="String">A unique identifier for the url being pushed.</param>

			//  Set parameters if they were omitted
			if (!text)
				text = document.title;

			if (!url)
				url = document.location.href;

			if (!urlKey)
				urlKey = emaPageRoute || document.location.href.split('#')[0];

			//  Remove any entries after (and including) the current url key
			var stack = getStack();
			var index = -1;

			for (var i = 0 ; i < stack.length ; i++) {
				var element = stack[i];
				if (element.urlKey === urlKey) {
					index = i;
					break;
				}
			}
			if (index !== -1)
				stack = stack.slice(0, index);

			stack.push({
				urlKey: urlKey,
				url: url,
				text: text
			});

			setStack(stack);
		},
		pop: function () {
			var stack = getStack();
			if (stack.length === 0)
				return null;

			var entry = stack.pop();
			setStack(stack);
			return entry;
		},
		isAutoPushNavigationEnabled: function () {
			//  If this is a NEW page in emx, automatically push navigation state
			//  Old style pages shoved into emx will have to manually push their navigation state.
			return autoPushNavigation && typeof emaFeatureToggles !== 'undefined' && emaFeatureToggles.AutoUpdateNavigation;
		},
		setAutoPushNavigationEnabled: function (value) {
			autoPushNavigation = value;
		}
	};
})();

$(function () {
	var setBackLink = function () {
		var entry = Navigation.previous();
		$('.backlink').toggle(entry !== null);
		if (entry !== null) {
			$('.js-back-text').html(entry.text);
			$('.js-back-link').attr('href', entry.url);
		}
	};

	if (Navigation.isAutoPushNavigationEnabled()) {
		Navigation.push();

		$(window).on('hashchange', function () {
			Navigation.push();
			setBackLink();
		});
	}

	//  If there is no where to go back to, hide the link
	setTimeout(setBackLink, 0);
});


;/// <reference path="~/bootstrap/ema.js" />

$(function () {
	if (window.olarkConfig === null || window.olarkConfig === undefined){
		return;
	}

	window.olark || (function (c) {
		var f = window, d = document, l = f.location.protocol == "https:" ? "https:" : "http:", z = c.name, r = "load"; var nt = function () {
			f[z] = function () {
				(a.s = a.s || []).push(arguments)
			}; var a = f[z]._ = {
			}, q = c.methods.length; while (q--) {
				(function (n) {
					f[z][n] = function () {
						f[z]("call", n, arguments)
					}
				})(c.methods[q])
			} a.l = c.loader; a.i = nt; a.p = {
				0: +new Date
			}; a.P = function (u) {
				a.p[u] = new Date - a.p[0]
			}; function s() {
				a.P(r); f[z](r)
			} f.addEventListener ? f.addEventListener(r, s, false) : f.attachEvent("on" + r, s); var ld = function () {
				function p(hd) {
					hd = "head"; return ["<", hd, "></", hd, "><", i, ' onl' + 'oad="var d=', g, ";d.getElementsByTagName('head')[0].", j, "(d.", h, "('script')).", k, "='", l, "//", a.l, "'", '"', "></", i, ">"].join("")
				} var i = "body", m = d[i]; if (!m) {
					return setTimeout(ld, 100)
				} a.P(1); var j = "appendChild", h = "createElement", k = "src", n = d[h]("div"), v = n[j](d[h](z)), b = d[h]("iframe"), g = "document", e = "domain", o; n.style.display = "none"; m.insertBefore(n, m.firstChild).id = z; b.frameBorder = "0"; b.id = z + "-loader"; if (/MSIE[ ]+6/.test(navigator.userAgent)) {
					b.src = "javascript:false"
				} b.allowTransparency = "true"; v[j](b); try {
					b.contentWindow[g].open()
				} catch (w) {
					c[e] = d[e]; o = "javascript:var d=" + g + ".open();d.domain='" + d.domain + "';"; b[k] = o + "void(0);"
				} try {
					var t = b.contentWindow[g]; t.write(p()); t.close()
				} catch (x) {
					b[k] = o + 'd.write("' + p().replace(/"/g, String.fromCharCode(92) + '"') + '");d.close();'
				} a.P(2)
			}; ld()
		}; nt()
	})({
		loader: "static.olark.com/jsclient/loader0.js", name: "olark", methods: ["configure", "extend", "declare", "identify"]
	});

	/* custom configuration goes here (www.olark.com/documentation) */
	if (olarkConfig.Name !== '' && olarkConfig.Name !== null && olarkConfig.Name !== undefined){
		olark('api.visitor.updateFullName', { fullName: olarkConfig.Name });
	}

	if (olarkConfig.Email !== '' && olarkConfig.Email !== null && olarkConfig.Email !== undefined){
		olark('api.visitor.updateEmailAddress', { emailAddress: olarkConfig.Email });
	}

	if (olarkConfig.Phone !== '' && olarkConfig.Phone !== null && olarkConfig.Phone !== undefined){
		olark('api.visitor.updatePhoneNumber', { phoneNumber: olarkConfig.Phone });
	}

	var unavailableMessage = 'We\'re currently unavailable to chat.';

	olark.configure("locale.away_message", unavailableMessage);
	olark.configure("offline_note_message", unavailableMessage);

	// green light when operators are available
	olark('api.chat.onOperatorsAvailable', function () {
		var chatButton = $('.js-chat');
		if (chatButton.length === 0) {
			renderButton();
		}

		$('.js-chatindicator').removeClass('text-danger').addClass('text-success');
	});

	// red light when operators are away
	olark('api.chat.onOperatorsAway', function () {
		var chatButton = $('.js-chat');
		if (chatButton.length === 0) {
			renderButton();
		}

		$('.js-chatindicator').removeClass('text-success').addClass('text-danger');
	});

	function renderButton() {
		var $helpButton = $('<a href="javascript:void(0);" class="btn btn-default hidden-present helpbutton hidden-xs js-chat" id="live-chat-button">Live Chat&nbsp;<span class="fa fa-circle js-chatindicator"/></a>');
		$('body').append($helpButton);

		// hide button and open chat when button is clicked
		$helpButton.on('click', function () {
			olark('api.box.expand');
			$helpButton.hide();
		});

		// show button when chat shrinks
		olark('api.box.onShrink', function (event) {
			$helpButton.show();
		});
	}

	olark.identify('4544-689-10-8602');
})
;/// <reference path="~/bootstrap/ema.js" />

$(function () {
	var $document = $(document);
	$document.on('click', '.js-printedfactfinders', function () {
		$('#PrintedFactFinderModal').modal();
	});

	$document.on('click', '.js-externallink', function (e) {
		var message = emaExternalLinkDisclaimer ? emaExternalLinkDisclaimer.Text : 'The link you clicked is going to take you away from this website.',
			$a = $(this),
			$modal = $(Handlebars.templates['ExternalLinkModal']({
				'Hostname': $a[0].hostname || 'External Website',
				'Message': message,
				'Href': $a.attr('href'),
				'Target': $a.attr('target') || '_blank'
			}));

		$modal.find('.btn-primary').on('click', function () { $modal.modal('hide'); });
		$modal.on('hidden.bs.modal', function () { $modal.remove(); });
		$modal.modal();

		e.preventDefault();
	});
});
;/// <reference path="~/bootstrap/ema.js" />
/// <reference path="~/emx/_PageLayout/ajax.js"/>
/// <reference path="~/emx/_PageLayout/TransientNotifications.js"/>

$(function () {
	if (typeof emaFeatureToggles !== 'undefined' && typeof emaFeatureToggles.DisableQuickTake !== 'undefined' && emaFeatureToggles.DisableQuickTake === true) {
		$('body').addClass('feature-disable-quick-take');
		return;
	}

	$(document).on('click', '[data-research-symbol]', function () {
		var symbol = $(this).data('research-symbol');
		document.location.href = getUrl(symbol);
	});

	function getUrl(symbol) {
		return emaApplicationPath + 'Integration/QuickTake/' + (!symbol ? '' : encodeURIComponent(symbol) + '/');
	}
});
;function abbreviateCurrency(val) {
	var suffix,
		flt = parseFloat(val);

	if (val === 0)
		return '$0';

	if (!flt)
		return 'NaN';

	if (val < 0) {
		return '-' + abbreviateCurrency(Math.abs(val));
	}

	if (flt >= 1000000000000) {
		// Round to nearest 1.xx trillion
		flt += 5000000000;
		flt = flt / 1000000000000.0;
		suffix = "t"; // trillions
	}
	else if (flt >= 1000000000) {
		// Round to nearest 1.xx billion
		flt += 5000000;
		flt = flt / 1000000000.0;
		suffix = "b"; // billions
	}
	else if (flt >= 1000000) {
		// Round to nearest 1.xx million
		flt += 5000;
		flt = flt / 1000000.0;
		suffix = "m";
	}
	else if (flt >= 1000) {
		//Round to the nearest thousand
		flt += 500;
		flt = flt / 1000.0;
		suffix = "k";
		flt = Math.floor(flt);
		return "$" + flt + suffix;
	}
	else {
		flt = Math.floor(flt);
		return "$" + Math.floor(flt);
	}

	// truncate to two decimal places if val is in the millions +
	flt = Math.floor(flt * 100.0) / 100.0;
	val = flt + "";

	// pad it out to 2 decimals
	if (val.indexOf('.') == -1) val += ".";
	while (val.length - val.indexOf('.') < 3) val += "0";

	return "$" + val + suffix;
}

function reformatCurrency(val) {
	val = val.toString();
	var precision = 0;
	var dollars, cents = "";
	val = val.split(".");
	dollars = val[0];
	if (val.length == 2) cents = val[1];
	val = "";
	for (var i = dollars.length - 1; i >= 0; i--) {
		if (val.length % 4 == 3 && dollars.charAt(i) != '-') val = "," + val;

		val = dollars.charAt(i) + val;
	}

	if (precision > 0) {
		if (val.length == 0) val += "0";
		val = val + ".";
		for (i = 0; i < precision; i++) if (i < cents.length) val = val + cents.charAt(i);
		else val = val + "0";
	}

	if (val.charAt(0) == '-') val = "($" + val.substr(1, val.length - 1) + ")";
	else val = "$" + val;

	return val;
}

function reformatTimestamp(val) {
	/// <summary>Reformats a string as a valid Timestamp.</summary>
	/// <param name="val" type="String">The Value to reformat.</param>

	var pos, date, time;

	pos = val.indexOf(" ");

	if (pos >= 0) {
		date = reformatDate(val.substr(0, pos));
		time = reformatTime(val.substr(pos + 1, val.length - pos + 1));
	}
	else {
		date = reformatDate(val);
		time = "8:00:00 AM";
	}
	if (date == null || time == null) return null;

	return date + " " + time;
}

function reformatDate(val) {
	/// <summary>Returns empty string on invalid date, based on some assumptions</summary>
	val = Clean(val, "date");
	var arr, dt, dtNow = new Date(),
		sM, sD, sY;

	arr = val.split("/");

	// Get Month, Day & Year. If any are blank, use reasonable defaults
	switch (arr.length) {
		case 1:
			// they put it in without slashes.. look at length
			if (arr[0].length > 0 && arr[0].length <= 2) // just the 1 or 2 digit year
				str = "01/01/" + AddCentury(arr[0]);
			else if (arr[0].length == 4) // just the 4 digit year
				str = "01/01/" + AddCentury(arr[0]);
			else if (arr[0].length == 6) // 1 digit month, 1 digit day and 4 digit year
				str = arr[0].substr(0, 1) + "/" + arr[0].substr(1, 1) + "/" + AddCentury(arr[0].substr(2, 4));
			else if (arr[0].length == 8) // 2 digit month, 2 digit day and 4 digit year
				str = arr[0].substr(0, 2) + "/" + arr[0].substr(2, 2) + "/" + AddCentury(arr[0].substr(4, 4));
			else return (dtNow.getMonth() + 1) + "/" + dtNow.getDate() + "/" + dtNow.getFullYear();

			break;
		case 2:
			// month and year
			if (arr[1].length == 4) // month and 4 digit year
				str = arr[0] + "/01/" + AddCentury(arr[1]);
			else // assume month and day
				str = arr[0] + "/" + arr[1] + "/" + dtNow.getFullYear();
			break;
		default:
			// month, day, year
			str = arr[0] + "/" + arr[1] + "/" + AddCentury(arr[2]);
			break;
	}
	// Now let the Date object take care of leap year calc's and whatnot.
	dt = new Date(str);
	if (isNaN(dt)) return null;

	// Format return string.
	return (dt.getMonth() + 1) + "/" + dt.getDate() + "/" + dt.getFullYear();
}

function reformatTime(val) {
	var arr, strStripped, bIsPM, bHasPartialSecs = false;
	var nHours, nMins, nSecs;

	strStripped = val.toUpperCase();
	bIsPM = (strStripped.indexOf("P") >= 0);
	strStripped = Clean(strStripped, "0123456789:.");

	arr = val.split(":");
	nHours = 0;
	nMins = 0;
	nSecs = 0;

	switch (arr.length) {
		case 1:
			if (arr[0].length > 0) nHours = parseInt(arr[0], 10);
			break;
		case 2:
			if (arr[0].length > 0) nHours = parseInt(arr[0], 10); // Believe it or not, without the "10" parseInt assumes octal if the string begins with a zero!
			if (arr[1].length > 0) nMins = parseInt(arr[1], 10);
			break;
		default:
			if (arr[0].length > 0) nHours = parseInt(arr[0], 10);
			if (arr[1].length > 0) nMins = parseInt(arr[1], 10);
			if (arr[2].length > 0) {
				if (arr[2].indexOf(".") >= 0) {
					nSecs = parseFloat(arr[2]); // Need to allow for partial seconds in the Audit Viewer
					bHasPartialSecs = true;
				}
				else nSecs = parseInt(arr[2], 10);
			}
			break;
	}

	if ((nHours >= 1) && (nHours <= 12) && (nMins >= 0) && (nMins <= 59) && (nSecs >= 0) && (nSecs <= 59)) {
		var sSecs = FmtLeadingNum(nSecs, 2); // Make sure WHOLE Secs has two digits.
		// Make Sure PARTIAL secs has three decimal places (e.g. 19.000). Without this GridSorting may not work.
		if (bHasPartialSecs && sSecs.length < 6) {
			var i;
			for (i = sSecs.length; i < 6; i++) sSecs += "0";
		}
		return FmtLeadingNum(nHours, 1) + ":" + FmtLeadingNum(nMins, 2) + ":" + sSecs + (bIsPM ? " PM" : " AM");
	}
	return "";
}

function Clean(strValue, strFmt) {
	/// <summary>Remove all disallowed characters from a string</summary>
	if (strFmt == null || strValue == null || strFmt === '' || strValue === '') {
		return strValue;
	}

	var i,
		strValid = '',
		strInvalid = '',
		strBuf = '',
		strDateSeps = '.-/',
		strTimeChars = ': APMapm',
		nDateSeps = 0,
		bAllowHyphen = true,
		bAllowDecimal = true,
		strAlphas = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
		strNums = '0123456789',
		strLowerFmt = strFmt.toLowerCase(),
		strVaultAllowedFolderSpecialCharacters = " _-()^%$#@!~{}[]'`&=+;,",
		strVaultAllowedFileSpecialCharacters = strVaultAllowedFolderSpecialCharacters + ".",
		strThirdPartyIdsAllowedSpecialCharacters = "=+-_~()./";

	switch (strLowerFmt) {
		case 'number':
			strValid = strNums + '.-(';
			break;
		case 'date':
			strValid = strNums + strDateSeps;
			break;
		case 'timestamp':
			strValid = strNums + strDateSeps + strTimeChars;
			break;
		case 'filename':
			strValid = strAlphas + strNums + strVaultAllowedFileSpecialCharacters;
			break;
		case 'filenamenoext':
			strValid = strAlphas + strNums + " _-()^%$#@!~{}[]'`"; // is used for presentation names, not vault files
			break;
		case 'foldername':
			strValid = strAlphas + strNums + strVaultAllowedFolderSpecialCharacters;
			break;
		case 'email':
			strInvalid = ' !\"#$%():,;<>[\\]`|';
			break;
		case 'multipleemail':
			// allows commas
			strInvalid = ' !\"#$%():;<>[\\]`|';
			break;
		case 'filesize':
			strValid = strNums + '.';
			bAllowHyphen = false;
			bAllowDecimal = true;
			break;
		case 'thirdpartyid':
			strValid = strAlphas + strNums + strThirdPartyIdsAllowedSpecialCharacters;
			break;
		default:
			// Explicity defined set of valid characters.
			strValid = strFmt;
			break;
	}

	// Remove any character from strValue that is not found in strValid
	for (i = 0; i < strValue.length; i++) {
		var c = strValue.charAt(i);

		// if it is specifically invalid, move on, MacDuff.
		if (strInvalid.indexOf(c) >= 0) {
			continue;
		}

		// if no valid set to check against, accept it.
		if (strValid.length === 0) {
			strBuf += c;
		} else if (strValid.indexOf(c) >= 0) {
			if (strLowerFmt === 'number' || strLowerFmt === 'filesize') {
				switch (c) {
					case '-':
						if (!bAllowHyphen) continue;
						break;
					case '.':
						if (!bAllowDecimal) continue;
						bAllowDecimal = false; // Only one per, please
						break;
					case '(':
						// '(' is only allowed once, at the first char position.
						if (i > 0 || strLowerFmt === 'filesize') continue;

						// If we find a '(' in first position, assume negative, replace with a dash.
						strBuf += '-';
						continue;
				}

				// This may only appear in the first position. Thereafter they are invalid.
				bAllowHyphen = false;
			}
			else if ((strLowerFmt === 'date') || (strLowerFmt === 'timestamp')) {

				if (strDateSeps.indexOf(c) >= 0) {
					if (nDateSeps < 2) {
						++nDateSeps;
						strBuf += '/'; // Convert date separators to slashes
					}
					continue;
				}
			}

			// If we get this far, the character is valid.
			strBuf += c;
		}
	}
	return strBuf;
}

function AddCentury(sYr) {
	/// <summary>This function emulates the VB CDate functionality</summary>
	if (sYr != "") {
		var nYr;
		var oNum = new Number(sYr);

		if (!oNum.IsNaN) {
			var tString = new String(oNum);
			nYr = oNum.valueOf();
			if (tString.length == 3) {
				return String(nYr + 2000); //Add 2000 to the year
			}
			else {
				if (nYr < 30) nYr += 2000;
				else if (nYr < 100) nYr += 1900;

				return String(nYr);
			}
		}
	}

	return "";
}

function FmtLeadingNum(val, nDec) {
	var sNum = new String(val);
	var arrSegments = sNum.split("."); // don't want to count any decimals.
	var nLen = arrSegments[0].length;
	var sPrefix = "";

	while (nLen < nDec) {
		sPrefix += "0";
		nLen++;
	}

	return sPrefix + sNum;
}

;$(function () {

	if (window.salesforceLiveAgentConfig === null || window.salesforceLiveAgentConfig === undefined) {
		return;
	}

	var salesforceLiveAgent = window.salesforceLiveAgentConfig;

	var initESW = function (gslbBaseURL) {

		var chatContainer = document.createElement('div');
		chatContainer.id = 'salesforce-chat-container';
		chatContainer.className = 'hidden-present';
		document.body.appendChild(chatContainer);

		embedded_svc.settings.displayHelpButton = true;
		embedded_svc.settings.language = '';
		embedded_svc.settings.defaultMinimizedText = 'Chat with Support';
		embedded_svc.settings.disabledMinimizedText = 'Chat Unavailable';
		embedded_svc.settings.offlineSupportMinimizedText = 'Contact Us';
		embedded_svc.settings.loadingText = 'Loading...';
		embedded_svc.settings.targetElement = chatContainer;

		embedded_svc.settings.prepopulatedPrechatFields = {
			FirstName: salesforceLiveAgent.FirstName,
			LastName: salesforceLiveAgent.LastName
		};
		embedded_svc.settings.extraPrechatFormDetails = [{
			"label": "Email",
			"value": salesforceLiveAgent.UserEmail,
			"displayToAgent": true
		},
		{
			"label": "Platform User Info",
			"value": "FirstName: " + salesforceLiveAgent.FirstName + ", LastName: " + salesforceLiveAgent.LastName + ", Email: " + salesforceLiveAgent.UserEmail,
			"transcriptFields": ["Platform_User_Info__c"],
			"displayToAgent": true
		},
		{
			"label": "Platform Session Info",
			"value": "UserID: " + salesforceLiveAgent.GUID + ", OfficePath: " + salesforceLiveAgent.OfficePath,
			"transcriptFields": ["Platform_Session_Info__c"],
			"displayToAgent": true
		}];
		embedded_svc.settings.extraPrechatInfo = [
			{
				"entityFieldMaps":
					[
						{
							"doCreate": false,
							"doFind": false,
							"fieldName": "LastName",
							"isExactMatch": false,
							"label": "Last Name"
						},
						{
							"doCreate": false,
							"doFind": false,
							"fieldName": "FirstName",
							"isExactMatch": false,
							"label": "First Name"
						},
						{
							"doCreate": false,
							"doFind": true,
							"fieldName": "Email",
							"isExactMatch": true,
							"label": "Email"
						}
					]
				, "entityName": "Contact",
				"saveToTranscript": "Contact",
				"showOnCreate": true
			}];

		embedded_svc.settings.enabledFeatures = ['LiveAgent'];
		embedded_svc.settings.entryFeature = 'LiveAgent';

		embedded_svc.init(
			salesforceLiveAgent.LiveAgentConfiguration.SalesforceOrgUrl,
			salesforceLiveAgent.LiveAgentConfiguration.SalesforceSiteUrl,
			gslbBaseURL,
			salesforceLiveAgent.LiveAgentConfiguration.SalesforceOrgId,
			salesforceLiveAgent.LiveAgentConfiguration.ChatButtonDevName,
			{
				baseLiveAgentContentURL: salesforceLiveAgent.LiveAgentConfiguration.BaseLiveAgentContentURL,
				deploymentId: salesforceLiveAgent.LiveAgentConfiguration.DeploymentId,
				buttonId: salesforceLiveAgent.LiveAgentConfiguration.ButtonId,
				baseLiveAgentURL: salesforceLiveAgent.LiveAgentConfiguration.BaseLiveAgentURL,
				eswLiveAgentDevName: salesforceLiveAgent.LiveAgentConfiguration.EswLiveAgentDevName,
				isOfflineSupportEnabled: salesforceLiveAgent.LiveAgentConfiguration.IsOfflineSupportEnabled
			}
		);
	};
	if (!window.embedded_svc) {
		var s = document.createElement('script');
		s.setAttribute('src',
			salesforceLiveAgent.LiveAgentConfiguration.EswSrc);
		s.onload = function () {
			initESW(null);
		};

		document.body.appendChild(s);
	} else {
		initESW('https://service.force.com');
	}
});