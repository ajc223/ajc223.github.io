/* eslint-disable */
// https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent#Polyfill

(function () {
	if (typeof window.CustomEvent === 'function') return false;

	function CustomEvent(event, params) {
		params = params || { bubbles: false, cancelable: false, detail: undefined };
		const evt = document.createEvent('CustomEvent');
		evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
		return evt;
	}

	CustomEvent.prototype = window.Event.prototype;

	window.CustomEvent = CustomEvent;
})();

;/// <reference path="~/bootstrap/ema.js" />
/// <reference path="~/emx/Controls/webapi.js" />
/*! Presentation.js */

$(function () {
	$('.js-gotopresentation').on('click', function () {
		const $el = $(this);

		let properties = { "Action": $el.data('action') };
		let name = $el.data('presentation-name');
		if (name) {
			properties.Name = name;
		}
		eventLogger.logEvent($el.data('eventname'), $el.data('feature'), properties);

		const baseUrl = $el.data('base-url');
		const scenarioID = $el.data('scenario-id');
		const url = baseUrl + '/' + scenarioID;
		location.href = url;
	});
})
;/// <reference path="~/bootstrap/ema.js" />
/// <reference path="~/bootstrap/ema.templates.js" />
/// <reference path="~/bootstrap/ema.validation.js" />
/// <reference path="~/emx/Controls/webapi.js" />
/// <reference path="../../../../Scripts/utilities/formSerializer.js"/>

window.TechniqueForms = (function ($, Handlebars) {
	var $document = $(document),
		autoSaveTimeout = null,
		autoSaveDelay = 500;

		var techniquePreprocess = {};

		var techniqueFormBehaviors = {
			'DownsizeHome': function ($form, model) {
				// disable the interest rate and term when there is no loan value
				disableInterestRateAndTerm($form, '#NewMortgageValue');

				// add a link to estimate the future value of the sale price
				addEstimateSaleLink($form);
			},
			'EditStockOptions': function ($form, model) {
				var stockOptionInput = $form.find('#OptionPlanID'),
					growthRateToggle = $form.find('#ToggleGrowthRate'),
					growthRateInput = $form.find('#GrowthRate'),
					priceToggle = $form.find('#ToggleUpdatePrice'),
					priceInput = $form.find('#UpdatePrice'),
					priceControl = priceToggle.closest('.ctrl'),
					priceYearSelectorControl = priceControl.next();

				priceYearSelectorControl.find('.ctrl-label').hide();

				// update the default values when a stock option is picked
				function updateStockOptionDefaults(resetInputs) {
					var $hidden = $(this),
						$dropdown = $hidden.siblings('[role="menu"]'),
						$selectedMenuItem = $dropdown.find('[data-value="' + $hidden.val() + '"]'),
						growthRate = $selectedMenuItem.data('growthrate'),
						stockPrice = $selectedMenuItem.data('stockprice');

					if ($hidden.val() === '') {
						return;
					}

					function updateDefaultValue($input, $toggle, defaultValue) {
						$input.data('default-value', defaultValue);
						var isToggledOn = $toggle.closest('.ctrl').hasClass('ctrl-is-disabled') === false;

						// Always set the input to the default value when it's associated checkbox is unchecked (unchecked means use the default base fact value!)
						if (!isToggledOn) {
							$input.val(defaultValue).trigger('change');
						}
						// if we are updating the default value because they are being based off of a new option plan
						// then uncheck all checkboxes and force the inputs to reset to the new default values.
						if (resetInputs && isToggledOn) {
							$toggle.trigger('click');
						}
					}

					updateDefaultValue(growthRateInput, growthRateToggle, growthRate);
					updateDefaultValue(priceInput, priceToggle, stockPrice);
				}

				// handle the initial defaults
				updateStockOptionDefaults.apply(stockOptionInput[0]);

				// handle all further changes to the stock option ID
				stockOptionInput.on('change', function () { updateStockOptionDefaults.apply(this, [true]) });

				// handle the initial loading of the checkbox
				if (priceControl.hasClass('ctrl-is-disabled')) {
					priceYearSelectorControl.addClass('ctrl-is-disabled');
				}

				// handle all further changes to the checkbox
				priceToggle.on('click', function (e) {
					priceYearSelectorControl.toggleClass('ctrl-is-disabled', !priceControl.hasClass('ctrl-is-disabled'));
				});
			},
			'IncreaseSavings': function ($form, model) {
				$form.on('technique.modified', function (e) {
					emaWebApi.GetTechnique(model.ID).done(function (updatedModel) {
						var totalSavingsThisYear = $form.find('#totalSavingsThisYear');
						var updatedSavings = Handlebars.helpers.dollar(updatedModel.TotalSavingsThisYear, null)
						totalSavingsThisYear.text(updatedSavings);
					});
				});
			},
			'PurchaseRealEstate': function ($form, model) {
				// disable the interest rate and term when there is no loan value
				disableInterestRateAndTerm($form, '#LoanValue');
			},
			'PurchasePersonalProperty': function ($form, model) {
				// disable the interest rate and term when there is no loan value
				disableInterestRateAndTerm($form, '#LoanValue');
			},
			'PurchaseBusiness': function ($form, model) {
				// disable the interest rate and term when there is no loan value
				disableInterestRateAndTerm($form, '#LoanValue');
			},
			'ReverseMortgage': function ($form, model) {
				$form.on('technique.modified', function (e) {
					emaWebApi.GetTechnique(model.ID).done(function (updatedModel) {
						var actualPayout = $form.find('#actualPayout');
						actualPayout.text(updatedModel.ActualPayout);
					});
				});
			},
			'SaleOfBusiness': function ($form, model) {
				// add a link to estimate the future value of the sale price
				addEstimateSaleLink($form);

				// disabled the interest rate when not using an installment sale
				disableInterestRateForInstallmentSale($form);
			},
			'SaleOfRealEstate': function ($form, model) {
				// add a link to estimate the future value of the sale price
				addEstimateSaleLink($form);

				// disabled the interest rate when not using an installment sale
				disableInterestRateForInstallmentSale($form);
			},
			'SaleOfPersonalProperty': function ($form, model) {
				// add a link to estimate the future value of the sale price
				addEstimateSaleLink($form);
			}
		};

	function enableControl($ctrlContainer) {
		$ctrlContainer.removeClass('ctrl-is-disabled');
		$ctrlContainer.find('.btn').removeClass('disabled');
		$ctrlContainer.find(':text').prop('readonly', false);
	}

	function disableControl($ctrlContainer) {
		$ctrlContainer.addClass('ctrl-is-disabled').addClass('ctrl-is-conditionally-disabled').removeClass('has-error');
		$ctrlContainer.find('.is-invalid').removeClass('is-invalid').addClass('is-valid');
		$ctrlContainer.find('[data-valmsg-for]').text('');
		$ctrlContainer.find('.slider-fill').css('width', 0);
		$ctrlContainer.find('.slider-knob').css('left', 0);
		$ctrlContainer.find('.btn').addClass('disabled');
		if ($ctrlContainer.find(':text').length) {
			$ctrlContainer.find(':text').prop('readonly', true)[0].value = '';
		}
	}

	function disableInterestRateAndTerm($form, selector) {
		var $loanValue = $form.find(selector),
			$interestContainer = $loanValue.closest('.ctrl').next(),
			$termContainer = $interestContainer.next();

		$loanValue.on('change keyup', function (e) {
			if ($(this).val() > 0) {
				enableControl($interestContainer);
				enableControl($termContainer);
			} else {
				disableControl($interestContainer);
				disableControl($termContainer);
			}
		}).trigger('change');
	};

	function disableInterestRateForInstallmentSale($form) {
		var $installmentYears = $form.find('#InstallmentTermYears'),
			$interestContainer = $installmentYears.closest('.ctrl').next();

		$installmentYears.on('change keyup', function (e) {
			if ($(this).val() > 0) {
				enableControl($interestContainer);
			} else {
				disableControl($interestContainer);
			}
		}).trigger('change');
	};

	function addEstimateSaleLink($form) {
		$form.find('.ctrl-label[for="SalePrice"]').append(' ' + Handlebars.templates['Techniques-Forms-EstimateSaleLink']());
		$form.find('#EstimateSaleLink').on('click', function () {
			var id = $form.find('#AssetToSellID').val(),
				$startYear = $form.find('#StartYear'),
				$startYearValue = $form.find('#StartYearValue'),
				$percentToSell = $form.find('#PercentOfBusinessToSell');

			// ignore invalid inputs
			if ($startYear.is('.is-invalid') || $startYearValue.is('.is-invalid') || ($percentToSell.length === 1 && $percentToSell.is('.is-invalid'))) {
				return;
			}

			// ignore bad data
			if (id === '' || $startYear.val() === '') {
				return;
			}

			emaWebApi.GetFutureFactValue(id, $startYear.val(), $startYearValue.val())
				.done(function (value) {
					var adjustedValue = value * ($percentToSell.val() || 1);
					$form.find('#SalePrice').val(adjustedValue).trigger('change');
				});
		});
	};

	function addKeyValuePairWithErrorHandling(obj, type, callback) {
		if (typeof obj[type] !== 'undefined') {
			throw new Error('Cannot add more than one callback for type ' + type);
		}

		if (typeof callback !== 'function') {
			throw new Error('Callback for type ' + type + ' must be a function.');
		}

		obj[type] = callback;
	}
	
	function updateTechnique($form) {
		if ($form.valid() === false) {
			return;
		}
		
		clearTimeout(autoSaveTimeout);
		autoSaveTimeout = setTimeout(function () {
			const techniqueUpdate = window.ema.utilities.serializeFormNullifyReadonly($form);
			
			emaWebApi.UpdateTechnique(techniqueUpdate.ID, techniqueUpdate)
				.done(function () {
					$document.trigger('technique.update');
					// We need the ability to differentiate modifications from other operations (particularly delete!)
					$form.trigger('technique.modified');
					// reset the form
					$form.validate().resetForm();
				});
		}, autoSaveDelay);
	};

	$document.on('click', 'form.technique .back', function (e) {
		if (hashState) hashState.SetKey('technique', null);

		$document.trigger('hashchange-technique');
	});

	$document.on('change', 'form.technique :input:not(.is-ignored)', function (e) {
		updateTechnique($('form.technique'));
	});

	$document.on('keyup', 'form.technique :text:not(.is-ignored)', function (e) {
		// ignore this event for touch devices, the input is too slow and you can see the chart with the keyboard
		if (Modernizr.touch) {
			return;
		}
		// save without leaving the textbox
		updateTechnique($('form.technique'));
	});

	$document.on('blur', 'form.technique :text:not(.is-ignored)', function (e) {
		if (Modernizr.touch) {
			updateTechnique($('form.technique'));
		}
	});

	return {
		addTechniquePreprocess: function (type, callback) {
			addKeyValuePairWithErrorHandling(techniquePreprocess, type, callback);
		},

		addTechniqueFormBehavior: function (type, callback) {
			addKeyValuePairWithErrorHandling(techniqueFormBehaviors, type, callback);
		},

		render: function (id, viewManager, $elementToShow) {
			function dispatchTechniqueEditInPlaceLoadEvent(isLoading) {
				return document.dispatchEvent(new CustomEvent('technique.editInPlace.loading', { detail: { isLoading: isLoading } }));
			};

			dispatchTechniqueEditInPlaceLoadEvent(true);

			const getTechniquePromise = emaWebApi.GetTechnique(id);

			getTechniquePromise.always(function () {
				return dispatchTechniqueEditInPlaceLoadEvent(false);
			});
				
			$.when(getTechniquePromise)
				.then(function (technique) {
					// this must be a bad technique ID
					if (technique === null) {
						viewTechniqueList();
						return;
					}

					$.extend(technique, { CanEditGrowthRates: emaPageModel.CanEditGrowthRates });

					var techniqueType = technique.Type,
						templateName = 'Techniques-Forms-' + techniqueType,
						dataPromise = new $.Deferred();

					dataPromise.resolve(technique);

					viewManager.Abort().Start(dataPromise, templateName, techniquePreprocess[id])
						.done(function (model) {
							var $target = this,
								$form = $target.find('form.technique');

							$elementToShow.show();

							$form.find(':text[data-format]').filter(':not([data-format="text"])').each(function (index, el) {
								var $input = $(el);
								$input.number(true, $input.data('precision'));
							});

							// insert fake submit button to close the iPad keyboard when the Go button is pressed
							$form.append('<input type="submit" class="is-invisible" onclick="document.activeElement.blur(); return false;" />');

							// wire up validation
							$.validator.unobtrusive.parse($form);

							// wire up any custom form behaviors
							if (typeof techniqueFormBehaviors[techniqueType] === 'function') {
								techniqueFormBehaviors[techniqueType]($form, model);
							}
						}).fail(function () {
							// clear out the loading icon
							$('#TechniqueList [data-id=' + id + ']').removeClass('is-loading');
						});
				});
		}
	};

})(window.jQuery, Handlebars);
;/*! TechniqueForms.APT.DecisionCenter.js */
/*
	This file TechniqueForms.APT.DecisionCenter.js is an extension of the file
	ema\emx\ClientDecisionCenter\Techniques\Forms\TechniqueForms.js
	adapted to work with new Decision Center written in React.

	This 2 events notify the new DecisionCenter UI written in REACT to
	1) Close the in place edit technique dialog
	2) To redraw the report after a technique has been updated

	See bundle file advisor-site\ema\scripts.bundle.json bundle name "~/emx/ClientDecisionCenter/APT"
*/
(function ($) {

	var $document = $(document);

	$document.on('click', 'form.technique .back', function (e) {
		// Notify the new Distribution Center written in React to close the edit technique dialog
		document.dispatchEvent(new CustomEvent('technique.editInPlace.back'));
	});

	$document.on('technique.modified', function (event, techniqueId) {
		// Notify the new Distribution Center written in React to reload the current report
		document.dispatchEvent(new CustomEvent('technique.modified', { detail: { techniqueId: techniqueId } }));
	});

})(window.jQuery);


;/// <reference path="~/emx/ClientDecisionCenter/Techniques/Forms/TechniqueForms.js" />
/// <reference path="~/emx/Controls/SocialSecurity/SocialSecurityOptimizer.js" />

(function ($) {
	function socialSecurityIsExempt(type) {
		return type === 'Exempt';
	}

	function noSocialSecurityBenefits(type) {
		return (socialSecurityIsExempt(type) || type === 'None');
	}

	function bothHaveNoSocialSecurityBenefits(hasSpouse, clientType, spouseType) {
		return noSocialSecurityBenefits(clientType) && (!hasSpouse || noSocialSecurityBenefits(spouseType));
	}

	function eitherHasNoSocialSecurityBenefits(hasSpouse, clientType, spouseType) {
		return noSocialSecurityBenefits(clientType) || (hasSpouse && noSocialSecurityBenefits(spouseType));
	}

	function eitherIsExempt(hasSpouse, clientType, spouseType) {
		return socialSecurityIsExempt(clientType) || (hasSpouse && socialSecurityIsExempt(spouseType));
	}

	function shouldExcludeAllSpousalBenefits(excludeAllSpousalBenefitsValue) {
		return excludeAllSpousalBenefitsValue === 'Yes';
	}

	function shouldHideRestrictedSpousalBenefits(hasSpouse, clientType, spouseType, excludeAllSpousalBenefitsValue) {
		return eitherHasNoSocialSecurityBenefits(hasSpouse, clientType, spouseType) || shouldExcludeAllSpousalBenefits(excludeAllSpousalBenefitsValue);
	}

	function getSocialSecurityHideOptionsShared(hasSpouse, clientType, spouseType, excludeAllSpousalBenefitsValue, prefix) {
		var options = {};
		prefix = prefix || '';

		options[prefix + 'show-optimizer-section'] = bothHaveNoSocialSecurityBenefits(hasSpouse, clientType, spouseType);
		options[prefix + 'benefit-percent'] = bothHaveNoSocialSecurityBenefits(hasSpouse, clientType, spouseType);
		options[prefix + 'exclude-all-spousal-benefits'] = eitherIsExempt(hasSpouse, clientType, spouseType);
		options[prefix + 'restricted-spousal-benefits'] = shouldHideRestrictedSpousalBenefits(hasSpouse, clientType, spouseType, excludeAllSpousalBenefitsValue);
		return options;
	}

	function getSocialSecurityHideOptions(hasSpouse, clientType, spouseType, excludeAllSpousalBenefitsValue) {
		return getSocialSecurityHideOptionsShared(hasSpouse, clientType, spouseType, excludeAllSpousalBenefitsValue, 'hide-');
	}

	var techniquePreprocessCallback = function (model) {
		$.extend(model, getSocialSecurityHideOptions(model.HasSpouse, model.ClientBenefitType, model.SpouseBenefitType, model.ExcludeAllSpousalBenefits));
	}

	var techniqueFormBehaviorCallback = function (form, model) {
		var clientBenefitTypeInput = form.find('#ClientBenefitType');
		var spouseBenefitTypeInput = form.find('#SpouseBenefitType');
		var excludeAllSpousalBenefitsInput = form.find('#ExcludeAllSpousalBenefits');
		var clientRetirementBenefitsBegin = form.find('#ClientRetirementBenefitsBegin');
		var spouseRetirementBenefitsBegin = form.find('#SpouseRetirementBenefitsBegin');
		var clientAnnualText = form.find('#ss-client-section .annual-value');
		var spouseAnnualText = form.find('#ss-spouse-section .annual-value');
		var socialSecurityOptimizer = new SocialSecurityOptimizer('Technique/');

		function updateSharedSection() {
			var hideOptions = getSocialSecurityHideOptionsShared(model.HasSpouse, clientBenefitTypeInput.val(), spouseBenefitTypeInput.val(), excludeAllSpousalBenefitsInput.val());
			var element;

			for (var option in hideOptions) {
				element = $('.' + option);
				if (hideOptions[option]) {
					element.hide();
				} else {
					element.show();
				}
			}
		}

		function updateClientEstimated(deferred) {
			updateEstimated(clientBenefitTypeInput.val(), false, clientRetirementBenefitsBegin.val(), clientAnnualText, deferred);
		}

		function updateSpouseEstimated(deferred) {
			updateEstimated(spouseBenefitTypeInput.val(), true, spouseRetirementBenefitsBegin.val(), spouseAnnualText, deferred);
		}

		function updateEstimated(benefitType, isSpouse, benefitsBegin, textElement, deferred) {
			deferred = deferred || $.Deferred();

			if (benefitType !== 'Estimated') {
				deferred.resolve();
				return;
			}

			var item = {
				isSpouse: isSpouse,
				startAge: benefitsBegin
			};

			emaWebApi.GetSocialSecurityEstimatesBasic($.param(item), 'Technique/').then(
				function(estimates) {
					textElement.text(Handlebars.helpers.dollar(estimates.RetirementBenefit).string);
					deferred.resolve();
				},
				function() {
					deferred.resolve();
				}
			);
		}

		function updateClient() {
			var deferred = $.Deferred();
			updateClientEstimated(deferred);

			$.when(deferred).done(function() {
				updateSharedSection();
			});

			return deferred;
		}

		function updateSpouse() {
			var deferred = $.Deferred();
			updateSpouseEstimated(deferred);

			$.when(deferred).done(function() {
				updateSharedSection();
			});

			return deferred;
		}

		clientBenefitTypeInput.on('change', function() {
			updateClient();
		});

		spouseBenefitTypeInput.on('change', function() {
			updateSpouse();
		});

		excludeAllSpousalBenefitsInput.on('change', function () {
			updateSharedSection();
		});

		$(document).on('change', '#ClientRetirementBenefitsBegin', function() {
			updateClientEstimated();
		});

		$(document).on('change', '#SpouseRetirementBenefitsBegin', function() {
			updateSpouseEstimated();
		});

		$('.ss-show-optimizer').on('click', function() { socialSecurityOptimizer.show(); });

		var clientDeferred = updateClient();
		var spouseDeferred = updateSpouse();

		// Remove the initial hidden class from the template.
		$.when(clientDeferred, spouseDeferred).done(function() {
			form.find('.hidden.initialStateHidden').removeClass('hidden');
		});
	};

	var type = 'EditSocialSecurity';
	TechniqueForms.addTechniquePreprocess(type, techniquePreprocessCallback);
	TechniqueForms.addTechniqueFormBehavior(type, techniqueFormBehaviorCallback);
})(window.jQuery);
;/// <reference path="~/emx/ClientDecisionCenter/Techniques/Forms/TechniqueForms.js" />
/// <reference path="~/emx/Controls/Education.js" />

(function ($) {
	var type = 'EducationExpense';
	var callback = function($form) {
		var educationOptions = {
			valueInputSelector: '#ExpenseAmount',
			disableValueInputWhenInstitutionIsSet: false
		};

		setupStartAndEndForEducation($form, educationOptions);
	};

	TechniqueForms.addTechniqueFormBehavior(type, callback);
})(window.jQuery);
;/*! Techniques.APT.DecisionCenter.js */
/*
	This file Techniques.APT.DecisionCenter.js is the version of the file
	ema\emx\ClientDecisionCenter\Techniques\Techniques.js
	adapted to work with new Decision Center written in React.
	See bundle file advisor-site\ema\scripts.bundle.json bundle name "~/emx/ClientDecisionCenter/React"
*/

(function ($) {
	function viewTechniqueList() {
		$('#js-advancedtechniquelist').show();
		$('#js-techniquelistsection').show();
		$('#panel-left').hide();
	};

	function viewTechnique(id) {
		$('#js-advancedtechniquelist').hide();
		$('#js-techniquelistsection').hide();
		TechniqueForms.render(id, new viewManager('#panel-left'), $('#panel-left'));
	};

	document.addEventListener('technique.editInPlace.back', function (e) {
		viewTechniqueList();
	});

	document.addEventListener('technique.editInPlace', function (e) {
		viewTechnique(e.detail.techniqueId);
	});

})(window.jQuery);