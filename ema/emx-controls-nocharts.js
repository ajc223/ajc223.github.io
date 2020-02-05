/**
 * @preserve FastClick: polyfill to remove click delays on browsers with touch UIs.
 *
 * @version 0.6.2
 * @codingstandard ftlabs-jsv2
 * @copyright The Financial Times Limited [All Rights Reserved]
 * @license MIT License (see LICENSE.txt)
 */

/*jslint browser:true, node:true*/
/*global define, Event, Node*/


/**
 * Instantiate fast-clicking listeners on the specificed layer.
 *
 * @constructor
 * @param {Element} layer The layer to listen on
 */
function FastClick(layer) {
	'use strict';
	var oldOnClick, self = this;


	/**
	 * Whether a click is currently being tracked.
	 *
	 * @type boolean
	 */
	this.trackingClick = false;


	/**
	 * Timestamp for when when click tracking started.
	 *
	 * @type number
	 */
	this.trackingClickStart = 0;


	/**
	 * The element being tracked for a click.
	 *
	 * @type EventTarget
	 */
	this.targetElement = null;


	/**
	 * X-coordinate of touch start event.
	 *
	 * @type number
	 */
	this.touchStartX = 0;


	/**
	 * Y-coordinate of touch start event.
	 *
	 * @type number
	 */
	this.touchStartY = 0;


	/**
	 * ID of the last touch, retrieved from Touch.identifier.
	 *
	 * @type number
	 */
	this.lastTouchIdentifier = 0;


	/**
	 * The FastClick layer.
	 *
	 * @type Element
	 */
	this.layer = layer;

	if (!layer || !layer.nodeType) {
		throw new TypeError('Layer must be a document node');
	}

	/** @type function() */
	this.onClick = function() { return FastClick.prototype.onClick.apply(self, arguments); };

	/** @type function() */
	this.onMouse = function() { return FastClick.prototype.onMouse.apply(self, arguments); };

	/** @type function() */
	this.onTouchStart = function() { return FastClick.prototype.onTouchStart.apply(self, arguments); };

	/** @type function() */
	this.onTouchEnd = function() { return FastClick.prototype.onTouchEnd.apply(self, arguments); };

	/** @type function() */
	this.onTouchCancel = function() { return FastClick.prototype.onTouchCancel.apply(self, arguments); };

	// Devices that don't support touch don't need FastClick
	if (typeof window.ontouchstart === 'undefined') {
		return;
	}

	// Set up event handlers as required
	if (this.deviceIsAndroid) {
		layer.addEventListener('mouseover', this.onMouse, true);
		layer.addEventListener('mousedown', this.onMouse, true);
		layer.addEventListener('mouseup', this.onMouse, true);
	}

	layer.addEventListener('click', this.onClick, true);
	layer.addEventListener('touchstart', this.onTouchStart, false);
	layer.addEventListener('touchend', this.onTouchEnd, false);
	layer.addEventListener('touchcancel', this.onTouchCancel, false);

	// Hack is required for browsers that don't support Event#stopImmediatePropagation (e.g. Android 2)
	// which is how FastClick normally stops click events bubbling to callbacks registered on the FastClick
	// layer when they are cancelled.
	if (!Event.prototype.stopImmediatePropagation) {
		layer.removeEventListener = function(type, callback, capture) {
			var rmv = Node.prototype.removeEventListener;
			if (type === 'click') {
				rmv.call(layer, type, callback.hijacked || callback, capture);
			} else {
				rmv.call(layer, type, callback, capture);
			}
		};

		layer.addEventListener = function(type, callback, capture) {
			var adv = Node.prototype.addEventListener;
			if (type === 'click') {
				adv.call(layer, type, callback.hijacked || (callback.hijacked = function(event) {
					if (!event.propagationStopped) {
						callback(event);
					}
				}), capture);
			} else {
				adv.call(layer, type, callback, capture);
			}
		};
	}

	// If a handler is already declared in the element's onclick attribute, it will be fired before
	// FastClick's onClick handler. Fix this by pulling out the user-defined handler function and
	// adding it as listener.
	if (typeof layer.onclick === 'function') {

		// Android browser on at least 3.2 requires a new reference to the function in layer.onclick
		// - the old one won't work if passed to addEventListener directly.
		oldOnClick = layer.onclick;
		layer.addEventListener('click', function(event) {
			oldOnClick(event);
		}, false);
		layer.onclick = null;
	}
}


/**
 * Android requires exceptions.
 *
 * @type boolean
 */
FastClick.prototype.deviceIsAndroid = navigator.userAgent.indexOf('Android') > 0;


/**
 * iOS requires exceptions.
 *
 * @type boolean
 */
FastClick.prototype.deviceIsIOS = /iP(ad|hone|od)/.test(navigator.userAgent);


/**
 * iOS 4 requires an exception for select elements.
 *
 * @type boolean
 */
FastClick.prototype.deviceIsIOS4 = FastClick.prototype.deviceIsIOS && (/OS 4_\d(_\d)?/).test(navigator.userAgent);


/**
 * iOS 6.0(+?) requires the target element to be manually derived
 *
 * @type boolean
 */
FastClick.prototype.deviceIsIOSWithBadTarget = FastClick.prototype.deviceIsIOS && (/OS ([6-9]|\d{2})_\d/).test(navigator.userAgent);


/**
 * Determine whether a given element requires a native click.
 *
 * @param {EventTarget|Element} target Target DOM element
 * @returns {boolean} Returns true if the element needs a native click
 */
FastClick.prototype.needsClick = function(target) {
	'use strict';
	switch (target.nodeName.toLowerCase()) {
	case 'button':
	case 'input':

		// File inputs need real clicks on iOS 6 due to a browser bug
		if (this.deviceIsIOS && target.type === 'file') {
			return true;
		}

		// Don't send a synthetic click to disabled inputs
		return target.disabled;
	case 'label':
	case 'video':
		return true;
	default:
		return (/\bneedsclick\b/).test(target.className);
	}
};


/**
 * Determine whether a given element requires a call to focus to simulate click into element.
 *
 * @param {EventTarget|Element} target Target DOM element
 * @returns {boolean} Returns true if the element requires a call to focus to simulate native click.
 */
FastClick.prototype.needsFocus = function(target) {
	'use strict';
	switch (target.nodeName.toLowerCase()) {
	case 'textarea':
	case 'select':
		return true;
	case 'input':
		switch (target.type) {
		case 'button':
		case 'checkbox':
		case 'file':
		case 'image':
		case 'radio':
		case 'submit':
			return false;
		}

		// No point in attempting to focus disabled inputs
		return !target.disabled && !target.readOnly;
	default:
		return (/\bneedsfocus\b/).test(target.className);
	}
};


/**
 * Send a click event to the specified element.
 *
 * @param {EventTarget|Element} targetElement
 * @param {Event} event
 */
FastClick.prototype.sendClick = function(targetElement, event) {
	'use strict';
	var clickEvent, touch;

	// On some Android devices activeElement needs to be blurred otherwise the synthetic click will have no effect (#24)
	if (document.activeElement && document.activeElement !== targetElement) {
		document.activeElement.blur();
	}

	touch = event.changedTouches[0];

	// Synthesise a click event, with an extra attribute so it can be tracked
	clickEvent = document.createEvent('MouseEvents');
	clickEvent.initMouseEvent('click', true, true, window, 1, touch.screenX, touch.screenY, touch.clientX, touch.clientY, false, false, false, false, 0, null);
	clickEvent.forwardedTouchEvent = true;
	targetElement.dispatchEvent(clickEvent);
};


/**
 * @param {EventTarget|Element} targetElement
 */
FastClick.prototype.focus = function(targetElement) {
	'use strict';
	var length;

	if (this.deviceIsIOS && targetElement.setSelectionRange) {
		length = targetElement.value.length;
		targetElement.setSelectionRange(length, length);
	} else {
		targetElement.focus();
	}
};


/**
 * Check whether the given target element is a child of a scrollable layer and if so, set a flag on it.
 *
 * @param {EventTarget|Element} targetElement
 */
FastClick.prototype.updateScrollParent = function(targetElement) {
	'use strict';
	var scrollParent, parentElement;

	scrollParent = targetElement.fastClickScrollParent;

	// Attempt to discover whether the target element is contained within a scrollable layer. Re-check if the
	// target element was moved to another parent.
	if (!scrollParent || !scrollParent.contains(targetElement)) {
		parentElement = targetElement;
		do {
			if (parentElement.scrollHeight > parentElement.offsetHeight) {
				scrollParent = parentElement;
				targetElement.fastClickScrollParent = parentElement;
				break;
			}

			parentElement = parentElement.parentElement;
		} while (parentElement);
	}

	// Always update the scroll top tracker if possible.
	if (scrollParent) {
		scrollParent.fastClickLastScrollTop = scrollParent.scrollTop;
	}
};


/**
 * @param {EventTarget} targetElement
 * @returns {Element|EventTarget}
 */
FastClick.prototype.getTargetElementFromEventTarget = function(eventTarget) {
	'use strict';

	// On some older browsers (notably Safari on iOS 4.1) the event target may be a text node.
	if (eventTarget.nodeType === Node.TEXT_NODE) {
		return eventTarget.parentNode;
	}

	return eventTarget;
};


/**
 * On touch start, record the position and scroll offset.
 *
 * @param {Event} event
 * @returns {boolean}
 */
FastClick.prototype.onTouchStart = function(event) {
	'use strict';
	var targetElement, touch, selection;

	targetElement = this.getTargetElementFromEventTarget(event.target);
	touch = event.targetTouches[0];

	if (this.deviceIsIOS) {

		// Only trusted events will deselect text on iOS
		selection = window.getSelection();
		if (selection.rangeCount && !selection.isCollapsed) {
			return true;
		}

		if (!this.deviceIsIOS4) {

			// Weird things happen on iOS when an alert or confirm dialog is opened from a click event callback:
			// when the user next taps anywhere else on the page, new touchstart and touchend events are dispatched
			// with the same identifier as the touch event that previously triggered the click that triggered the alert.
			// Sadly, there is an issue on iOS 4 that causes some normal touch events to have the same identifier as an
			// immediately preceeding touch event, so this fix is unavailable on that platform.
			if (touch.identifier === this.lastTouchIdentifier) {
				event.preventDefault();
				return false;
			}
		
			this.lastTouchIdentifier = touch.identifier;

			// If the target element is a child of a scrollable layer (using -webkit-overflow-scrolling: touch) and:
			// 1) the user does a fling scroll on the scrollable layer
			// 2) the user stops the fling scroll with another tap
			// then the event.target of the last 'touchend' event will be the element that was under the user's finger
			// when the fling scroll was started, causing FastClick to send a click event to that layer - unless a check
			// is made to ensure that a parent layer was not scrolled before sending a synthetic click.
			this.updateScrollParent(targetElement);
		}
	}

	this.trackingClick = true;
	this.trackingClickStart = event.timeStamp;
	this.targetElement = targetElement;

	this.touchStartX = touch.pageX;
	this.touchStartY = touch.pageY;

	// Prevent phantom clicks on fast double-tap
	if ((event.timeStamp - this.lastClickTime) < 200) {
		event.preventDefault();
	}

	return true;
};


/**
 * Based on a touchmove event object, check whether the touch has moved past a boundary since it started.
 *
 * @param {Event} event
 * @returns {boolean}
 */
FastClick.prototype.touchHasMoved = function(event) {
	'use strict';
	var touch = event.changedTouches[0];

	if (Math.abs(touch.pageX - this.touchStartX) > 10 || Math.abs(touch.pageY - this.touchStartY) > 10) {
		return true;
	}

	return false;
};


/**
 * Attempt to find the labelled control for the given label element.
 *
 * @param {EventTarget|HTMLLabelElement} labelElement
 * @returns {Element|null}
 */
FastClick.prototype.findControl = function(labelElement) {
	'use strict';

	// Fast path for newer browsers supporting the HTML5 control attribute
	if (labelElement.control !== undefined) {
		return labelElement.control;
	}

	// All browsers under test that support touch events also support the HTML5 htmlFor attribute
	if (labelElement.htmlFor) {
		return document.getElementById(labelElement.htmlFor);
	}

	// If no for attribute exists, attempt to retrieve the first labellable descendant element
	// the list of which is defined here: http://www.w3.org/TR/html5/forms.html#category-label
	return labelElement.querySelector('button, input:not([type=hidden]), keygen, meter, output, progress, select, textarea');
};


/**
 * On touch end, determine whether to send a click event at once.
 *
 * @param {Event} event
 * @returns {boolean}
 */
FastClick.prototype.onTouchEnd = function(event) {
	'use strict';
	var forElement, trackingClickStart, targetTagName, scrollParent, touch, targetElement = this.targetElement;

	// If the touch has moved, cancel the click tracking
	if (this.touchHasMoved(event)) {
		this.trackingClick = false;
		this.targetElement = null;
	}

	if (!this.trackingClick) {
		return true;
	}

	// Prevent phantom clicks on fast double-tap
	if ((event.timeStamp - this.lastClickTime) < 200) {
		this.cancelNextClick = true;
		return true;
	}

	this.lastClickTime = event.timeStamp;

	trackingClickStart = this.trackingClickStart;
	this.trackingClick = false;
	this.trackingClickStart = 0;

	// On some iOS devices, the targetElement supplied with the event is invalid if the layer
	// is performing a transition or scroll, and has to be re-detected manually. Note that
	// for this to function correctly, it must be called *after* the event target is checked!
	if (this.deviceIsIOSWithBadTarget) {
		touch = event.changedTouches[0];
		targetElement = document.elementFromPoint(touch.pageX - window.pageXOffset, touch.pageY - window.pageYOffset);
	}

	targetTagName = targetElement.tagName.toLowerCase();
	if (targetTagName === 'label') {
		forElement = this.findControl(targetElement);
		if (forElement) {
			this.focus(targetElement);
			if (this.deviceIsAndroid) {
				return false;
			}

			targetElement = forElement;
		}
	} else if (this.needsFocus(targetElement)) {

		// Case 1: If the touch started a while ago (best guess is 100ms) then focus will be triggered anyway. Return early and unset the target element reference so that the subsequent click will be allowed through.
		// Case 2: Without this exception for input elements tapped when the document is contained in an iframe, then any inputted text won't be visible even though the value attribute is updated as the user types
		if ((event.timeStamp - trackingClickStart) > 100 || (this.deviceIsIOS && window.top !== window && targetTagName === 'input')) {
			this.targetElement = null;
			return false;
		}

		this.focus(targetElement);

		// Select elements need the event to go through on iOS 4, otherwise the selector menu won't open.
		if (!this.deviceIsIOS4 || targetTagName !== 'select') {
			this.targetElement = null;
			event.preventDefault();
		}

		return false;
	}

	if (this.deviceIsIOS && !this.deviceIsIOS4) {

		// Don't send a synthetic click event if the target element is contained within a parent layer that was scrolled
		// and this tap is being used to stop the scrolling (usually initiated by a fling).
		scrollParent = targetElement.fastClickScrollParent;
		if (scrollParent && scrollParent.fastClickLastScrollTop !== scrollParent.scrollTop) {
			return true;
		}
	}

	// Prevent the actual click from going though - unless the target node is marked as requiring
	// real clicks or if it is in the whitelist in which case only non-programmatic clicks are permitted.
	if (!this.needsClick(targetElement)) {
		event.preventDefault();
		this.sendClick(targetElement, event);
	}

	return false;
};


/**
 * On touch cancel, stop tracking the click.
 *
 * @returns {void}
 */
FastClick.prototype.onTouchCancel = function() {
	'use strict';
	this.trackingClick = false;
	this.targetElement = null;
};


/**
 * Determine mouse events which should be permitted.
 *
 * @param {Event} event
 * @returns {boolean}
 */
FastClick.prototype.onMouse = function(event) {
	'use strict';

	// If a target element was never set (because a touch event was never fired) allow the event
	if (!this.targetElement) {
		return true;
	}

	if (event.forwardedTouchEvent) {
		return true;
	}

	// Programmatically generated events targeting a specific element should be permitted
	if (!event.cancelable) {
		return true;
	}

	// Derive and check the target element to see whether the mouse event needs to be permitted;
	// unless explicitly enabled, prevent non-touch click events from triggering actions,
	// to prevent ghost/doubleclicks.
	if (!this.needsClick(this.targetElement) || this.cancelNextClick) {

		// Prevent any user-added listeners declared on FastClick element from being fired.
		if (event.stopImmediatePropagation) {
			event.stopImmediatePropagation();
		} else {

			// Part of the hack for browsers that don't support Event#stopImmediatePropagation (e.g. Android 2)
			event.propagationStopped = true;
		}

		// Cancel the event
		event.stopPropagation();
		event.preventDefault();

		return false;
	}

	// If the mouse event is permitted, return true for the action to go through.
	return true;
};


/**
 * On actual clicks, determine whether this is a touch-generated click, a click action occurring
 * naturally after a delay after a touch (which needs to be cancelled to avoid duplication), or
 * an actual click which should be permitted.
 *
 * @param {Event} event
 * @returns {boolean}
 */
FastClick.prototype.onClick = function(event) {
	'use strict';
	var permitted;

	// It's possible for another FastClick-like library delivered with third-party code to fire a click event before FastClick does. In that case, set the click-tracking flag back to false and return early. This will cause onTouchEnd to return early.
	if (this.trackingClick) {
		this.targetElement = null;
		this.trackingClick = false;
		return true;
	}

	// Very odd behaviour on iOS: if a submit element is present inside a form and the user hits enter in the iOS simulator or clicks the Go button on the pop-up OS keyboard the a kind of 'fake' click event will be triggered with the submit-type input element as the target.
	if (event.target.type === 'submit' && event.detail === 0) {
		return true;
	}

	permitted = this.onMouse(event);

	// Only unset targetElement if the click is not permitted. This will ensure that the check for !targetElement in onMouse fails and the browser's click doesn't go through.
	if (!permitted) {
		this.targetElement = null;
	}

	// If clicks are permitted, return true for the action to go through.
	return permitted;
};


/**
 * Remove all FastClick's event listeners.
 *
 * @returns {void}
 */
FastClick.prototype.destroy = function() {
	'use strict';
	var layer = this.layer;

	if (this.deviceIsAndroid) {
		layer.removeEventListener('mouseover', this.onMouse, true);
		layer.removeEventListener('mousedown', this.onMouse, true);
		layer.removeEventListener('mouseup', this.onMouse, true);
	}

	layer.removeEventListener('click', this.onClick, true);
	layer.removeEventListener('touchstart', this.onTouchStart, false);
	layer.removeEventListener('touchend', this.onTouchEnd, false);
	layer.removeEventListener('touchcancel', this.onTouchCancel, false);
};


/**
 * Factory method for creating a FastClick object
 *
 * @param {Element} layer The layer to listen on
 */
FastClick.attach = function(layer) {
	'use strict';
	return new FastClick(layer);
};


if (typeof define !== 'undefined' && define.amd) {

	// AMD. Register as an anonymous module.
	define(function() {
		'use strict';
		return FastClick;
	});
}

if (typeof module !== 'undefined' && module.exports) {
	module.exports = FastClick.attach;
	module.exports.FastClick = FastClick;
}

;/// <reference path="~/bootstrap/ema.js" />
/**
 * Version used (and subsequently modified) here: https://github.com/customd/jquery-number/blob/e0e40afd2db690884e325a03344783d56c875efd/jquery.number.js
 *
 * jQuery number plug-in 2.1.5
 * Copyright 2012, Digital Fusion
 * Licensed under the MIT license.
 * http://opensource.teamdf.com/license/
 *
 * A jQuery plugin which implements a permutation of phpjs.org's number_format to provide
 * simple number formatting, insertion, and as-you-type masking of a number.
 *
 * @author	Sam Sehnert
 * @docs	http://www.teamdf.com/web/jquery-number-format-redux/196/
 */
(function ($) {

	"use strict";

	/**
	 * Method for selecting a range of characters in an input/textarea.
	 *
	 * @param int rangeStart			: Where we want the selection to start.
	 * @param int rangeEnd				: Where we want the selection to end.
	 *
	 * @return void;
	 */
	function setSelectionRange(rangeStart, rangeEnd) {
		// Check which way we need to define the text range.
		if (this.createTextRange) {
			var range = this.createTextRange();
			range.collapse(true);
			range.moveStart('character', rangeStart);
			range.moveEnd('character', rangeEnd - rangeStart);
			range.select();
		}

			// Alternate setSelectionRange method for supporting browsers.
		else if (this.setSelectionRange) {
			this.focus();
			this.setSelectionRange(rangeStart, rangeEnd);
		}
	}

	/**
	 * Get the selection position for the given part.
	 *
	 * @param string part			: Options, 'Start' or 'End'. The selection position to get.
	 *
	 * @return int : The index position of the selection part.
	 */
	function getSelection(part) {
		var pos = this.value.length;

		// Work out the selection part.
		part = (part.toLowerCase() == 'start' ? 'Start' : 'End');

		if (document.selection) {
			// The current selection
			var range = document.selection.createRange(), stored_range, selectionStart, selectionEnd;
			// We'll use this as a 'dummy'
			stored_range = range.duplicate();
			// Select all text
			//stored_range.moveToElementText( this );
			stored_range.expand('textedit');
			// Now move 'dummy' end point to end point of original range
			stored_range.setEndPoint('EndToEnd', range);
			// Now we can calculate start and end points
			selectionStart = stored_range.text.length - range.text.length;
			selectionEnd = selectionStart + range.text.length;
			return part == 'Start' ? selectionStart : selectionEnd;
		}

		else if (typeof (this['selection' + part]) != "undefined") {
			pos = this['selection' + part];
		}
		return pos;
	}

	/**
	 * Substitutions for keydown keycodes.
	 * Allows conversion from e.which to ascii characters.
	 */
	var _keydown = {
		codes: {
			46: 127,
			188: 44,
			109: 45,
			190: 46,
			191: 47,
			192: 96,
			220: 92,
			222: 39,
			221: 93,
			219: 91,
			173: 45,
			187: 61, //IE Key codes
			186: 59, //IE Key codes
			189: 45, //IE Key codes
			110: 46  //IE Key codes
		},
		shifts: {
			96: "~",
			49: "!",
			50: "@",
			51: "#",
			52: "$",
			53: "%",
			54: "^",
			55: "&",
			56: "*",
			57: "(",
			48: ")",
			45: "_",
			61: "+",
			91: "{",
			93: "}",
			92: "|",
			59: ":",
			39: "\"",
			44: "<",
			46: ">",
			47: "?"
		}
	};

	/**
	 * jQuery number formatter plugin. This will allow you to format numbers on an element.
	 *
	 * @params proxied for format_number method.
	 *
	 * @return : The jQuery collection the method was called with.
	 */
	$.fn.number = function (number, decimals, dec_point, thousands_sep) {

		// Enter the default thousands separator, and the decimal placeholder.
		thousands_sep = (typeof thousands_sep === 'undefined') ? ',' : thousands_sep;
		dec_point = (typeof dec_point === 'undefined') ? '.' : dec_point;
		decimals = (typeof decimals === 'undefined') ? 0 : decimals;

		// Work out the unicode character for the decimal placeholder.
		var u_dec = ('\\u' + ('0000' + (dec_point.charCodeAt(0).toString(16))).slice(-4)),
			regex_dec_num = new RegExp('[^' + u_dec + '0-9]', 'g'),
			regex_dec = new RegExp(u_dec, 'g');

		// If we've specified to take the number from the target element,
		// we loop over the collection, and get the number.
		if (number === true) {
			// If this element is a number, then we add a keyup
			if (this.is('input:text')) {
				// Return the jquery collection.
				return this.on({

					/**
					 * Handles keyup events, re-formatting numbers.
					 *
					 * Uses 'data' object to keep track of important information.
					 *
					 * data.c
					 * This variable keeps track of where the caret *should* be. It works out the position as
					 * the number of characters from the end of the string. E.g., '1^,234.56' where ^ denotes the caret,
					 * would be index -7 (e.g., 7 characters from the end of the string). At the end of both the key down
					 * and key up events, we'll re-position the caret to wherever data.c tells us the cursor should be.
					 * This gives us a mechanism for incrementing the cursor position when we come across decimals, commas
					 * etc. This figure typically doesn't increment for each keypress when to the left of the decimal,
					 * but does when to the right of the decimal.
					 *
					 * @param object e			: the keyup event object.s
					 *
					 * @return void;
					 */
					'keydown.format': function (e) {

						// Define variables used in the code below.
						var $this = $(this),
							data = $this.data('numFormat'),
							code = (e.keyCode ? e.keyCode : e.which),
							chara = '', //unescape(e.originalEvent.keyIdentifier.replace('U+','%u')),
							start = getSelection.apply(this, ['start']),
							end = getSelection.apply(this, ['end']),
							val = '',
							setPos = false;

						// Webkit (Chrome & Safari) on windows screws up the keyIdentifier detection
						// for numpad characters. I've disabled this for now, because while keyCode munging
						// below is hackish and ugly, it actually works cross browser & platform.

						//						if( typeof e.originalEvent.keyIdentifier !== 'undefined' )
						//						{
						//							chara = unescape(e.originalEvent.keyIdentifier.replace('U+','%u'));
						//						}
						//						else
						//						{
						if (_keydown.codes.hasOwnProperty(code)) {
							code = _keydown.codes[code];
						}
						if (!e.shiftKey && (code >= 65 && code <= 90)) {
							code += 32;
						} else if (!e.shiftKey && (code >= 69 && code <= 105)) {
							code -= 48;
						} else if (e.shiftKey && _keydown.shifts.hasOwnProperty(code)) {
							//get shifted keyCode value
							chara = _keydown.shifts[code];
						}

						if (chara == '') chara = String.fromCharCode(code);
						//						}




						// Stop executing if the user didn't type a number key, a decimal character, backspace, or delete.
						if (code != 8 && code != 45 && code != 127 && chara != dec_point && !chara.match(/[0-9]/)) {
							// We need the original keycode now...
							var key = (e.keyCode ? e.keyCode : e.which);
							if ( // Allow control keys to go through... (delete, backspace, tab, enter, escape etc)
								key == 46 || key == 8 || key == 127 || key == 9 || key == 27 || key == 13 ||
								// Allow: Ctrl+A, Ctrl+R, Ctrl+P, Ctrl+S, Ctrl+F, Ctrl+H, Ctrl+B, Ctrl+J, Ctrl+T, Ctrl+Z, Ctrl++, Ctrl+-, Ctrl+0
								((key == 65 || key == 82 || key == 80 || key == 83 || key == 70 || key == 72 || key == 66 || key == 74 || key == 84 || key == 90 || key == 61 || key == 173 || key == 48) && (e.ctrlKey || e.metaKey) === true) ||
								// Allow: Ctrl+V, Ctrl+C, Ctrl+X
								((key == 86 || key == 67 || key == 88) && (e.ctrlKey || e.metaKey) === true) ||
								// MDB: Also allow the down arrow
								// Allow: home, end, left, up, right, down
								((key >= 35 && key <= 40)) ||
								// Allow: F1-F12
								((key >= 112 && key <= 123))
							) {
								return;
							}
							// But prevent all other keys.
							e.preventDefault();
							return false;
						}

						// The whole lot has been selected, or if the field is empty...
						// MDB: don't run this code when value is 0 or you won't be able to add just decimals (0.44)
						if (start == 0 && end == this.value.length/* || $this.val() == 0*/) {
							if (code == 8)		// Backspace
							{
								// Blank out the field, but only if the data object has already been instantiated.
								start = end = 1;
								this.value = '';

								// Reset the cursor position.
								data.init = (decimals > 0 ? -1 : 0);
								data.c = (decimals > 0 ? -(decimals + 1) : 0);
								setSelectionRange.apply(this, [0, 0]);
							}
							else if (chara == dec_point) {
								start = end = 1;
								this.value = '0' + dec_point + (new Array(decimals + 1).join('0'));

								// Reset the cursor position.
								data.init = (decimals > 0 ? 1 : 0);
								data.c = (decimals > 0 ? -(decimals + 1) : 0);
							}
							else if (code == 45)	// Negative sign
							{
								start = end = 2;
								this.value = '-0' + dec_point + (new Array(decimals + 1).join('0'));

								// Reset the cursor position.
								data.init = (decimals > 0 ? 1 : 0);
								data.c = (decimals > 0 ? -(decimals + 1) : 0);

								setSelectionRange.apply(this, [2, 2]);
							}
							else {
								// Reset the cursor position.
								data.init = (decimals > 0 ? -1 : 0);
								data.c = (decimals > 0 ? -(decimals) : 0);
							}
						}

							// Otherwise, we need to reset the caret position
							// based on the users selection.
						else {
							data.c = end - this.value.length;
						}

						// Track if partial selection was used
						data.isPartialSelection = start == end ? false : true;

						// If the start position is before the decimal point,
						// and the user has typed a decimal point, we need to move the caret
						// past the decimal place.
						if (decimals > 0 && chara == dec_point && start == this.value.length - decimals - 1) {
							data.c++;
							data.init = Math.max(0, data.init);
							e.preventDefault();

							// Set the selection position.
							setPos = this.value.length + data.c;
						}

							// Ignore negative sign unless at beginning of number (and it's not already present)
						else if (code == 45 && (start != 0 || this.value.indexOf('-') == 0)) {
							e.preventDefault();
						}

							// If the user is just typing the decimal place,
							// we simply ignore it.
						else if (chara == dec_point) {
							data.init = Math.max(0, data.init);
							e.preventDefault();
						}

							// If hitting the delete key, and the cursor is before a decimal place,
							// we simply move the cursor to the other side of the decimal place.
						else if (decimals > 0 && code == 127 && start == this.value.length - decimals - 1) {
							// Just prevent default but don't actually move the caret here because it's done in the keyup event
							e.preventDefault();
						}

							// If hitting the backspace key, and the cursor is behind a decimal place,
							// we simply move the cursor to the other side of the decimal place.
						else if (decimals > 0 && code == 8 && start == this.value.length - decimals) {
							e.preventDefault();
							data.c--;

							// Set the selection position.
							setPos = this.value.length + data.c;
						}

							// If hitting the delete key, and the cursor is to the right of the decimal
							// we replace the character after the caret with a 0.
						else if (decimals > 0 && code == 127 && start > this.value.length - decimals - 1) {
							if (this.value === '') return;

							// If the character following is not already a 0,
							// replace it with one.
							if (this.value.slice(start, start + 1) != '0') {
								val = this.value.slice(0, start) + '0' + this.value.slice(start + 1);

								// MDB: adjust the number for the impending decimal conversion
								if ($this.data('format') === 'percent') {
									val = (val / 100) + '';
								}

								// The regex replacement below removes negative sign from numbers...
								// not sure why they're necessary here when none of the other cases use them
								//$this.val(val.replace(regex_dec_num,'').replace(regex_dec,dec_point));
								$this.val(val);
							}

							e.preventDefault();

							// Set the selection position.
							setPos = this.value.length + data.c;
						}

							// If hitting the backspace key, and the cursor is to the right of the decimal
							// (but not directly to the right) we replace the character preceding the
							// caret with a 0.
						else if (decimals > 0 && code == 8 && start > this.value.length - decimals) {
							if (this.value === '') return;

							// If the character preceding is not already a 0,
							// replace it with one.
							if (this.value.slice(start - 1, start) != '0') {
								val = this.value.slice(0, start - 1) + '0' + this.value.slice(start);

								// MDB: adjust the number for the impending decimal conversion
								if ($this.data('format') === 'percent') {
									val = (val / 100) + '';
								}

								// The regex replacement below removes negative sign from numbers...
								// not sure why they're necessary here when none of the other cases use them
								//$this.val(val.replace(regex_dec_num,'').replace(regex_dec,dec_point));
								$this.val(val);
							}

							e.preventDefault();
							data.c--;

							// Set the selection position.
							setPos = this.value.length + data.c;
						}

							// If the delete key was pressed, and the character immediately
							// after the caret is a thousands_separator character, simply
							// step over it.
						else if (code == 127 && this.value.slice(start, start + 1) == thousands_sep) {
							// Just prevent default but don't actually move the caret here because it's done in the keyup event
							e.preventDefault();
						}

							// If the backspace key was pressed, and the character immediately
							// before the caret is a thousands_separator character, simply
							// step over it.
						else if (code == 8 && this.value.slice(start - 1, start) == thousands_sep) {
							e.preventDefault();
							data.c--;

							// Set the selection position.
							setPos = this.value.length + data.c;
						}

							// If the caret is to the right of the decimal place, and the user is entering a
							// number, remove the following character before putting in the new one.
						else if (
							decimals > 0 &&
							start == end &&
							this.value.length > decimals + 1 &&
							start > this.value.length - decimals - 1 && isFinite(+chara) &&
							!e.metaKey && !e.ctrlKey && !e.altKey && chara.length === 1
						) {
							// If the character preceding is not already a 0,
							// replace it with one.
							if (end === this.value.length) {
								val = this.value.slice(0, start - 1);
							}
							else {
								val = this.value.slice(0, start) + this.value.slice(start + 1);
							}

							// Reset the position.
							this.value = val;
							setPos = start;
						}

						// If we need to re-position the characters.
						if (setPos !== false) {
							//console.log('Setpos keydown: ', setPos );
							setSelectionRange.apply(this, [setPos, setPos]);
						}

						// Store the data on the element.
						$this.data('numFormat', data);

					},

					/**
					 * Handles keyup events, re-formatting numbers.
					 *
					 * @param object e			: the keyup event object.s
					 *
					 * @return void;
					 */
					'keyup.format': function (e) {

						// Store these variables for use below.
						var $this = $(this),
							data = $this.data('numFormat'),
							code = (e.keyCode ? e.keyCode : e.which),
							start = getSelection.apply(this, ['start']),
							end = getSelection.apply(this, ['end']),
							setPos;


						// Check for negative characters being entered at the start of the string.
						// If there's any kind of selection, just ignore the input.
						if (start === 0 && end === 0 && (code === 189 || code === 109)) {
							$this.val('-' + $this.val());

							start = 1;
							data.c = 1 - this.value.length;
							data.init = 1;

							$this.data('numFormat', data);

							setPos = this.value.length + data.c;
							setSelectionRange.apply(this, [setPos, setPos]);
						}

						// Stop executing if the user didn't type a number key, a decimal, or a comma.
						if (this.value === '' || (code < 48 || code > 57) && (code < 96 || code > 105) && code !== 8 && code !== 46 && code !== 110) return;

						// Re-format the textarea.
						$this.val($this.val());

						if (decimals > 0) {
							// If we haven't marked this item as 'initialized'
							// then do so now. It means we should place the caret just
							// before the decimal. This will never be un-initialized before
							// the decimal character itself is entered.
							if (data.init < 1) {
								start = this.value.length - decimals - (data.init < 0 ? 1 : 0);
								data.c = start - this.value.length;
								data.init = 1;

								$this.data('numFormat', data);
							}

								// Increase the cursor position if the caret is to the right
								// of the decimal place, and the character pressed isn't the backspace key.
							else if (start > this.value.length - decimals && code != 8) {
								data.c++;

								// Store the data, now that it's changed.
								$this.data('numFormat', data);
							}
						}

						// Move caret to the right after delete key pressed
						if (code == 46 && !data.isPartialSelection) {
							data.c++;

							// Store the data, now that it's changed.
							$this.data('numFormat', data);
						}

						//console.log( 'Setting pos: ', start, decimals, this.value.length + data.c, this.value.length, data.c );

						// Set the selection position.
						setPos = this.value.length + data.c;
						setSelectionRange.apply(this, [setPos, setPos]);
					},

					/**
					 * Reformat when pasting into the field.
					 *
					 * @param object e 		: jQuery event object.
					 *
					 * @return false : prevent default action.
					 */
					'paste.format': function (e) {

						// Defint $this. It's used twice!.
						var $this = $(this),
							original = e.originalEvent,
							val = null;

						// Get the text content stream.
						if (window.clipboardData && window.clipboardData.getData) { // IE
							val = window.clipboardData.getData('Text');
						} else if (original.clipboardData && original.clipboardData.getData) {
							val = original.clipboardData.getData('text/plain');
						}

						// Do the reformat operation.
						$this.val(val);

						// Stop the actual content from being pasted.
						e.preventDefault();
						return false;
					}

				})

				// Loop each element (which isn't blank) and do the format.
				.each(function () {

					var $this = $(this).data('numFormat', {
						c: -(decimals + 1),
						decimals: decimals,
						thousands_sep: thousands_sep,
						dec_point: dec_point,
						regex_dec_num: regex_dec_num,
						regex_dec: regex_dec,
						init: this.value.indexOf('.') ? true : false
					});

					// Return if the element is empty.
					if (this.value === '') return;

					// Otherwise... format!!
					// MDB: initially the value will be between 0 and 1 for percents
					$this.val((isFinite($this.val()) && $this.data('format') === 'percent') ? $this.val() * 100 : $this.val());
				});
			}
			else {
				// return the collection.
				return this.each(function () {
					var $this = $(this), num = +$this.text().replace(regex_dec_num, '').replace(regex_dec, '.');
					$this.number(!isFinite(num) ? 0 : +num, decimals, dec_point, thousands_sep);
				});
			}
		}

		// Add this number to the element as text.
		return this.text($.number.apply(window, arguments));
	};

	//
	// Create .val() hooks to get and set formatted numbers in inputs.
	//

	// We check if any hooks already exist, and cache
	// them in case we need to re-use them later on.
	var origHookGet = null, origHookSet = null;

	// Check if a text valHook already exists.
	if ($.isPlainObject($.valHooks.text)) {
		// Preserve the original valhook function
		// we'll call this for values we're not
		// explicitly handling.
		if ($.isFunction($.valHooks.text.get)) origHookGet = $.valHooks.text.get;
		if ($.isFunction($.valHooks.text.set)) origHookSet = $.valHooks.text.set;
	}
	else {
		// Define an object for the new valhook.
		$.valHooks.text = {};
	}

	/**
	* Define the valHook to return normalised field data against an input
	* which has been tagged by the number formatter.
	*
	* @param object el			: The raw DOM element that we're getting the value from.
	*
	* @return mixed : Returns the value that was written to the element as a
	*				  javascript number, or undefined to let jQuery handle it normally.
	*/
	$.valHooks.text.get = function (el) {

		// Get the element, and its data.
		var $this = $(el), num, negative,
			data = $this.data('numFormat');

		// Does this element have our data field?
		if (!data) {
			// Check if the valhook function already existed
			if ($.isFunction(origHookGet)) {
				// There was, so go ahead and call it
				return origHookGet(el);
			}
			else {
				// No previous function, return undefined to have jQuery
				// take care of retrieving the value
				return undefined;
			}
		}
		else {
			// Remove formatting, and return as number.
			if (el.value === '') return '';


			// Convert to a number.
			num = +(el.value
				.replace(data.regex_dec_num, '')
				.replace(data.regex_dec, '.'));

			// MDB: add special handling for percents
			if (isFinite(num) && $this.data('format') === 'percent') {
				num = num / 100;
			}

			// If we've got a finite number, return it.
			// Otherwise, simply return 0.
			// Return as a string... thats what we're
			// used to with .val()
			return (el.value.indexOf('-') === 0 ? '-' : '') + (isFinite(num) ? num : 0);
		}
	};

	/**
	* A valhook which formats a number when run against an input
	* which has been tagged by the number formatter.
	*
	* @param object el		: The raw DOM element (input element).
	* @param float			: The number to set into the value field.
	*
	* @return mixed : Returns the value that was written to the element,
	*				  or undefined to let jQuery handle it normally.
	*/
	$.valHooks.text.set = function (el, val) {
		// Get the element, and its data.
		var $this = $(el),
			data = $this.data('numFormat');

		// Does this element have our data field?
		if (!data) {

			// Check if the valhook function already exists
			if ($.isFunction(origHookSet)) {
				// There was, so go ahead and call it
				return origHookSet(el, val);
			}
			else {
				// No previous function, return undefined to have jQuery
				// take care of retrieving the value
				return undefined;
			}
		}
		else {
			// MDB: add special handling for percents
			if (isFinite(val) && $this.data('format') === 'percent') {
				val = val * 100;
			}

			var num = $.number(val, data.decimals, data.dec_point, data.thousands_sep);

			// Make sure empties are set with correct signs.
			//			if(val.indexOf('-') === 0 && +num === 0)
			//			{
			//				num = '-'+num;
			//			}
			// Otherwise, don't worry about other valhooks, just run ours.
			return el.value = num;
		}
	};

	/**
	 * The (modified) excellent number formatting method from PHPJS.org.
	 * http://phpjs.org/functions/number_format/
	 *
	 * @modified by Sam Sehnert (teamdf.com)
	 *	- don't redefine dec_point, thousands_sep... just overwrite with defaults.
	 *	- don't redefine decimals, just overwrite as numeric.
	 *	- Generate regex for normalizing pre-formatted numbers.
	 *
	 * @param float number			: The number you wish to format, or TRUE to use the text contents
	 *								  of the element as the number. Please note that this won't work for
	 *								  elements which have child nodes with text content.
	 * @param int decimals			: The number of decimal places that should be displayed. Defaults to 0.
	 * @param string dec_point		: The character to use as a decimal point. Defaults to '.'.
	 * @param string thousands_sep	: The character to use as a thousands separator. Defaults to ','.
	 *
	 * @return string : The formatted number as a string.
	 */
	$.number = function (number, decimals, dec_point, thousands_sep) {
		// Set the default values here, instead so we can use them in the replace below.
		thousands_sep = (typeof thousands_sep === 'undefined') ? ',' : thousands_sep;
		dec_point = (typeof dec_point === 'undefined') ? '.' : dec_point;
		decimals = !isFinite(+decimals) ? 0 : Math.abs(decimals);

		// Work out the unicode representation for the decimal place and thousand sep.
		var u_dec = ('\\u' + ('0000' + (dec_point.charCodeAt(0).toString(16))).slice(-4));
		var u_sep = ('\\u' + ('0000' + (thousands_sep.charCodeAt(0).toString(16))).slice(-4));

		// Fix the number, so that it's an actual number.
		number = (number + '')
			.replace('\.', dec_point) // because the number if passed in as a float (having . as decimal point per definition) we need to replace this with the passed in decimal point character
			.replace(new RegExp(u_sep, 'g'), '')
			.replace(new RegExp(u_dec, 'g'), '.')
			.replace(new RegExp('[^0-9+\-Ee.]', 'g'), '');

		var n = !isFinite(+number) ? 0 : +number,
			s = '',
			toFixedFix = function (n, decimals) {
				var k = Math.pow(10, decimals);
				return '' + Math.round(n * k) / k;
			};

		// Fix for IE parseFloat(0.55).toFixed(0) = 0;
		s = (decimals ? toFixedFix(n, decimals) : '' + Math.round(n)).split('.');
		if (s[0].length > 3) {
			s[0] = s[0].replace(/\B(?=(?:\d{3})+(?!\d))/g, thousands_sep);
		}
		if ((s[1] || '').length < decimals) {
			s[1] = s[1] || '';
			s[1] += new Array(decimals - s[1].length + 1).join('0');
		}
		return s.join(dec_point);
	}

})(jQuery);
;/// <reference path="~/bootstrap/ema.js" />
/// <reference path="~/bootstrap/ema.templates.js" />
/// <reference path="~/bootstrap/ema.validation.js" />
/// <reference path="../modernizr.custom.js" />
/// <reference path="fastclick.js" />
/// <reference path="jquery.number.js" />
/// <reference path="~/emx/_PageLayout/ApplyInternetExplorerVersion.js"/>

/*! util.js */

//------- serializeObject -------
$.fn.serializeObject = function () {
	var o = {};
	var a = this.serializeArray();
	$.each(a, function () {
		if (o[this.name] !== undefined) {
			if (!o[this.name].push) {
				o[this.name] = [o[this.name]];
			}
			o[this.name].push(this.value || '');
		} else {

			o[this.name] = this.value || '';
		}
	});

	// We need to mark disabled values as null so our extend logic works, serializeArray ignores disabled fields
	this.find(':disabled, [readonly]').each(function (index, input) {
		o[this.name] = null;
	});

	return o;
};

//------- viewManager -------
var viewManager = function (targetSelector) {
	/// <summary>A helper to encapsulate rendering data in a view.</summary>
	/// <param name="targetSelector" type="string">The jQuery selector for the render target.</param>

	var $target = $(targetSelector),
		loadingClass = 'is-loading',
		deferred = null,
		activeRequest = null;

	function clearLoading(timeout) {
		clearTimeout(timeout);
		$target.parent().removeClass(loadingClass);
	}

	return {
		'Abort': function () {
			if (activeRequest && typeof (activeRequest.abort) === 'function') {
				clearLoading(activeRequest.loadingTimeout);
				activeRequest.abort();
				activeRequest = null;
			}

			if (deferred && typeof (deferred.reject) === 'function') {
				deferred.reject();
				deferred = null;
			}

			return this;
		},

		'Start': function (dataPromise, templateName, processModelFunction) {
			var scopedLoadingTimeout;

			var innerDeferred = $.Deferred(function () {
				// clear the content immediately
				// mobile safari doesn't reset the scroll top properly
				$target.empty().scrollTop(0);

				// delay showing the loading image for 100ms
				scopedLoadingTimeout = setTimeout(function () {
					$target.parent().addClass(loadingClass);
				}, 100);
			});

			// track the current request
			activeRequest = dataPromise;
			activeRequest.loadingTimeout = scopedLoadingTimeout;

			dataPromise
				.done(function (data) {
					if (typeof processModelFunction === 'function') {
						processModelFunction(data);
					}

					var template = Handlebars.templates[templateName];

					if (template) {
						$target.html(template(data));
						$target.find('[data-toggle="dependent-control"]').dependentControl();
					} else if (templateName) {
						console.error('Missing template: ' + templateName);
					}

					// set the context to the $target so the caller can wire events, etc
					innerDeferred.resolveWith($target, [data]);
				})
				.fail(function (jqXHR) {
					innerDeferred.reject();
				})
				.always(function () {
					clearLoading(scopedLoadingTimeout);
				});

			deferred = innerDeferred;
			return innerDeferred.promise();
		}
	}
};

//------- YearSelector -------
var viewYearSelector = function (chartDetails, year, templateName, renderTo) {
	var min = chartDetails[0].Year,
		max = chartDetails[chartDetails.length - 1].Year,
		range = max - min,
		model = {
			'Min': min,
			'Max': max,
			'Value': year,
			'ValuePercentage': Math.max(0, Math.min(100, parseInt((year - min) / range * 100))),
			'Precision': 0
		},
		$yearSelector = $('.chart-details-yearselector');

	// destroy the existing slider (too lazy to update it)
	if ($yearSelector.length) {
		$yearSelector.remove();
		$(document).off('click.yearselector');
	}

	// render it
	$(renderTo).append(Handlebars.templates[templateName](model));

	// wire up the slider and show it
	$yearSelector = $('.chart-details-yearselector');
	$yearSelector.find('.ctrl-sldr').slider();
	$yearSelector.show();

	// wire up the close link
	// clicking causes this window to close
	$(document).on('click.yearselector', function (e) {
		// clicks outside of this window will close the window
		if ($(e.target).closest('.chart-details-yearselector').length === 0) {
			$yearSelector.hide();
			$(document).off('click.yearselector');
		}
	});
};

var hideYearSelector = function () {
	$('.chart-details-yearselector').hide();
};

//------- formManager -------
var formManager = (function () {
	return {
		'parse': function ($form, initCallback) {
			/// <summary>Parses the form to wire up common events and validation</summary>

			// wire up the input behaviors
			$form.find(':text[data-format]').filter(':not([data-format="text"])').each(function (index, el) {
				var $input = $(el);
				$input.number(true, $input.data('precision'));
			});

			// run custom form initialization
			if ($.isFunction(initCallback)) {
				initCallback($form);
			}

			// wire up validation
			$.validator.unobtrusive.parse($form);
		}
	};
})();

//------- hashState -------
var hashState = (function ($) {
	return {
		SetState: function (state) {
			window.location.hash = encodeURIComponent(JSON.stringify(state));
		},
		GetState: function () {
			var hash = window.location.hash.split('#'),
				state = hash.length > 1 ? JSON.parse(decodeURIComponent(hash[1])) : null;

			return state;
		},
		GetKey: function (key) {
			var state = hashState.GetState() || {};

			return state[key];
		},
		SetKey: function (key, value) {
			/// <summary>Set a key value pair in the hashstate.  If value is null, the key is deleted.</summary>
			var state = hashState.GetState() || {};

			if (value === null) {
				delete state[key];
			} else {
				state[key] = value;
			}

			hashState.SetState(state);
		},
		NavigateTo: function (section, data) {
			// preserve the current state, if present
			var state = $.extend(hashState.GetState(), {
				'section': section,
				'data': data
			});

			hashState.SetState(state);
		}
	};
})(window.jQuery);

!function ($, hashState) {
	var $document = $(document),
		$window = $(window),
		lastState = {};

	// monitor state changes and fire the appropriate events
	$window.on('hashchange', function () {
		var state = hashState.GetState() || {},
			$document = $(document);

		// trigger change events
		for (var key in $.extend({}, lastState, state)) {
			if ((state.hasOwnProperty(key) || lastState.hasOwnProperty(key)) && state[key] !== lastState[key]) {
				$document.trigger('hashchange-' + key, [state[key]]);
			}
		}

		lastState = state;
	});

}(window.jQuery, window.hashState);

if (emaConfig && emaConfig.IsLegacyView) hashState.SetKey('scenario', emaConfig.ScenarioId);

//------- initialization -------
$(function () {
	//------- Touch events ------
	if (Modernizr.touch) {
		// Initialize fastclick handler
		new FastClick(document.body);

		// Disable text selection for the iPad
		$(document.body).addClass('is-unselectable');
	}
});
;/// <reference path="~/bootstrap/ema.js" />
/// <reference path="util.js" />

/*! combobox.js */

!function ($) {
	var $document = $(document);

	$document.on('click', '.js-combobox-dropdown li', function () {
		var $li = $(this),
			liText = $.trim($li.text()),
			$comboButton = $li.closest('.input-group-btn'),
			$combotext = $comboButton.prev('.js-combobox-text');

		$combotext
			.val(liText)
			.data($li.data())
			.trigger('change');

		$comboButton.removeClass('open');
	});

}(window.jQuery);
;/// <reference path="~/bootstrap/ema.js" />
/// <reference path="util.js" />

/*! durationselector.js */

!function ($) {
	var $document = $(document);

	$document.on('change', '.ctrl-durationselector', function (e) {
		var $dropdown = $(this),
			customOptionTextbox = $('.ctrl-customdurationtextbox'),
			selectedOption = $dropdown.find(':selected');

		if (selectedOption.val() === 'Custom') {
			$dropdown.removeClass('col-md-12').addClass('col-md-8');
			customOptionTextbox.removeClass('hidden').find('input').focus();
		}
		else {
			$dropdown.removeClass('col-md-8').addClass('col-md-12');
			customOptionTextbox.addClass('hidden');
		}
	});

}(window.jQuery);
;/// <reference path="~/bootstrap/ema.js" />

(function ($) {
	var defaultEducationOptions = {
		shouldSetStartAndStopOnLoad: function () {
			return false;
		},
		valueInputSelector: "#Value",
		disableValueInputWhenInstitutionIsSet: true
	};

	var wireUpInstitutionPicker = function ($form, educationOptions) {
		var emaClient = new EMA.Api.Client(emaApplicationPath),
			state = $form.find('[name="InstitutionState"]').val(),
			institutionNameMenuOptions = [];

		emaClient.GetEducationInstitutionsByState(state);

		function rerenderInstitutions(institutions) {
			if (institutionNameMenuOptions.length) {
				institutionNameMenuOptions = [];
				$form.find('input[name="InstitutionName"]')
					.val('')
					.data({})
					.trigger('change');
			}

			for (var i = 0; i < institutions.length; i++) {
				institutionNameMenuOptions.push({
					Text: institutions[i].Name,
					Value: institutions[i].Name,
					AdditionalValues: institutions[i]
				});
			}

			filterInstitutionNameMenuOptions();
		}

		function filterInstitutionNameMenuOptions(query) {
			var dropdownMenu = $('#institution-name-button').siblings('.dropdown-menu');
			var menuOptions = query ? institutionNameMenuOptions.filter(function(option) {
				var regEx = new RegExp('^' + query, 'i');
				return option.Text.match(regEx);
			}) : institutionNameMenuOptions;

			dropdownMenu.html(Handlebars.partials.DropdownItems(menuOptions));
		}

		function updateEducationExpenseValues(institution) {
			var tuition = institution.state === emaConfig.ClientStateForQuickAdd ? institution.costinstate : institution.costoutstate;

			$form.find('[name="InstitutionTuition"]').val(tuition).trigger('change');
			$form.find('[name="InstitutionBooksAndSupplies"]').val(institution.booksandsupplies).trigger('change');
			$form.find('[name="InstitutionRoomAndBoard"]').val(institution.roomandboard).trigger('change');
			$form.find('[name="InstitutionOtherExpenses"]').val(institution.otherexpenses).trigger('change');

			var valueInput = $form.find(educationOptions.valueInputSelector);
			valueInput.val(tuition + institution.booksandsupplies + institution.roomandboard + institution.otherexpenses);

			if (educationOptions.disableValueInputWhenInstitutionIsSet) {
				valueInput.attr('disabled', 'disabled').closest('.ctrl').addClass('ctrl-is-disabled');
			}
		}

		emaClient.OnComplete = function (output) {
			if (output.Succeeded) {
				rerenderInstitutions(output.Results);
			} else {
				showFailure('There was a problem.', 'The institutions for your selected state could not be loaded. Please try again.');
			}
		};

		$form.on('change', '#InstitutionState', function () {
			var dropdown = $(this),
				state = dropdown.val();

			emaClient.GetEducationInstitutionsByState(state);
		});

		$form.on('change', '[name="InstitutionName"]', function () {
			var input = $(this),
				institutionName = input.val(),
				institution = input.data();

			if (institutionName === institution.name) {
				updateEducationExpenseValues(institution);
			}
		});

		$form.on('keyup paste', '[name="InstitutionName"]', function () {
			var input = $(this),
				institutionName = input.val();

			filterInstitutionNameMenuOptions(institutionName);
			$(this).next().addClass('open');
		});
	};

	window.setupStartAndEndForEducation = function ($form, educationOptions) {	
		educationOptions = $.extend({}, defaultEducationOptions, educationOptions);

		var $educationForInput = $form.find('#EducationFor');

		function setAppropriateStartAndStop() {
			var $selectedItem = $educationForInput.find(':selected'),
			startYear = $selectedItem.data('startyear'),
			endYear = $selectedItem.data('endyear'),
			$startYearInput = $('#StartYear'),
			$startYearValueInput = $('#StartYearValueSelector[data-type="CalendarYear"]'),
			$endYearInput = $('#EndYear'),
			$endYearValueInput = $('#EndYearValueSelector[data-type="CalendarYear"]');

			$startYearInput.val('CalendarYear').change();
			$endYearInput.val('CalendarYear').change();

			$startYearValueInput.val(startYear).change();
			$endYearValueInput.val(endYear).change();
		}

		$educationForInput.on('change', setAppropriateStartAndStop);

		if (educationOptions.shouldSetStartAndStopOnLoad()) {
			setAppropriateStartAndStop();
		}

		wireUpInstitutionPicker($form, educationOptions);
	};

	window.wireUpInstitutionPicker = function($form) {
		wireUpInstitutionPicker($form, defaultEducationOptions);
	};
})(window.jQuery);
;/// <reference path="~/bootstrap/ema.js" />
/// <reference path="~/bootstrap/ema.templates.js" />
/// <reference path="jquery.number.js" />
/*! handlebars.helpers.controls.js */

!function ($, Handlebars) {

	var getField = function (context, fieldName) {
		if (!context) {
			throw new Error("Context is required in control helper.");
		} else if (!fieldName) {
			throw new Error("FieldName is required in control helper.");
		} else if (!context.hasOwnProperty(fieldName)) {
			throw new Error("Missing '" + fieldName + "' property in template context.");
		} else {
			if (context[fieldName] !== null && context[fieldName].hasOwnProperty('Value')) {
				return context[fieldName].Value;
			} else {
				return context[fieldName];
			}
		}
	};
	var getMetadataForField = function (context, fieldName) {
		if (!context) {
			throw new Error("Context is required in control helper.");
		} else if (!fieldName) {
			throw new Error("FieldName is required in control helper.");
		} else if (!context.hasOwnProperty('Metadata')) {
			throw new Error("Missing 'Metadata' property in template context.");
		} else if (!context.Metadata.hasOwnProperty(fieldName)) {
			throw new Error("Missing '" + fieldName + "' property in Metadata.");
		} else {
			return context.Metadata[fieldName];
		}
	};
	var createControlModel = function (value, metadata, options, onOffData) {
		var label = options.hash.label || metadata.Label || metadata.Name,
			validationAttributes = { "data-val": true };

		if (metadata.Required) {
			validationAttributes["data-val-required"] = "Field is required";
		}

		if (!metadata.DoNotValidateXss) {
			validationAttributes["data-val-antixssfeedback"] = "Field contains a potentially unsafe character sequence";
		}

		if (metadata.Range) {
			function formatValue(num) {
				var precision = isFinite(metadata.Precision) ? parseInt(metadata.Precision) : 0;
				num = isFinite(num) ? parseFloat(num) : 0;

				if (metadata.Format === "percent") {
					return $.number(num * 100.0, precision) + '%';
				} else if (metadata.Format === "dollar") {
					return '$' + $.number(num, precision);
				}
				else {
					return $.number(num, precision);
				}
			}

			validationAttributes["data-val-range"] = metadata.Range.Min !== metadata.Range.Max ?
				"Must be between " + formatValue(metadata.Range.Min) + " and " + formatValue(metadata.Range.Max) :
				"Must be " + formatValue(metadata.Range.Min);
			validationAttributes["data-val-range-min"] = metadata.Range.Min;
			validationAttributes["data-val-range-max"] = metadata.Range.Max;
		}

		return {
			"Name": metadata.Name,
			"Value": value,
			"Label": label,
			"Description": metadata.Description,
			"Format": metadata.Format || "text",
			"Precision": metadata.Precision || 0,
			"SelectedText": getSelectedText(value, metadata.Options),
			"Options": setSelectedOptions(value, metadata.Options, onOffData),
			"ValidationAttributes": validationAttributes,
			"IsReadOnly": metadata.ReadOnly || options.hash.readonly,
			"ReadOnlyReason": metadata.ReadOnlyReason,
			"Footers": metadata.Footers
		};
	};

	var defaultOnOffData = {
		'IsChecked': true,
		'DefaultValue': undefined
	};

	var isOptionSelected = function (item, value, onOffData) {
		var defaultValue = onOffData.DefaultValue;
		var isChecked = onOffData.IsChecked;

		var defaultValueDefined = typeof defaultValue !== 'undefined';

		var valueMatches = item.Value === String(value);
		var defaultValueMatches = defaultValueDefined && !isChecked && item.Value === String(defaultValue);
		return valueMatches || defaultValueMatches;
	};

	var setSelectedOptions = function (value, listItems, onOffData) {
		onOffData = $.extend({}, defaultOnOffData, onOffData);

		if (!listItems || !listItems.length) {
			return [];
		}

		for (var i = 0; i < listItems.length; i++) {
			if (isOptionSelected(listItems[i], value, onOffData)) {
				listItems[i].IsSelected = true;
			}
		}

		return listItems;
	};

	var getSelectedText = function (value, listItems) {
		/// <summary>Return the text for the selected option or empty string if not valid.</summary>
		var selectedText = "";

		if (listItems && listItems.length) {
			$.each(listItems, function (index, el) {
				if (el.Value === String(value)) {
					selectedText = el.Text || el.Value;
					return false; // break
				}
			});
		}

		return selectedText;
	};
	var getSelectedValue = function (value, listItems) {
		/// <summary>Return the value for the selected option or empty string if not valid.</summary>
		var selectedValue = "";

		if (listItems && listItems.length) {
			$.each(listItems, function (index, el) {
				if (el.Value === String(value)) {
					selectedValue = el.Value;
					return false; // break
				}
			});
		}

		return selectedValue;
	};

	var getMaxLength = function (precision, min, max) {
		return Math.max(min.toString().length, max.toString().length) + (precision > 0 ? precision + 1 : 0);
	};

	Handlebars.registerHelper('htmlattributes', function (list, options) {
		var getAttributesFromObject = function (obj, keyPrefix) {
			var key, val, arr = [];
			for (key in obj) {
				val = obj[key];
				if (typeof (val) === 'object') {
					// automatically convert JSON
					val = JSON.stringify(val).replace(/"/g, '&quot;');
				}

				// data attributes MUST be lowercase for IE8
				if (keyPrefix === 'data-') {
					key = key.toLowerCase();
				}

				arr.push(keyPrefix + key + '="' + val + '"');
			}
			return arr.join(' ');
		},
			html = getAttributesFromObject(list, options.hash.prefix || '');

		return new Handlebars.SafeString(html);
	});

	Handlebars.registerHelper('textbox', function (fieldName, options) {
		var value = getField(this, fieldName),
			metadata = getMetadataForField(this, fieldName),
			model = createControlModel(value, metadata, options),
			template = Handlebars.templates["TextboxControl"],
			html = template(model);

		return new Handlebars.SafeString(html);
	});

	Handlebars.registerHelper('textarea', function (fieldName, options) {
		var value = getField(this, fieldName),
			metadata = getMetadataForField(this, fieldName),
			model = createControlModel(value, metadata, options),
			template = Handlebars.templates["TextareaControl"],
			html = template(model);

		return new Handlebars.SafeString(html);
	});

	var getPlusMinusModel = function (context, fieldName, options) {
		var value = getField(context, fieldName),
			metadata = getMetadataForField(context, fieldName),
			format = metadata.Format,
			isDollar = format === 'dollar',
			model = $.extend({},
				createControlModel(value, metadata, options),
				{
					'ValuePrefix': isDollar ? '$' : null,
					'Increment': options.hash.increment || (isDollar ? 10000 : 1),
					'Min': (metadata.Range ? metadata.Range.Min : 0) || 0,
					'Max': metadata.Range ? metadata.Range.Max : ''
				}
			);

		return model;
	};
	Handlebars.registerHelper('plusminus', function (fieldName, options) {
		var model = getPlusMinusModel(this, fieldName, options),
			template = Handlebars.templates["PlusMinusControl"],
			html = template(model);

		return new Handlebars.SafeString(html);
	});
	Handlebars.registerHelper('plusminusonoff', function (fieldName, options) {
		var value = getField(this, fieldName),
			model = $.extend({}, getPlusMinusModel(this, fieldName, options), getOnOffData(this, fieldName, value)),
			template = Handlebars.templates["PlusMinusOnOffControl"],
			html = template(model);

		return new Handlebars.SafeString(html);
	});

	var getDropDownModel = function (value, metadata, options, onOffData) {
		return $.extend({},
			createControlModel(getSelectedValue(value, metadata.Options), metadata, options, onOffData),
			{
				'SelectedText': getSelectedText(value, metadata.Options),
				HasCustomOption: metadata.HasCustomOption
			}
		);
	};

	var getQuickAddData = function (metadata) {
		var AdditionalValues = metadata.AdditionalValues;
		if (!AdditionalValues)
			return {};

		return {
			QuickAddOptions: AdditionalValues.QuickAddOptions,
			HasOneQuickAddOption: (AdditionalValues.QuickAddOptions || []).length === 1,
			QuickAddType: AdditionalValues.QuickAddType,
			IsEntity: AdditionalValues.IsEntity,
			IsRealEstate: AdditionalValues.IsRealEstate,
			IsPersonalProperty: AdditionalValues.IsPersonalProperty,
			IsAccount: AdditionalValues.IsAccount
		}
	};

	var getOnOffData = function (context, fieldName, value) {
		return {
			'IsChecked': (value !== undefined && value !== null && value !== ''),
			'DefaultValue': getField(context, fieldName + 'Default')
		};
	};

	Handlebars.registerHelper('dropdown', function (fieldName, options) {
		var value = getField(this, fieldName),
			metadata = getMetadataForField(this, fieldName),
			template = Handlebars.templates["DropdownControl"],
			model = $.extend({}, getDropDownModel(value, metadata, options), getQuickAddData(metadata)),
			html = template(model);

		return new Handlebars.SafeString(html);
	});

	Handlebars.registerHelper('dropdownonoff', function (fieldName, options) {
		var value = getField(this, fieldName);
		var metadata = getMetadataForField(this, fieldName);
		var template = Handlebars.templates["DropdownOnOffControl"];

		var onOffData = getOnOffData(this, fieldName, value);
		var model = $.extend({}, getDropDownModel(value, metadata, options, onOffData), getQuickAddData(metadata), onOffData);
		var html = template(model);

		return new Handlebars.SafeString(html);
	});

	Handlebars.registerHelper('entitydropdown', function (fieldName, options) {
		var list = getField(this, fieldName),
			metadata = getMetadataForField(this, fieldName);

		function getTooltip(list) {
			if (!list) {
				return '';
			}
			var tooltip = '',
				i,
				length = list.length,
				entity = null,
				description = null;

			for (i = 0; i < length; i++) {
				entity = list[i];
				description = entity.Text + ' (' + $.number(entity.Percent * 100.0, 2) + '%)';

				tooltip += description + (i < length - 1 ? ', ' : '');
			}
			return tooltip;
		}

		function getOwnerName(value) {
			if (metadata.Options) {
				for (var i = 0; i < metadata.Options.length; i++) {
					if (metadata.Options[i].Value === value)
						return metadata.Options[i].Text;
				}
			}
			return 'Multiple';
		}

		var value = list !== null && list.length === 1 ? list[0].Value : null,
			model = $.extend({},
				getDropDownModel(value, metadata, options),
				{
					'ReadOnly': list !== null && (list.length > 1 || list.length === 1 && list[0].Percent < 1.0),
					'OwnerName': getOwnerName(value),
					'Tooltip': getTooltip(list),
				},
				getQuickAddData(metadata)
			),
			template = Handlebars.templates["EntityDropdownControl"],
			html = template(model);

		return new Handlebars.SafeString(html);
	});
	Handlebars.registerHelper('yearselector', function (fieldName, options) {
		var value = getField(this, fieldName),
			value2 = getField(this, fieldName + 'Value'),
			metadata = getMetadataForField(this, fieldName),
			metadata2 = getMetadataForField(this, fieldName + 'Value'),
			// we only need to show the custom textbox on specific items
			isCalendarYear = /CalendarYear/.test(value),
			isClientAge = /ClientAge/.test(value),
			isSpouseAge = /SpouseAge/.test(value),
			isDurationFromStart = /DurationFromStart/.test(value),
			showCustomDropdown = isCalendarYear || isClientAge || isSpouseAge || isDurationFromStart,
			customOptions = isCalendarYear ?
				metadata2.AdditionalValues.CalendarYearOptions :
				(isClientAge ?
					metadata2.AdditionalValues.ClientAgeOptions :
						(isSpouseAge ?
							metadata2.AdditionalValues.SpouseAgeOptions :
							(isDurationFromStart ?
								metadata2.AdditionalValues.DurationFromStartOptions :
								null
							)
						)
				),
			model = $.extend({},
				createControlModel(getSelectedValue(value, metadata.Options), metadata, options),
				{
					'SelectedText': getSelectedText(value, metadata.Options),
					'ShowCustomDropdown': showCustomDropdown,
					'Custom': $.extend({},
						createControlModel(getSelectedValue(value2, customOptions), metadata2, options),
						{
							'SelectedText': getSelectedText(value2, customOptions),
							'IsCalendarYear': isCalendarYear,
							'CalendarYearOptions': setSelectedOptions(value2, metadata2.AdditionalValues.CalendarYearOptions),
							'IsClientAge': isClientAge,
							'ClientAgeOptions': setSelectedOptions(value2, metadata2.AdditionalValues.ClientAgeOptions),
							'IsSpouseAge': isSpouseAge,
							'SpouseAgeOptions': setSelectedOptions(value2, metadata2.AdditionalValues.SpouseAgeOptions),
							'IsDurationFromStart': isDurationFromStart,
							'DurationFromStartOptions': setSelectedOptions(value2, metadata2.AdditionalValues.DurationFromStartOptions)
						}
					)
				}),
			template = Handlebars.templates["YearSelectorControl"],
			html = template(model);

		return new Handlebars.SafeString(html);
	});
	Handlebars.registerHelper('growthrateselector', function (fieldName, options) {

		var rate = getField(this, fieldName),
			rateMetadata = getMetadataForField(this, fieldName),
			customRate = getField(this, fieldName + 'Custom'),
			customRateMetadata = getMetadataForField(this, fieldName + 'Custom');

		var getInputMaxLength = function(metadata) {
			var isPercent = metadata.Format === 'percent',
				precision = Number(metadata.Precision || 0),
				min = metadata.Range ? (isPercent ? Number(metadata.Range.Min) * 100.0 : metadata.Range.Min) : null,
				max = metadata.Range ? (isPercent ? Number(metadata.Range.Max) * 100.0 : metadata.Range.Max) : null;

			return {
				'MaxLength': getMaxLength(precision, min, max)
			};
		};

		var model = $.extend({},
			createControlModel(getSelectedValue(rate, rateMetadata.Options), rateMetadata, options),
			{
				'SelectedText': getSelectedText(rate, rateMetadata.Options),
				'IsCustomRate': (rate === "Custom"),
				'RenderHidden': this.CanEditGrowthRates !== true,
				'Custom': $.extend({}, createControlModel(customRate, customRateMetadata, options), getInputMaxLength(customRateMetadata))
			}),
			canEditGrowthRate = this.CanEditGrowthRates !== true || typeof (this.IsGrowthRateEditable) !== 'boolean' || this.IsGrowthRateEditable,
			template = Handlebars.templates[canEditGrowthRate ? "GrowthRateSelectorControl" : "FixedGrowthRateSelectorControl"],
			html = template(model);

		return new Handlebars.SafeString(html);
	});
	Handlebars.registerHelper('durationselector', function (fieldName, options) {
		var duration = getField(this, fieldName),
			durationMetadata = getMetadataForField(this, fieldName),
			customDuration = getField(this, fieldName + 'Custom'),
			customDurationMetadata = getMetadataForField(this, fieldName + 'Custom'),
			model = $.extend({},
			createControlModel(getSelectedValue(duration, durationMetadata.Options), durationMetadata, options),
			{
				'SelectedText': getSelectedText(duration, durationMetadata.Options),
				'IsCustomDuration': (duration === "Custom"),
				'Custom': createControlModel(customDuration, customDurationMetadata, options)
			}),
			template = Handlebars.templates["DurationSelectorControl"],
			html = template(model);

		return new Handlebars.SafeString(html);
	});
	var getSliderModel = function (value, metadata, options, defaultValue) {
		var format = metadata.Format || 'percent',
			isPercent = format === 'percent',
			metaMin = metadata.Range ? (isPercent ? Number(metadata.Range.Min) * 100.0 : metadata.Range.Min) : null,
			metaMax = metadata.Range ? (isPercent ? Number(metadata.Range.Max) * 100.0 : metadata.Range.Max) : null,
			min = Number((isPercent ? Number(options.hash.min) * 100.0 : options.hash.min) || metaMin || 0),
			max = Number((isPercent ? Number(options.hash.max) * 100.0 : options.hash.max) || metaMax || 100),
			precision = Number(metadata.Precision || 0),
			// if precision > 0 then add 1 to maxLength to account for the decimal point.
			maxLength = getMaxLength(precision, min, max),
			range = max - min,
			valueForPercentage = (value === null || typeof value === 'undefined') ? defaultValue : value,
			valuePercentage = Math.max(0, Math.min(100, parseInt(((isPercent ? valueForPercentage * 100 : valueForPercentage) - min) / range * 100))),
			fillStartPoint = Math.max(0, Math.min(100, min / (min - max) * 100)),
			percentFromStartPoint = valuePercentage - fillStartPoint,
			fillWidth = Math.abs(percentFromStartPoint),
			fillLeft = percentFromStartPoint >= 0 ? fillStartPoint : valuePercentage,
			includeZeroLabel = fillStartPoint > 0 && fillStartPoint < 100,
			model = $.extend({},
				createControlModel(value, metadata, options),
				{
					'Min': min,
					'Max': max,
					'ValuePercentage': valuePercentage,
					'Format': format,
					'ValueSuffix': isPercent ? '%' : null,
					'MaxLength': maxLength,
					'SupportsNegatives': min < 0,
					'CrossesZero': min < 0 && max > 0,
					'FillWidth': fillWidth,
					'FillLeft': fillLeft,
					'IncludeZeroLabel': includeZeroLabel
				}
			);
		return model;
	};
	Handlebars.registerHelper('slider', function (fieldName, options) {
		var value = getField(this, fieldName),
			metadata = getMetadataForField(this, fieldName),
			model = getSliderModel(value, metadata, options),
			template = Handlebars.templates["SliderControl"],
			html = template(model);

		return new Handlebars.SafeString(html);
	});
	Handlebars.registerHelper('slideronoff', function (fieldName, options) {
		var value = getField(this, fieldName),
			metadata = getMetadataForField(this, fieldName),
			onOffData = getOnOffData(this, fieldName, value),
			model = $.extend({}, getSliderModel(value, metadata, options, onOffData.DefaultValue), onOffData),
			template = Handlebars.templates["SliderOnOffControl"],
			html = template(model);

		return new Handlebars.SafeString(html);
	});

	var getMenuModel = function (context, options) {
		return $.extend(context, { 'Tooltip': options.hash.tooltip });
	};
	Handlebars.registerHelper('buttonmenu', function (id, text, menuOptions, options) {
		var model = getMenuModel({ 'ID': id, 'Selected': { 'Text': text }, 'TemplatePrefix': options.hash.templateprefix, 'Options': menuOptions }, options),
			template = Handlebars.templates["ButtonMenuControl"],
			html = template(model);

		return new Handlebars.SafeString(html);
	});
	Handlebars.registerHelper('linkmenu', function (context, options) {
		var model = getMenuModel(context, options),
			template = Handlebars.templates["LinkMenuControl"],
			html = template(model);

		return new Handlebars.SafeString(html);
	});

	Handlebars.registerHelper('combobox', function (title, menuOptions, id, value, options) {
		var template = Handlebars.templates['ComboBoxControl'],
			metadata = getMetadataForField(this, title),
			model = createControlModel(value, metadata, options),
			html;

		model.Options = menuOptions;
		model.ID = id;
		model.LeftAlign = options.hash.leftalign;
		html = template(model);
		return new Handlebars.SafeString(html);
	});

	Handlebars.registerHelper('presentvaluableheader', function (originalModel, options) {
		var presentValuedHeaderModel, template, html;

		presentValuedHeaderModel = {
			PresentValued: originalModel.PresentValued,
			Text: options.hash.text
		};

		template = Handlebars.templates["PresentValuableHeader"];
		html = template(presentValuedHeaderModel);

		return new Handlebars.SafeString(html);
	});

}(window.jQuery, Handlebars);
;/// <reference path="~/bootstrap/ema.js" />
/// <reference path="~/bootstrap/ema.templates.js" />
/// <reference path="jquery.number.js" />
/*! handlebars.helpers.interests.js */

!function ($, Handlebars) {

	function getTooltip(list) {
		if (!list) {
			return '';
		}
		var tooltip = '',
			i,
			length = list.length,
			entity = null,
			description = null;

		for (i = 0; i < length; i++) {
			entity = list[i];
			description = entity.Text + ' (' + $.number(entity.Percent * 100.0, 2) + '%)';

			tooltip += description + (i < length - 1 ? ', ' : '');
		}
		return tooltip;
	}

	Handlebars.registerHelper('interest', function (list, options) {
		if (!list) {
			return '';
		}
		else if ($.isArray(list) && list.length > 1) {
			return new Handlebars.SafeString('<em class="font-size-normal" title="' + getTooltip(list) + '">Multiple</em>');
		}
		else if ($.isArray(list) && list.length === 1) {
			return list[0].Text;
		}
		else {
			return '';
		}	
	});
}(window.jQuery, Handlebars);
;/// <reference path="~/bootstrap/ema.js" />
/// <reference path="~/bootstrap/ema.templates.js" />
/// <reference path="jquery.number.js" />
/*! handlebars.helpers.numbers.js */
!function ($, Handlebars) {
	var noDataHtml = "&ndash;&ndash;";

	var formatString = function () {
		var s = arguments[0];
		for (var i = 0; i < arguments.length - 1; i++) {
			var reg = new RegExp("\\{" + i + "\\}", "gm");
			s = s.replace(reg, arguments[i + 1]);
		}

		return s;
	};

	Handlebars.registerHelper('number', function (value, options) {
		var formattedValue = value !== null ? $.number(value, options.hash.precision || 0) : noDataHtml;
		return new Handlebars.SafeString(formattedValue);
	});

	Handlebars.registerHelper('dollar', function (value, options) {
		if (value === null) {
			return new Handlebars.SafeString(noDataHtml);
		}

		var precision = (options && options.hash.precision) ? options.hash.precision : 0;
		var formattedValue = $.number(value, precision);

		if (value < 0) {
			formattedValue = '($' + formattedValue.substring(1) + ')';
		} else {
			formattedValue = '$' + formattedValue;
		}

		return new Handlebars.SafeString(formattedValue);
	});

	Handlebars.registerHelper('percent', function (value, options) {
		var formattedValue = value !== null ? $.number(value * 100, options.hash.precision || 0) + '%' : noDataHtml;
		return new Handlebars.SafeString(formattedValue);
	});

	Handlebars.registerHelper('ndash', function (value, options) {
		var formattedValue = value !== null && value !== undefined && value !== '' ? value : noDataHtml;
		return new Handlebars.SafeString(formattedValue);
	});

	Handlebars.registerHelper('netchange', function (value, options) {
		function chooseOnSign(value, positive, negative) {
			return (value > 0 ? positive : (value < 0 ? negative : ""));
		}

		if (value === null) {
			return new Handlebars.SafeString(noDataHtml);
		}

		var precision = (options && options.hash.precision) ? options.hash.precision : 0;
		var formattedValue = $.number(Math.abs(value), precision),
			positiveClass = options.hash.positiveClass || 'green',
			negativeClass = options.hash.negativeClass || 'red';

		return new Handlebars.SafeString(formatString('<span class="arrow {0}"><i class="fa {1}" /> <span class="text"><span class="small-dollar">{2}</span>{3}{4}</span></span>', chooseOnSign(value, positiveClass, negativeClass), chooseOnSign(value, 'fa-arrow-circle-up', 'fa-arrow-circle-down'), options.hash.prefix || '', formattedValue, options.hash.suffix || ''));
	});

	Handlebars.registerHelper('evenorodd', function (value, options) {
		return value % 2 === 0 ? 'even' : 'odd';
	});

	Handlebars.registerHelper('assetorliability', function (value, options) {
		return value < 0 ? 'red' : 'green';
	});

}(window.jQuery, Handlebars);
;/// <reference path="~/bootstrap/ema.js" />
/// <reference path="~/bootstrap/ema.templates.js" />
/*! handlebars.helpers.strings.js */

!function (Handlebars) {

	Handlebars.registerHelper('tolowercase', function (text, options) {
		if (typeof (text) !== 'string') {
			return "";
		}

		return new Handlebars.SafeString(text.toLowerCase());
	});

	Handlebars.registerHelper('touppercase', function (text, options) {
		if (typeof (text) !== 'string') {
			return "";
		}

		return new Handlebars.SafeString(text.toUpperCase());
	});

	Handlebars.registerHelper('stringify', function (context, options) {
		return new Handlebars.SafeString(JSON.stringify(context, null, 2));
	});

	Handlebars.registerHelper('getYearDescription', function (unformattedYearDescription) {
		if (unformattedYearDescription === 'Current Year')
			return 'As of Today';
		return 'in ' + unformattedYearDescription;
	});

	Handlebars.registerHelper('possessify', function (name, options) {
		if (name === '')
			return name;

		var newName = name;
		if (name[name.length - 1] === 's')
			newName += '\'';
		else
			newName += '\'s';
		return new Handlebars.SafeString(newName);
	});
}(Handlebars);
;/// <reference path="~/bootstrap/ema.js" />
/*! jquery.viewport.js */
/*
 * Viewport - jQuery selectors for finding elements in viewport
 *
 * Copyright (c) 2008-2009 Mika Tuupola
 *
 * Licensed under the MIT license:
 *   http://www.opensource.org/licenses/mit-license.php
 *
 * Project home:
 *  http://www.appelsiini.net/projects/viewport
 *
 */
(function ($) {

	$.belowthefold = function (element, settings) {
		var fold = $(window).height() + $(window).scrollTop();
		return fold <= $(element).offset().top - settings.threshold;
	};

	$.abovethetop = function (element, settings) {
		var top = $(window).scrollTop();
		return top >= $(element).offset().top + $(element).outerHeight(true) - settings.threshold;
	};

	$.rightofscreen = function (element, settings) {
		var fold = $(window).width() + $(window).scrollLeft();
		return fold <= $(element).offset().left - settings.threshold;
	};

	$.leftofscreen = function (element, settings) {
		var left = $(window).scrollLeft();
		return left >= $(element).offset().left + $(element).outerWidth(true) - settings.threshold;
	};

	$.inviewport = function (element, settings) {
		return !$.rightofscreen(element, settings) && !$.leftofscreen(element, settings) && !$.belowthefold(element, settings) && !$.abovethetop(element, settings);
	};

	$.extend($.expr.pseudos, {
		"below-the-fold": function (a, i, m) {
			return $.belowthefold(a, { threshold: 0 });
		},
		"above-the-top": function (a, i, m) {
			return $.abovethetop(a, { threshold: 0 });
		},
		"left-of-screen": function (a, i, m) {
			return $.leftofscreen(a, { threshold: 0 });
		},
		"right-of-screen": function (a, i, m) {
			return $.rightofscreen(a, { threshold: 0 });
		},
		"in-viewport": function (a, i, m) {
			return $.inviewport(a, { threshold: 0 });
		}
	});


})(jQuery);

;/// <reference path="~/bootstrap/ema.js" />
/// <reference path="util.js" />

/*! linkmenu.js */

!function ($, hashState) {
	var $document = $(document),
		$window = $(window);

	var setLinkMenuText = function ($linkMenu, text) {
		$linkMenu.html(text + ' <i class="fa fa-caret-down hidden-print"></span>');
	};

	$document.on('click', '.link-menu [data-value]', function (e) {
		var $li = $(this),
			value = $li.data('value'),
			$menu = $li.parent('.link-menu'),
			menuID = $menu.data('for'),
			$linkMenu = $('#' + menuID),
			hashKey = $menu.data('hashkey');

		// update the page state
		hashState.SetKey(hashKey, value);

		// copy the text of the menu item that was clicked
		setLinkMenuText($linkMenu, $li.text());
	});

	// wire up a hashchange event for each menu
	$window.on('hashchange', function () {
		$('.link-menu').each(function (e, el) {
			var $menu = $(this),
				$linkMenu = $('#' + $menu.data('for')),
				key = $menu.data('hashkey'),
				state = hashState.GetState() || {},
				value = hashState.GetKey(key),
				$selectedItem = $menu.find('[data-value="' + value + '"]');

			// set the selected text and trigger an event if the value has changed
			if ($selectedItem.length && value !== $linkMenu.data('selected')) {
				setLinkMenuText($linkMenu, $selectedItem.text());
				$selectedItem.trigger('menu-click');
			}
		});
	});

	$(document).on('click', '#scenario-menu li', function () {
		const hash = hashState.GetState();

		if (hash.report == undefined) {
			hash.report = emaConfig.DefaultReport;
		}

		const hashData = {
			"scenario": hash.scenario,
			"report": hash.report,
			"year": hash.year,
			"step": hash.step
		};

		const planId = $(this).data('value');
		const selectedTool = emaConfig.DistributionDecisionPageType.replace(" ", "");
		const pageRoute = emaPageRoute.toLowerCase().replace("{clientid}", emaPageModel.ClientID).replace("{planid}", planId).replace("{selectedtool}", selectedTool);
		const navigateTo = emaApplicationPath + pageRoute + '#' + JSON.stringify(hashData);

		$('.js-gotopresentation').data('scenario-id', planId);

		window.location.href = navigateTo;
	});
}(window.jQuery, window.hashState);
;/// <reference path="~/bootstrap/ema.js" />
/// <reference path="../Errors/errors.js" />
/// <reference path="../_PageLayout/Util.js" />
/*! webapi.js */

var emaWebApi = (function ($, config) {

	// make sure config is defined
	if (config === null || config === 'undefined') {
		throw 'config must be defined';
	}

	var $document = $(document),
		services = {},
		/// <summary>A promise for the review section list</summary>
		reviewSectionsPromise,
		/// <summary>A dictionary of promises for the metadata of a type of review model</summary>
		factMetadataPromises,

		estateMenuPromise = {};

	//------- Ajax -------
	var ajaxGET = function (route, data) {
		return ajax(route, data, 'GET');
	};

	var ajaxPOST = function (route, data) {
		return ajax(route, data, 'POST');
	};

	var ajaxPUT = function (route, data) {
		var options = { 'dataType': '' };
		return ajax(route, data, 'PUT', options);
	};

	var ajaxDELETE = function (route, data) {
		var options = { 'dataType': '' };
		return ajax(route, data, 'DELETE', options);
	};

	function cleanUrl(url) {
		var hostname = window.location.hostname;

		// make url relative
		if (url.indexOf(hostname) >= 0) {
			url = url.substr(url.indexOf(hostname) + hostname.length);
		}

		// remove query string
		if (url.indexOf('?') >= 0) {
			url = url.substring(0, url.indexOf('?'));
		}

		// remove guids
		url = url.replace(/\/([a-z0-9]{8}(?:-[a-z0-9]{4}){3}-[a-z0-9]{12})/ig, '');

		// remove ints (and cobrand ids)
		url = url.replace(/\/\d+[^/]*/g, '');

		// remove partner /ema
		url = url.replace(/\/[^/]*/, '');

		return url;
	}

	var ajax = function (route, data, method, options) {
		var dfd = $.Deferred(),
			defaultOptions = {
				'cache': false,
				'contentType': 'application/json; charset=utf-8',
				'dataType': 'json',
				'data': data ? JSON.stringify(data) : undefined,
				'headers': { 'X-Hash-State': decodeURIComponent(window.location.hash.substring(1)) },
				'method': method || 'GET',
				'traditional': true
			},
			ajaxOptions = $.extend(true, defaultOptions, options || {});

		var jqXHR = $.ajax(emaConfig.ApiRoot + '/' + route, ajaxOptions)
			.done(function (data, textStatus, jqXHR) {
				dfd.resolve(data);
			}).fail(function (jqXHR, textStatus) {
				dfd.reject();

				// don't count abortions as failures
				if (textStatus === 'abort' && jqXHR.status === 0) {
					return;
				}

				switch (jqXHR.status) {
					case 400:
						$document.trigger('badRequest', arguments);
						break;
					case 401:
					case 302:
						$document.trigger('notAuthorized', arguments);
						break;
					case 404:
						$document.trigger('notFound', [this.url]);
						break;
					case 405:
						$document.trigger('methodNotAllowed', [this.method, this.url]);
						break;
					case 503:
						$document.trigger('serviceUnavailable', arguments);
						break;
					default:
						$document.trigger('error', arguments);
						break;
				}
			});

		var promiseProxy = {
			abort: function () {
				jqXHR.abort();
			}
		};

		return dfd.promise(promiseProxy);
	};

	// Checks if a promise cache is defined and not marked rejected.
	function isPromiseCached(dataPromise) {
		// don't cache rejected promises
		return dataPromise !== undefined && dataPromise.state() !== 'rejected';
	}

	//---------------------------------------------------------
	// Service Endpoints
	//---------------------------------------------------------
	//------- Review Section List -------
	services.GetFactSectionList = function () {
		if (!isPromiseCached(reviewSectionsPromise)) {
			reviewSectionsPromise = ajaxGET('SectionList');
		}
		return reviewSectionsPromise;
	};

	//------- Goals -------
	services.GetGoals = function () {
		return ajaxGET('Goals');
	};

	services.UpdateGoals = function (newList) {
		return ajaxPUT('Goals', newList);
	};

	services.UpdateRetirement = function (retirement) {
		return ajaxPUT('UpdateRetirement', retirement);
	};

	//------- Asset Allocation -------
	services.GetAssetAllocation = function () {
		return ajaxGET('AssetAllocation');
	};

	services.DeleteRecommendedAllocation = function () {
		return ajaxDELETE('RecommendedAllocation');
	};

	services.DeleteRecommendedAllocationWithAttestation = function (attestationData) {
		return ajaxDELETE('RecommendedAllocationWithAttestation/?attestationJson=' + JSON.stringify(attestationData));
	};

	services.DeleteScoredAllocation = function () {
		return ajaxDELETE('ScoredAllocation');
	};

	services.GetTickerInfo = function (ticker) {
		return ajaxGET('Ticker/?ticker=' + ticker);
	};

	//------- Fact Metadata -------
	services.GetFactMetadata = function (typeName) {
		return ajaxGET('Metadata?typeName=' + typeName);
	};

	services.GetMetaDataForFact = function (id, typeName) {
		return ajaxGET('Metadata/' + id + '?typeName=' + typeName);
	};

	//------- Family & Friends -------
	services.GetFamilyAndFriends = function () {
		return ajaxGET('FamilyAndFriends');
	};

	services.GetClient = function (id) {
		return ajaxGET('Client/' + id);
	};

	services.UpdateClient = function (person) {
		return ajaxPUT('Client', person);
	};

	services.GetClientSpouse = function (id) {
		return ajaxGET('ClientSpouse/' + id);
	};

	services.UpdateClientSpouse = function (person) {
		return ajaxPUT('ClientSpouse', person);
	};

	services.GetPerson = function (id) {
		return ajaxGET('Person/' + id);
	};

	services.AddPerson = function (person) {
		return ajaxPOST('Person', person);
	};

	services.UpdatePerson = function (person) {
		return ajaxPUT('Person', person);
	};

	services.DeletePerson = function (id) {
		return ajaxDELETE('Person/' + id);
	};

	services.DeleteSpouse = function (id) {
		return ajaxDELETE('Spouse/' + id);
	};

	services.ReplacePersonWithSpouse = function (id) {
		return ajaxPUT('ReplacePersonWithSpouse/' + id);
	};

	services.GetSpouse = function (id) {
		return ajaxGET('Spouse/' + id);
	};

	services.UpdateSpouse = function (person) {
		return ajaxPUT('Spouse', person);
	};

	services.RemoveSpouse = function (id) {
		return ajaxDELETE('Spouse/' + id);
	};

	//------- Financial Priorities -------
	services.GetFinancialPriorities = function () {
		return ajaxGET('FinancialPriorities');
	};
	services.AddCustom = function (description, isSpouse) {
		return ajaxPOST('AddCustom/?description=' + encodeURIComponent(description) + '&isSpouse=' + isSpouse);
	};
	services.EditCustom = function (id, description) {
		return ajaxPUT('EditCustom/?id=' + id + '&description=' + encodeURIComponent(description));
	};
	services.DeleteCustom = function (id, isSpouse) {
		return ajaxDELETE('DeleteCustom/?id=' + id + '&isSpouse=' + isSpouse);
	};
	services.UpdateClientPriorities = function (newList) {
		return ajaxPUT('ClientPriorities', newList);
	};
	services.UpdateSpousePriorities = function (newList) {
		return ajaxPUT('SpousePriorities', newList);
	};

	//------- General Facts -------
	services.AddFact = function (type) {
		return ajaxPOST('Fact/?type=' + type);
	};
	services.GetFact = function (id) {
		return ajaxGET('Fact/' + id);
	};
	services.UpdateFact = function (fact) {
		return ajaxPUT('Fact/' + fact.ID, fact);
	};
	services.DeleteFact = function (id) {
		return ajaxDELETE('Fact/' + id);
	};

	//------- Insurance -------
	services.GetInsurance = function () {
		return ajaxGET('Insurance');
	};
	services.GetLifeInsurance = function (id) {
		return ajaxGET('LifeInsurance/' + id);
	};

	//------- Net Worth -------
	services.GetNetWorth = function () {
		return ajaxGET('NetWorth');
	};

	//------- Income -------
	services.GetIncome = function () {
		return ajaxGET('Income');
	};
	services.GetSocialSecurity = function (isSpouse) {
		return ajaxGET('SocialSecurity/?isSpouse=' + isSpouse);
	};
	services.UpdateSocialSecurity = function (ssItem) {
		return ajaxPUT('SocialSecurity', ssItem);
	};
	services.GetSocialSecurityEstimatesAdvanced = function (params) {
		return ajaxGET('SocialSecurityEstimatesAdvanced/?' + params);
	};
	services.GetSocialSecurityEstimatesBasic = function (params, prefix) {
		prefix = prefix || '';
		return ajaxGET(prefix + 'SocialSecurityEstimatesBasic/?' + params);
	};
	services.GetSocialSecurityOptimizationData = function (prefix) {
		prefix = prefix || '';
		return ajaxGET(prefix + 'SocialSecurityOptimizationData');
	};

	//------- Expenses -------
	services.GetExpenses = function () {
		return ajaxGET('Expenses');
	};
	services.GetLivingExpense = function (lifeStage) {
		return ajaxGET('LivingExpense/?lifeStage=' + lifeStage);
	};
	services.UpdateLivingExpense = function (expense) {
		return ajaxPUT('LivingExpense', expense);
	};

	//------- Taxes -------
	services.GetLocalTax = function () {
		return ajaxGET('LocalTax');
	};
	services.UpdateLocalTax = function (localTax) {
		return ajaxPUT('LocalTax', localTax);
	};
	services.GetStateTax = function () {
		return ajaxGET('StateTax');
	};
	services.UpdateStateTax = function (stateTax) {
		return ajaxPUT('StateTax', stateTax);
	};
	services.GetFederalTax = function () {
		return ajaxGET('FederalTax');
	};
	services.UpdateFederalTax = function (federalTax) {
		return ajaxPUT('FederalTax', federalTax);
	};

	services.AddGoal = function (subtype) {
		return ajaxPOST('Goal/?subtype=' + subtype);
	};

	//------- Savings -------
	services.GetSavings = function () {
		return ajaxGET('Savings');
	};
	services.Add529Contribution = function (id, contributionType) {
		return ajaxPOST('529Contribution/?id=' + id + '&contributionType=' + contributionType);
	};
	services.Get529Contribution = function (id, contributionID, contributionType) {
		return ajaxGET('529Contribution/?id=' + id + '&contributionID=' + contributionID + '&contributionType=' + contributionType);
	};
	services.Update529Contribution = function (contribution) {
		return ajaxPUT('529Contribution', contribution);
	};
	services.Delete529Contribution = function (id, contributionID, contributionType) {
		return ajaxDELETE('529Contribution/?id=' + id + '&contributionID=' + contributionID + '&contributionType=' + contributionType);
	};
	services.AddRetirementContribution = function (id, contributionType) {
		return ajaxPOST('RetirementContribution/?id=' + id + '&contributionType=' + contributionType);
	};
	services.GetRetirementContribution = function (id, contributionID, contributionType) {
		return ajaxGET('RetirementContribution/?id=' + id + '&contributionID=' + contributionID + '&contributionType=' + contributionType);
	};
	services.UpdateRetirementContribution = function (contribution) {
		return ajaxPUT('RetirementContribution', contribution);
	};
	services.DeleteRetirementContribution = function (id, contributionID, contributionType) {
		return ajaxDELETE('RetirementContribution/?id=' + id + '&contributionID=' + contributionID + '&contributionType=' + contributionType);
	};
	services.AddHSAContribution = function (id, contributionType) {
		return ajaxPOST('HSAContribution/?id=' + id + '&contributionType=' + contributionType);
	};
	services.GetHSAContribution = function (id, contributionID, contributionType) {
		return ajaxGET('HSAContribution/?id=' + id + '&contributionID=' + contributionID + '&contributionType=' + contributionType);
	};
	services.UpdateHSAContribution = function (contribution) {
		return ajaxPUT('HSAContribution', contribution);
	};
	services.DeleteHSAContribution = function (id, contributionID, contributionType) {
		return ajaxDELETE('HSAContribution/?id=' + id + '&contributionID=' + contributionID + '&contributionType=' + contributionType);
	};
	services.AddRothIraContribution = function (id, contributionType) {
		return ajaxPOST('RothIraContribution/?id=' + id + '&contributionType=' + contributionType);
	};
	services.GetRothIraContribution = function (id, contributionID, contributionType) {
		return ajaxGET('RothIraContribution/?id=' + id + '&contributionID=' + contributionID + '&contributionType=' + contributionType);
	};
	services.UpdateRothIraContribution = function (contribution) {
		return ajaxPUT('RothIraContribution', contribution);
	};
	services.DeleteRothIraContribution = function (id, contributionID, contributionType) {
		return ajaxDELETE('RothIraContribution/?id=' + id + '&contributionID=' + contributionID + '&contributionType=' + contributionType);
	};
	services.AddTraditionalIraContribution = function (id, contributionType) {
		return ajaxPOST('TraditionalIraContribution/?id=' + id + '&contributionType=' + contributionType);
	};
	services.GetTraditionalIraContribution = function (id, contributionID, contributionType) {
		return ajaxGET('TraditionalIraContribution/?id=' + id + '&contributionID=' + contributionID + '&contributionType=' + contributionType);
	};
	services.UpdateTraditionalIraContribution = function (contribution) {
		return ajaxPUT('TraditionalIraContribution', contribution);
	};
	services.DeleteTraditionalIraContribution = function (id, contributionID, contributionType) {
		return ajaxDELETE('TraditionalIraContribution/?id=' + id + '&contributionID=' + contributionID + '&contributionType=' + contributionType);
	};
	services.AddFixedContribution = function (id, contributionType) {
		return ajaxPOST('FixedContribution/?id=' + id + '&contributionType=' + contributionType);
	};
	services.GetFixedContribution = function (id, contributionID, contributionType) {
		return ajaxGET('FixedContribution/?id=' + id + '&contributionID=' + contributionID + '&contributionType=' + contributionType);
	};
	services.UpdateFixedContribution = function (contribution) {
		return ajaxPUT('FixedContribution', contribution);
	};
	services.DeleteFixedContribution = function (id, contributionID, contributionType) {
		return ajaxDELETE('FixedContribution/?id=' + id + '&contributionID=' + contributionID + '&contributionType=' + contributionType);
	};
	//------- Professional Contacts -------
	services.GetProfessionalContacts = function () {
		return ajaxGET('ProfessionalContacts');
	};
	services.GetContact = function (id) {
		return ajaxGET('ProfessionalContact/' + id);
	};
	services.AddContact = function (contact) {
		return ajaxPOST('ProfessionalContact', contact);
	};
	services.UpdateContact = function (contact) {
		return ajaxPUT('ProfessionalContact', contact);
	};
	services.DeleteContact = function (id) {
		return ajaxDELETE('ProfessionalContact/' + id);
	};

	//------- Observations & Next Steps -------
	services.GetObservations = function () {
		return ajaxGET('Observations');
	};

	services.AddObservation = function (type) {
		return ajaxPOST('Observation', type);
	}

	services.UpdateObservation = function (observation) {
		return ajaxPUT('Observation', observation);
	}

	services.UpdateObservationOrder = function (observation) {
		return ajaxPUT('ObservationOrder', observation);
	}

	services.DeleteObservation = function (id) {
		return ajaxDELETE('Observation/' + id);
	}

	services.GetObservation = function (id) {
		return ajaxGET('Observation/' + id);
	}

	services.AddNextStep = function (type) {
		return ajaxPOST('NextSteps', type);
	}

	services.UpdateNextStep = function (nextStep) {
		return ajaxPUT('NextSteps', nextStep);
	}

	services.DeleteNextStep = function (id) {
		return ajaxDELETE('NextSteps/' + id);
	}

	services.ToggleNextStep = function (id) {
		return ajaxPUT('NextSteps/' + id);
	}

	services.GetNextStep = function (id) {
		return ajaxGET('NextSteps/' + id);
	}

	//------- Technique List -------
	var findTechniqueByID = function (list, id) {
		var result = null;
		$.each(list, function (index, technique) {
			if (technique.ID === id) {
				result = technique;
				return false; // break;
			}
		});
		return result;
	};
	services.GetTechniqueListModel = function () {
		return ajaxGET('TechniqueList');
	};
	services.AddTechnique = function (type) {
		return ajaxPOST('TechniqueList', type);
	};
	services.DeleteTechnique = function (id) {
		return ajaxDELETE('TechniqueList/?id=' + id);
	};
	services.SetTechniquesIncluded = function (ids, included) {
		var route = included ? 'TechniqueList/Include' : 'TechniqueList/Exclude';

		return ajaxPUT(route, ids);
	};
	services.IncludeAdvancedTechnique = function (id, included) {
		return ajaxPUT('AdvancedTechniqueList/Include/?id=' + id, included);
	};
	services.RenameTechnique = function (id, name) {
		return ajaxPUT('TechniqueList/Rename/?id=' + id, name);
	};
	services.ReorderTechniques = function (ids) {
		return ajaxPUT('TechniqueList/Reorder', ids);
	};

	services.GetAdvancedTechniques = function () {
		return ajaxGET('AdvancedTechniqueList');
	};

	//------- Cash Flow -------
	services.GetCashFlow = function () {
		return ajaxGET('CashFlow');
	};
	services.GetCashFlowReport = function () {
		return ajaxGET('CashFlow/Report');
	};
	services.GetMonteCarlo = function () {
		return ajaxGET("CashFlow/MonteCarlo");
	};

	//------- Techniques -------
	services.GetTechnique = function (id) {
		return ajaxGET('Technique?id=' + id);
	};

	services.GetFutureFactValue = function (id, yearIndex, yearValue) {
		return ajaxGET('Technique/FutureFactValue?id=' + id + '&yearIndex=' + yearIndex + '&yearValue=' + (yearValue || 0));
	};
	services.UpdateTechnique = function (id, techniqueUpdate) {
		return services.GetTechnique(id)
			.then(function (technique) {
				// we need the complete technique object so validation passes
				var updatedTechnique = $.extend({}, technique, techniqueUpdate);

				// update the technique and the technique list promise, then return the data
				return ajaxPUT('Technique', updatedTechnique)
					.then(function () {
						return services.GetTechnique(id);
					});
			});
	};

	//------- Estate ---------------
	services.GetEstateNetWorth = function () {
		return ajaxGET('Estate/NetWorth');
	};
	services.GetEstateFirstDeath = function () {
		return ajaxGET('Estate/FirstDeath');
	};
	services.GetEstateSurvivorIncome = function () {
		return ajaxGET('Estate/SurvivorIncome');
	};
	services.GetEstateLastDeath = function () {
		return ajaxGET('Estate/LastDeath');
	};
	services.GetEstateOverview = function () {
		return ajaxGET('Estate/Overview');
	};
	services.GetEstateDistributionComparison = function () {
		return ajaxGET('Estate/DistributionComparison');
	};
	services.GetEstateSurvivorIncomeComparison = function () {
		return ajaxGET('Estate/SurvivorIncomeComparison');
	};


	//------- Goals -------
	services.GetAssumptions = function (scenarioID, factID) {
		return ajaxGET('Assumptions/' + scenarioID + '/' + factID);
	};
	services.PutAssumptions = function (goal) {
		return ajaxPUT('Assumptions', goal);
	};
	services.GetGrowthRateForm = function (scenarioID, factID) {
		return ajaxGET('GrowthRateForm/' + scenarioID + '/' + factID);
	};
	services.PutGrowthRateForm = function (form) {
		return ajaxPUT('GrowthRateForm', form);
	};
	services.GetContributionForm = function (scenarioID, goalID, factID) {
		return ajaxGET('ContributionForm?scenarioID=' + scenarioID + '&goalID=' + goalID + '&factID=' + factID);
	};
	services.PutContributionForm = function (form) {
		return ajaxPUT('ContributionForm', form);
	};
	services.GetLifestyleViewModel = function (scenarioID) {
		return ajaxGET('LifestyleViewModel/' + scenarioID);
	};
	services.GetLifestyleExpenses = function (scenarioID) {
		return ajaxGET('LifestyleExpenses/' + scenarioID);
	};
	services.GetLifestyleLivingExpensesForm = function (scenarioID) {
		return ajaxGET('LifestyleLivingExpensesForm/' + scenarioID);
	};
	services.PutLifestyleLivingExpensesForm = function (livingExpenses) {
		return ajaxPUT('LifestyleLivingExpensesForm', livingExpenses);
	};
	services.GetLifestyleTaxesForm = function (scenarioID) {
		return ajaxGET('LifestyleTaxesForm/' + scenarioID);
	};
	services.PutLifestyleTaxesForm = function (taxes) {
		return ajaxPUT('LifestyleTaxesForm', taxes);
	};
	services.GetLeaveToHeirsForm = function (scenarioID) {
		return ajaxGET('LeaveToHeirsForm/' + scenarioID);
	};
	services.PutLeaveToHeirsForm = function (form) {
		return ajaxPUT('LeaveToHeirsForm', form);
	};

	services.GetLifestyleIncome = function (scenarioID) {
		return ajaxGET('Income/' + scenarioID);
	};
	services.GetLifestyleIncomeSourceForm = function (scenarioID, factID) {
		return ajaxGET('Income/' + scenarioID + '/' + factID);
	};
	services.PutLifestyleIncomeSourceForm = function (form) {
		return ajaxPUT('Income', form);
	};
	services.GetLifestyleSocialSecurityForm = function (scenarioID) {
		return ajaxGET('SocialSecurity/' + scenarioID);
	};
	services.PutLifestyleSocialSecurityForm = function (form) {
		return ajaxPUT('SocialSecurity', form);
	};
	services.DeleteLifestyleIncomeSourceForm = function (scenarioID, factID) {
		return ajaxDELETE('Income/' + scenarioID + '/' + factID);
	};
	services.PutLifestyleIncomeSource = function (scenarioID) {
		return ajaxPUT('Income/' + scenarioID);
	};
	services.GetLifestyleSavings = function (scenarioID) {
		return ajaxGET('LifestyleSavings/' + scenarioID);
	}
	services.GetLifestyleSavingsResource = function (scenarioID, factID) {
		return ajaxGET('LifestyleSavings/' + scenarioID + '/' + factID);
	}

	//------- Life Insurance Needs -------
	services.GetLifeInsuranceNeeds = function () {
		return ajaxGET('LifeInsuranceNeeds');
	};
	services.GetCashNeed = function (id) {
		return ajaxGET('CashNeeds/' + id);
	};
	services.UpdateCashNeed = function (cashNeed) {
		return ajaxPUT('CashNeeds', cashNeed);
	};
	services.GetMinimumLivingExpenses = function () {
		return ajaxGET('MinimumLivingExpenses');
	};
	services.UpdateMinimumLivingExpenses = function (livingExpenses) {
		return ajaxPUT('MinimumLivingExpenses', livingExpenses);
	};
	services.GetNewSurvivingSpouseSalary = function () {
		return ajaxGET('NewSurvivingSpouseSalary');
	};
	services.UpdateNewSurvivingSpouseSalary = function (spouseSalary) {
		return ajaxPUT('NewSurvivingSpouseSalary', spouseSalary);
	};
	services.GetAnnualCostOfLivingAdjustment = function () {
		return ajaxGET('AnnualCostOfLivingAdjustment');
	};
	services.UpdateAnnualCostOfLivingAdjustment = function (costAdjustment) {
		return ajaxPUT('AnnualCostOfLivingAdjustment', costAdjustment);
	};
	services.GetNumberOfYearsToProvide = function () {
		return ajaxGET('NumberOfYearsToProvide');
	};
	services.UpdateNumberOfYearsToProvide = function (lifeExpectancy) {
		return ajaxPUT('NumberOfYearsToProvide', lifeExpectancy);
	};
	services.GetSocialSecurityBenefitPercent = function () {
		return ajaxGET('SocialSecurityBenefitPercent');
	};
	services.UpdateSocialSecurityBenefitPercent = function (benefitPercent) {
		return ajaxPUT('SocialSecurityBenefitPercent', benefitPercent);
	};
	services.GetSocialSecurityGrowthRate = function () {
		return ajaxGET('SocialSecurityGrowthRate');
	};
	services.UpdateSocialSecurityGrowthRate = function (growthRate) {
		return ajaxPUT('SocialSecurityGrowthRate', growthRate);
	};
	services.GetAdditionalLifeInsuranceProceedsGrowthRate = function () {
		return ajaxGET('AdditionalLifeInsuranceProceedsGrowthRate');
	};
	services.UpdateAdditionalLifeInsuranceProceedsGrowthRate = function (reinvestmentRate) {
		return ajaxPUT('AdditionalLifeInsuranceProceedsGrowthRate', reinvestmentRate);
	};

	//------- Monte Carlo Range Picker -------
	services.GetMonteCarloRanges = function () {
		return ajaxGET('MonteCarloRange');
	};

	services.GetDefaultMonteCarloRanges = function () {
		return ajaxGET('MonteCarloRange/GetDefault');
	};

	services.PutMonteCarloRanges = function (ranges) {
		return ajaxPUT('MonteCarloRange', ranges);
	};

	//------- Exports -------
	return services;
})(window.jQuery, emaConfig);

;/// <reference path="~/bootstrap/ema.js" />
/// <reference path="~/bootstrap/ema.templates.js" />
/// <reference path="~/bootstrap/ema.charts.js" />
/// <reference path="../webapi.js" />
/// <reference path="../util.js" />

function SocialSecurityOptimizer(servicePrefix) {
	this.show = function (onClose) {
		showOptimizer(onClose);
	}

	function showOptimizer(onClose) {
		emaWebApi.GetSocialSecurityOptimizationData(servicePrefix).done(function (model) {
			var modal = $(Handlebars.templates['SocialSecurity-Optimizer'](model));

			modal.on('hidden.bs.modal', function () {
				if (onClose !== null && $.isFunction(onClose)) {
					onClose();
				}
				modal.remove();
			});

			modal.modal();
		});
	}
}