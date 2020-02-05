/// <reference path="~/bootstrap/ema.js" />
/// <reference path="~/bootstrap/ema.templates.js" />
/// <reference path="~/bootstrap/ema.validation.js" />
/// <reference path="ajax.js" />
/// <reference path="ConfirmDelete.js" />
/// <reference path="TransientNotifications.js" />

$(function () {
	var endpoint = emaApplicationPath + 'Advisor/Services/';

	$(document).on('click', '.js-alert-dismiss', function () {
		var el = $(this),
			alertID = el.data('alert');

		ajax.Post(null, endpoint + 'DismissAlert/' + alertID)
			.done(function () {
				$(document).trigger('emaAlertDismissed', [alertID]);
			})
			.fail(function () {
				showFailure('There was a problem.', 'Your changes were not saved. Please try again.');
			});
	});
});
;/// <reference path="~/bootstrap/ema.js" />
/// <reference path="~/bootstrap/ema.templates.js" />
/// <reference path="ajax.js" />
/// <reference path="TransientNotifications.js" />

$(function () {
	var alertsPopoverContainer = $('<div class="popover-content-lg"/>'),
		alertsBadgeContainer = $('.js-alerts-badgecount'),
		$tooltip = $('.js-popover-alerts').find('[data-toggle="tooltip"]');

	$(document).on('emaAlertDismissed', function (e, alertID) {
		var alertsCount = alertsBadgeContainer.attr('data-badge-count') - 1;

		if (alertsCount <= 0) {
			alertsBadgeContainer.remove();
		} else {
			alertsBadgeContainer.text(alertsCount);
			alertsBadgeContainer.attr('data-badge-count', alertsCount);
		}

		alertsPopoverContainer.find('[data-alert=' + alertID + ']').remove();
	});
	
	$('.js-popover-alerts').popover({
		placement: 'bottom',
		title: Handlebars.templates['AlertsPopoverTitle']({ ApplicationPath: emaApplicationPath }),
		html: true,
		content: alertsPopoverContainer
	}).on('hidden.bs.popover', function () {
		// replace to tooltip
		$tooltip.tooltip();
	}).on('show.bs.popover', function () {
		// temporarily kill the alerts tooltip
		$tooltip.tooltip('destroy');

		alertsPopoverContainer.html('<ul class="list-unstyled"><li class="text-muted">Loading alerts...</li></ul>');
		
		var endpoint = emaApplicationPath + 'Advisor/Services/GetTopAlertsForUser';
		ajax.Get(endpoint)
			.done(function (alertsModel) {
				alertsPopoverContainer.html(Handlebars.templates['AlertsPopover'](alertsModel));

				alertsPopoverContainer.find('li').each(function () {
					var $li = $(this),
						$textWrapper = $li.find('.text-wrapper'),
						showExpandButton = parseInt($textWrapper.css('max-width')) <= $textWrapper.innerWidth(),
						$expandBtn = $('<button class="pull-left btn-expand btn btn-default btn-xs"><strong>...</strong></button>')

					if (showExpandButton) {
						$expandBtn.one('click', function (e) {
							$textWrapper.addClass('expand-wrapper');
							$expandBtn.remove();
							e.stopPropagation();
						});

						$textWrapper.after($expandBtn);
					}
				});
			})
			.fail(function () {
				$('.js-popover-alerts').popover('hide');
				showFailure('There was a problem.', 'Error loading alerts. Please try again.');
			});
	});
});

;/// <reference path="~/bootstrap/ema.js" />
/// <reference path="~/bootstrap/ema.templates.js" />

var PresentationMode = (function () {
	var presentationModeKey = 'presentationMode',
		presentModeClass = 'present',
		fireflyMaskedMessageClass = 'firefly-masked-message',
		fireflyMaskedClass = 'firefly-masked';

	var hideMaskedElements = function () {
		var $fireflyMasked = $('.' + fireflyMaskedClass);
		if ($fireflyMasked.length) {
			$fireflyMasked.hide();
			$('<h3 class="' + fireflyMaskedMessageClass + ' text-center">This data cannot be displayed in screen sharing mode.</h3>').insertAfter($fireflyMasked);
		}
	};

	var showMaskedElements = function () {
		var $fireflyMasked = $('.' + fireflyMaskedClass);
		if ($fireflyMasked.length) {
			$fireflyMasked.show();
		}
		var maskedInfos = $('.' + fireflyMaskedMessageClass);
		maskedInfos.remove();
	};

	return {
		isClientPage: function () {
			return location.pathname.toLowerCase().indexOf('/clients/') !== -1;
		},
		isHomePage: function () {
			return location.pathname.toLowerCase().indexOf('/home') !== -1;
		},
		showButton: function () {
			return typeof emaFeatureToggles !== 'undefined' && typeof emaFeatureToggles.ShowPresentationModeButton !== 'undefined' && emaFeatureToggles.ShowPresentationModeButton === true;
		},
		isFireflyLoaded: false,
		isScreenSharingEnabled: function() {
			return typeof emaFeatureToggles !== 'undefined' && typeof emaFeatureToggles.ScreenSharingEnabled !== 'undefined' && emaFeatureToggles.ScreenSharingEnabled === true;
		},
		isPresentationModeBeingForcedByScreenSharing: function () {
			return this.isFireflyLoaded && this.isScreenSharingEnabled()
				&& typeof emaFeatureToggles.ForcePresentationModeWhileCobrowsing !== 'undefined' && emaFeatureToggles.ForcePresentationModeWhileCobrowsing === true
				&& typeof fireflyAPI !== 'undefined' && typeof fireflyAPI.cobrowsingActive !== 'undefined' && fireflyAPI.cobrowsingActive() === true;
		},
		isPresenting: function () {
			return $('body').hasClass(presentModeClass);
		},
		disablePresentationMode: function (presentModeBtn, switchClientBtn) {
			localStorage.removeItem(presentationModeKey);
			$('body').removeClass(presentModeClass).trigger('emaPresentModeDisabled');
			presentModeBtn.text('Start Presenting');
			presentModeBtn.removeClass('btn-danger').addClass('btn-default').removeClass('btn-lg');

			showMaskedElements();

			switchClientBtn.addClass('hidden');
		},
		enablePresentationMode: function (presentModeBtn, switchClientBtn) {
			localStorage.setItem(presentationModeKey, true);
			$('body').addClass(presentModeClass).trigger('emaPresentModeEnabled');
			presentModeBtn.text('Stop Presenting');
			presentModeBtn.removeClass('btn-default').addClass('btn-danger');

			if (this.isPresentationModeBeingForcedByScreenSharing())
				hideMaskedElements();

			if (this.isHomePage() && this.isPresenting()) {
				$('.js-typeahead:visible').focus();
				presentModeBtn.addClass('btn-lg');
			}

			if (!this.isHomePage() && !(this.isPresentationModeBeingForcedByScreenSharing())) {
				switchClientBtn.removeClass('hidden');
			} else {
				switchClientBtn.addClass('hidden');
			}
		}
	};
})();

$(function () {
	var presentModeBtn = $('.js-presentmode-present');
	var switchClientBtn = $('.js-presentmode-switchclient');
	var screenSharingEndedInterval = null;

	function fireflyAvailable() {
		return (typeof fireflyAPI !== 'undefined');
	}

	function endScreenSharing() {
		if (fireflyAvailable()) {
			fireflyDisconnect();
			screenSharingEndedInterval = setInterval(function () {
				if (!fireflyAPI.cobrowsingActive()) {
					if (PresentationMode.isPresenting()) {
						PresentationMode.disablePresentationMode(presentModeBtn, switchClientBtn);
					}
					clearInterval(screenSharingEndedInterval);
					screenSharingEndedInterval = null;
				}
			}, 250);
		} else if (PresentationMode.isPresenting()) {
			PresentationMode.disablePresentationMode(presentModeBtn, switchClientBtn);
		}
	}

	function showConfirm() {
		var modal;
		if (PresentationMode.isPresentationModeBeingForcedByScreenSharing()) {
			modal = $(Handlebars.templates['PresentScreenShareModal']({}));
		} else {
			modal = $(Handlebars.templates['PresentationModeModal']({}));
		}

		modal.on('shown.bs.modal', function () {
			$(this).find('#js-modal-continue').on('click', function () {
				if (PresentationMode.isPresentationModeBeingForcedByScreenSharing()) {
					endScreenSharing();
				} else {
					PresentationMode.disablePresentationMode(presentModeBtn, switchClientBtn);
				}
				modal.modal('hide');
			});

			$('#js-modal-cancel').on('click', function () {
				modal.modal('hide');
			});
		});

		modal.on('hidden.bs.modal', function () {
			modal.remove();
		});

		modal.modal();
	}

	function togglePresentMode() {
		if (PresentationMode.isPresenting()) {
			showConfirm();
		} else {
			PresentationMode.enablePresentationMode(presentModeBtn, switchClientBtn);
		}
	}

	function setupPresentMode() {
		if (fireflyAvailable()) {
			fireflyAPI.on('cobrowsingEnded', function () {
				if (PresentationMode.isPresenting()) {
					PresentationMode.disablePresentationMode(presentModeBtn, switchClientBtn);
				}

				if (screenSharingEndedInterval !== null) {
					clearInterval(screenSharingEndedInterval);
					screenSharingEndedInterval = null;
				}
			});
		}

		var onPresentablePage = PresentationMode.isHomePage() || PresentationMode.isClientPage();
		var alreadyPresenting = PresentationMode.isPresenting();

		if (!onPresentablePage) {
			PresentationMode.disablePresentationMode(presentModeBtn, switchClientBtn);
			return;
		}

		if (alreadyPresenting || PresentationMode.isPresentationModeBeingForcedByScreenSharing()) {
			PresentationMode.enablePresentationMode(presentModeBtn, switchClientBtn);
		}

		if (!PresentationMode.isHomePage() && !(PresentationMode.isPresentationModeBeingForcedByScreenSharing())) {
			switchClientBtn.removeClass('hidden');
		} else {
			switchClientBtn.addClass('hidden');
		}

		presentModeBtn.on('click', togglePresentMode);

		if (PresentationMode.showButton()) {
			presentModeBtn.removeClass('hidden');
		} else {
			presentModeBtn.addClass('hidden');
		}
	}

	if (PresentationMode.isScreenSharingEnabled()) {
		$(document).on('ema.firefly.error', function() {
			PresentationMode.isFireflyLoaded = false;
			setupPresentMode();
		});
		$(document).on('ema.firefly.loaded', function() {
			PresentationMode.isFireflyLoaded = true;
			fireflyAPI.ready(function() {
				setupPresentMode();
			});
		});
	} else {
		PresentationMode.isFireflyLoaded = false;
		setupPresentMode();
	}
});
;/// <reference path="~/bootstrap/ema.js" />

var ClientTaskCheckbox = function () {
	function setWasVisibleToClient() {
		var $checkbox = $(this);
		$checkbox.data('waschecked', $checkbox.prop('checked'));
	}

	function setChecked($checkbox, isClient) {
		if (isClient) {
			$checkbox.prop('checked', $checkbox.data('waschecked'));
		} else {
			$checkbox.prop('checked', false);
		}
	}

	function setDisabled($checkbox, isClient, isCrmOwner) {
		var $checkboxDiv = $checkbox.closest('.checkbox');

		if (!isClient || isCrmOwner) {
			$checkbox.attr('disabled', 'disabled');
			$checkboxDiv.addClass('disabled');
		} else {
			$checkbox.prop('disabled', false);
			$checkboxDiv.removeClass('disabled');
		}
	}

	function setLabel($checkbox, isClient, isCrmOwner) {
		var $label = $checkbox.closest('label');

		$label.toggleClass('text-muted', !isClient || isCrmOwner);
	}

	function enableCheckboxIfClientSelected($dropdown, isCrmOwner) {
		var $checkbox = $('#IsVisibleToClient');
		var $selectedOption = $dropdown.find('option:selected');
		var isClient = $selectedOption.data('isclient') === true;

		setChecked($checkbox, isClient);

		setDisabled($checkbox, isClient, isCrmOwner);

		setLabel($checkbox, isClient, isCrmOwner);
	}

	return {
		SetWasVisibleToClient: setWasVisibleToClient,
		EnableCheckboxIfClientSelected: enableCheckboxIfClientSelected
	};
}
;$(function () {
	var endpoint = window.emaApplicationPath + 'Advisor/Services/';

	var CategoryProvider = function (baseApiEndpoint) {
		var cache = {};

		function buildCacheKey(taskId, clientId) {
			return taskId + '|' + clientId;
		}

		function getTaskCategoriesPromise(taskId, clientId) {
			return ajax.Get(baseApiEndpoint + 'GetGroupedTaskCategories/' + clientId + '?TaskID=' + taskId);
		}

		this.GetCategoryGroups = function (taskId, clientId) {
			var cacheKey = buildCacheKey(taskId, clientId);
			if (cache[cacheKey]) {
				return $.Deferred().resolve(cache[cacheKey]);
			}
			return getTaskCategoriesPromise(taskId, clientId)
				.done(function (serviceResponse) {
					cache[cacheKey] = serviceResponse;
					return serviceResponse;
				});
		};
	};

	var BrokerageAccountFormUtility = function (baseApiEndpoint, $form) {
		var accountsCache = {};
		var $dropdown = $form.find('#js-brokerage-account');
		var $formGroup = $dropdown.closest('.form-group');

		function generateOptionItem(account, selected) {
			var selectedText = selected ? '' : '';
			return '<option ' + selectedText + 'value="' + account.FactId + '">' + account.DisplayName + ' (' + reformatCurrency(account.AccountValue) + ') </option>';
		}

		function populateBrokerageAccountDropdown(accounts) {
			$dropdown.html('');
			for (var i = 0; i < accounts.length; i++) {
				$dropdown.append(generateOptionItem(accounts[i], i === 0));
			}
		}

		function brokerageAccountsServiceRequest(clientId) {
			return $.get(baseApiEndpoint + 'GetBrokerageAccounts/' + clientId);
		}

		function getBrokerageAccounts(clientId) {
			if (accountsCache[clientId]) {
				return $.Deferred().resolve(accountsCache[clientId]);
			}
			return brokerageAccountsServiceRequest(clientId)
				.done(function (serviceResponse) {
					accountsCache[clientId] = serviceResponse;
					return serviceResponse;
				});
		}

		function setDropdownState(visible, editable) {
			$formGroup.toggle(visible);
			$dropdown.attr('name', visible ? 'AccountFactId' : '');
			$dropdown.prop('disabled', !visible);
			if (editable) {
				$dropdown.removeClass('disabled');
				$dropdown.removeAttr('data-val');
				$dropdown.removeAttr('data-val-required');
			} else {
				$dropdown.addClass('disabled');
				$dropdown.attr('data-val', 'true');
				$dropdown.attr('data-val-required', 'A brokerage account is required');
			}
		}

		function setBrokerageAccountsEmptyErrorMessage() {
			$dropdown.html('');
			$dropdown.append('<option value>No linked NFS accounts found</option>');
		}

		this.SetBrokerageAccountsDropdown = function (isEnabledForCategory, clientId) {
			if (!isEnabledForCategory) {
				setDropdownState(false, false);
				return $.Deferred().resolve();
			}
			return getBrokerageAccounts(clientId).then(function (accounts) {
				if (accounts.length == 0) {
					setBrokerageAccountsEmptyErrorMessage();
					setDropdownState(true, false);
				} else {
					populateBrokerageAccountDropdown(accounts);
					setDropdownState(true, true);
				}

				$formGroup.removeClass('has-error');
				$dropdown.removeClass('has-error');
				$form.removeData('validator').removeData('unobtrusiveValidation');
				$.validator.unobtrusive.parse($form);

			});
		};
	};

	var clientTaskCheckbox = new ClientTaskCheckbox();
	var categoryProvider = new CategoryProvider(endpoint);

	$(document).on('emaTaskCountUpdated', function (data, count) {
		setTaskBadge(count);
	});

	$(document).on('emaTaskError', function () {
		var tasksBadgeContainer = $('.js-tasks-warning');
		tasksBadgeContainer.toggle(true);
	});

	$(document).on('click', '.js-task-complete', function () {
		var el = $(this);
		var taskID = el.data('task');
		var dueDate = getDueDate(el);

		ajax.Post({
			'dueDate': dueDate
		}, endpoint + 'CompleteTask/' + taskID)
			.done(function () {
				decrementTaskBadge(taskID);
				$(document).trigger('emaTaskCompleted', [taskID, dueDate]);
			})
			.fail(function () {
				showFailure('There was a problem.', 'Your changes were not saved. Please try again.');
			});
	});

	$(document).on('click', '.js-task-reopen', function () {
		var el = $(this);
		var taskID = el.data('task');

		ajax.Post(null, endpoint + 'ReopenTask/' + taskID)
			.done(function () {
				$(document).trigger('emaTaskReopened', [taskID]);
			}).fail(function () {
			showFailure('There was a problem.', 'Your changes were not saved. Please try again.');
		});
	});

	$(document).on('click', '.js-task-delete', function () {
		var el = $(this);
		var taskID = el.data('task');
		var deleteRequest = function () {
			return ajax.Post(null, endpoint + 'DeleteTask/' + taskID);
		};
		var doneCallback = function () {
			decrementTaskBadge(taskID);
			$(document).trigger('emaTaskDeleted', [taskID]);
		};

		showConfirmDelete('Confirm Delete Task', 'Are you sure you want to delete this task?', deleteRequest, doneCallback);
	});

	$(document).on('click', '.js-task-add', function () {
		var el = $(this);
		var clientID = el.data('client');

		$(this).closest('.popover').popover('hide');

		ajax.Post(null, endpoint + 'GetAddTaskViewModel/' + clientID).done(function (addTaskModel) {
			var modal = $(Handlebars.templates['TaskModal']({
				Clients: addTaskModel.Clients,
				EnableClientTasks: emaFeatureToggles.ClientTasksEnabled,
				IsVisibleToClient: addTaskModel.ShowOnWebsiteDefault,
				IsDisabled: !addTaskModel.IsAssignedToClient
			}));
			var form = modal.find('form');
			var clientDropdown = form.find('#Client');
			var assignedToDropdown = form.find('#js-assignedto');
			var categoryDropdown = form.find('#js-category');
			var categoryRow = categoryDropdown.parents('.form-group');

			var brokerageAccountsFormUtil = new BrokerageAccountFormUtility(endpoint, form);

			if (clientID) {
				// lock down the dropdown when we already have a client
				clientDropdown.closest('.form-group').hide();
			}
			$.validator.unobtrusive.parse(form);

			form.on('submit', function () {
				var clientID = clientDropdown.val();
				if (form.valid() && clientID) {
					var data = form.serialize();

					disableModal(modal);
					ajax.Post(data, endpoint + 'AddTask')
						.done(function (task) {
							task.Subject = Encoder.decodeHTML(task.Subject);
							task.Text = Encoder.decodeHTML(task.Text);

							// copy in fields that aren't given back to us
							task.ClientName = clientDropdown.find('option:selected').text();
							$(document).trigger('emaTaskAdded', [task]);
						})
						.fail(function () {
							showFailure('There was a problem.', 'Your task was not added. Please try again.');
						})
						.always(function () {
							modal.modal('hide');
						});
				}
				return false;
			});

			var defaultTaskID = '';

			clientDropdown.on('change', function () {
				categoryRow.hide();
				assignedToDropdown.empty();
				categoryDropdown.empty();

				// empty the list of assignable
				assignedToDropdown.empty();

				// get the new list for the selected client
				var clientID = clientDropdown.val();
				if (!clientID) {
					return;
				}

				categoryProvider.GetCategoryGroups(defaultTaskID, clientID).done(function (categories) {
					populateCategoriesDropdown(categories, categoryDropdown, categoryRow);
					enableForm(clientDropdown);
				})
					.fail(function () {
						showFailureMessage(modal);
					});
			});

			bindCategoryDropdownChangeEvent(categoryDropdown, clientDropdown, assignedToDropdown, brokerageAccountsFormUtil, modal);

			assignedToDropdown.on('change', function () {
				clientTaskCheckbox.EnableCheckboxIfClientSelected(assignedToDropdown, false);
			});
			form.find('#IsVisibleToClient').on('click', clientTaskCheckbox.SetWasVisibleToClient);

			clientDropdown.trigger('change');

			modal.on('hidden.bs.modal', function () {
				modal.remove();
			})
				.on('change', '#Due, #Reminder', function () {
					var $this = $(this);
					var val = $this.val();
					if (val === '') {
						return;
					}

					var formatted = reformatTimestamp(val);
					$this.val(formatted);
				});

			modal.modal();
		})
			.fail(function () {
				showFailure('There was a problem.', 'Please try again.');
			});
	});

	$(document).on('click', '.js-task-edit', function () {
		var el = $(this);
		var taskID = el.data('task');

		ajax.Get(endpoint + 'GetTask/' + taskID + '/').done(function (task) {
			task.Subject = Encoder.decodeHTML(task.Subject);
			task.Text = Encoder.decodeHTML(task.Text);
			task.Clients = [{
				Value: task.ClientID,
				Name: task.ClientName,
				IsSelected: true
			}];
			task.Due = asTimestamp(Date.parse(task.Due));
			task.Reminder = asTimestamp(Date.parse(task.Reminder));
			task.EnableClientTasks = emaFeatureToggles.ClientTasksEnabled;
			task.IsDisabled = !task.IsAssignedToClient;

			var modal = $(Handlebars.templates['TaskModal'](task));
			var brokerageAccountsFormUtil = new BrokerageAccountFormUtility(endpoint, modal.find('form'));

			modal.on('shown.bs.modal', function () {
				var form = modal.find('form');
				var clientDropdown = modal.find('#Client');
				var assignedToDropdown = modal.find('#js-assignedto');
				var categoryDropdown = form.find('#js-category');
				var categoryRow = categoryDropdown.parents('.form-group');

				$.validator.unobtrusive.parse(form);

				form.on('submit', function () {
					if (!form.valid()) {
						return false;
					}

					var data = form.serialize();

					ajax.Post(data, endpoint + 'EditTask')
						.done(function (task) {
							task.Subject = Encoder.decodeHTML(task.Subject);
							task.Text = Encoder.decodeHTML(task.Text);
							$(document).trigger('emaTaskEdited', [task]);
						})
						.fail(function () {
							showFailure('There was a problem.', 'Your changes were not saved. Please try again');
						})
						.always(function () {
							modal.modal('hide');
						});

					return false;
				});

				clientDropdown.on('change', function () {
					categoryRow.hide();
					// empty the list of assignable
					assignedToDropdown.empty();

					// get the new list for the selected client
					var clientID = clientDropdown.val();
					if (!clientID) {
						return;
					}

					categoryProvider.GetCategoryGroups(taskID, clientID).done(function (categories) {
						populateCategoriesDropdown(categories, categoryDropdown, categoryRow, task);
					})
						.fail(function () {
							showFailureMessage(modal);
						});
				});

				bindCategoryDropdownChangeEvent(categoryDropdown, clientDropdown, assignedToDropdown, brokerageAccountsFormUtil, modal, task);

				assignedToDropdown.on('change', function () {
					clientTaskCheckbox.EnableCheckboxIfClientSelected(assignedToDropdown, false);
				});
				form.find('#IsVisibleToClient').on('click', clientTaskCheckbox.SetWasVisibleToClient);

				clientDropdown.trigger('change');
			}).on('hidden.bs.modal', function () {
				modal.remove();
			})
				.on('change', '#Due, #Reminder', function () {
					var $this = $(this);
					var val = $this.val();
					if (val === '') {
						return;
					}

					var formatted = reformatTimestamp(val);
					$this.val(formatted);
				});

			modal.modal();
		})
			.fail(function () {
				showFailure('There was a problem.', 'Error loading task. Please try again.');
			});
	});

	$(document).on('emaTaskAdded.default', function () {
		showSuccess('Success!', 'Your task has been added.');
	});

	$(document).on('emaTaskEdited.default', function () {
		showSuccess('Success!', 'Your task has been modified.');
	});

	function bindCategoryDropdownChangeEvent($categoryDropdown, $clientDropdown, $assignedToDropdown, brokerageFormUtil, $modal, task) {
		$categoryDropdown.on('change', function () {
			$assignedToDropdown.empty();
			var clientID = $clientDropdown.val();
			var categoryId = $categoryDropdown.val();
			var featureVariable;
			disableModal($modal);
			var clientPromise = getTaskableUsersForClientPromise(categoryId, clientID)
				.then(function (users) {
					repopulateAssignableUsers(users, $assignedToDropdown, task);
					return getSupportedFeatures(categoryId, clientID);
				})
				.then(function (features) {
					return brokerageFormUtil.SetBrokerageAccountsDropdown(features.ShowBrokerageAccounts, clientID).then(function () {
						featureVariable = features;
						return features;
					});
				});
			clientPromise.always(function () {
				enableModal($modal);
				toggleCheckbox(featureVariable.ShowCheckbox);
				toggleReminderDate(featureVariable.ShowReminderDate, $modal);
				$assignedToDropdown.trigger('change');
			});
		});
	}

	function enableForm(clientDropdown) {
		clientDropdown.closest('form')
			.find('input:not(#IsVisibleToClient), select:not(#js-brokerage-account), textarea')
			.prop('disabled', false);
	}

	function showFailureMessage(modal) {
		modal.modal('hide');
		showFailure('There was a problem.', 'Please try again.');
	}

	function getTaskableUsersForClientPromise(categoryId, clientID) {
		return ajax.Get(endpoint + 'GetTaskableUsersForClientByCategory/' + clientID + '?CategoryId=' + categoryId);
	}

	function repopulateAssignableUsers(users, assignedToDropdown, task) {
		assignedToDropdown.html('');
		for (var i = 0; i < users.length; i++) {
			var option = $('<option/>').attr({
				'value': users[i].Value,
				'data-isclient': users[i].AdditionalValues.IsClient
			}).text(users[i].Text);

			if (task) {
				option.prop('selected', isAssignedToUser(users[i], task));
			} else {
				option.prop('selected', users[i].IsSelected);
			}

			assignedToDropdown.append(option);
		}
	}

	function populateCategoriesDropdown(categoryGroups, categoryDropdown, categoryRow, task) {
		categoryDropdown.empty();
		var categoryCount = 0;
		for (var i = 0; i < categoryGroups.length; i++) {
			var categoryGroup = categoryGroups[i];
			var groupElement;
			if (categoryGroup.Label && categoryGroups.length > 1) { /* TODO: Remove if categoryGroup.Label statements after Tasks update is live for all partners. */
				groupElement = $('<optgroup label=\'' + categoryGroup.Label + '\'></optgroup>');
			} else {
				groupElement = categoryDropdown;
			}
			for (var j = 0; j < categoryGroup.TaskCategories.length; j++) {
				var category = categoryGroup.TaskCategories[j];
				var option = $('<option />').attr('value', category.ID).text(category.Text);
				if (task) {
					option.prop('selected', category.ID === task.CategoryID);
				}
				groupElement.append(option);
				categoryCount++;
			}
			if (categoryGroup.Label) {
				categoryDropdown.append(groupElement);
			}
		}
		if (categoryCount > 1) {
			categoryRow.show();
		}
		categoryDropdown.trigger('change');
	}

	function getSupportedFeatures(categoryId, clientID) {
		return ajax.Get(endpoint + 'GetSupportedFeaturesByCategory/' + clientID + '?CategoryID=' + categoryId);
	}

	function toggleReminderDate(showReminderDate, modal) {
		var reminder = $('#Reminder', modal).closest('.form-group');
		if (showReminderDate) {
			reminder.show();
		} else {
			reminder.hide();
		}
	}

	function toggleCheckbox(showCheckbox) {
		var $checkboxFormGroup = $('.js-client-task-checkbox');

		if (showCheckbox) {
			$checkboxFormGroup.show();
		} else {
			$checkboxFormGroup.hide();
		}
	}

	function isAssignedToUser(user, task) {
		var userIDMatches = user.Value === task.AssignedTo;

		if (task.IsAssignedToClient) {
			return user.AdditionalValues.IsClient;
		} else {
			return userIDMatches;
		}
	}

	function setTaskBadge(newCount) {
		var tasksBadgeContainer = $('.js-tasks-badgecount');

		tasksBadgeContainer.toggle(newCount !== 0);
		tasksBadgeContainer.attr('data-badge-count', newCount);
		tasksBadgeContainer.text(newCount <= 99 ? newCount : '99+');
	}

	function decrementTaskBadge(taskId) {
		var tasksPopoverContainer = $('<div class="popover-lg"/>');
		var tasksBadgeContainer = $('.js-tasks-badgecount'); // this is the class it searches for to find the data-attribute and text of the badge
		var tasksTable = $('.js-tasks-table'); // this is the table of tasks found on the tasks page

		var tasksCount = parseInt(tasksBadgeContainer.attr('data-badge-count')) - 1;

		var popovercontainerTask = tasksPopoverContainer.find('[data-task=' + taskId + ']');
		var alreadyCompleted = tasksTable.find('[data-task=' + taskId + ']').parents('tr').hasClass('task-completed');

		// if we can find the list in the popover OR the list in the table
		if (tasksPopoverContainer.length !== 0 || tasksTable.length !== 0) {

			// if we can find the task in the popover list OR the task in the table does NOT have the 'task-completed' class
			if (popovercontainerTask.length !== 0 || !alreadyCompleted) {
				setTaskBadge(tasksCount);
			}
		}
	}

	function getDueDate(taskElement) {
		return taskElement.data('date')
			? taskElement.data('date')
			: taskElement.parents('tr[data-date]').first().data('date');
	}

	function asTimestamp(date) {
		/// <summary>Converts a Date object into a nicely formatted string.</summary>
		/// <param name="date" type="Date">A Date object that should be converted to a Timestamp.</param>

		if (typeof date === 'undefined' || date === null || isNaN(date)) {
			return '';
		}

		if (typeof date === 'number') {
			date = new Date(date);
		}

		var formattedDate = (date.getMonth() + 1) + '/' + date.getDate() + '/' + date.getFullYear();
		var formattedTime = (date.getHours() % 12 === 0 ? '12' : date.getHours() % 12) + ':' + padNumber(date.getMinutes(), 2, '0') + ':' + padNumber(date.getSeconds(), 2, '0') + ' ' + (date.getHours() < 12 ? 'AM' : 'PM');

		return formattedDate + ' ' + formattedTime;
	}

	function padNumber(number, width, char) {
		var str = number.toString();
		while (str.length < width) {
			str = char + str;
		}
		return str;
	}
});
;/// <reference path="~/bootstrap/ema.js" />
/// <reference path="~/bootstrap/ema.templates.js" />
/// <reference path="ajax.js" />
/// <reference path="TransientNotifications.js" />

$(function () {
	var tasksPopoverContainer = $('<div class="popover-content-lg"/>'),
		tasksTitle = $(Handlebars.templates['TasksPopoverTitle']({ ApplicationPath: emaApplicationPath, CanAdd: true })),
		loadingElementMarkup = '<li class="text-muted text-center"><i class="fa fa-spinner fa-spin"></i> Loading more tasks...</li>',
		endpoint = emaApplicationPath + 'Advisor/Services/GetTopTasksAssignedToUser',
		$tooltip = $('.js-popover-tasks').find('[data-toggle="tooltip"]'),
		tasksCache;

	var $document = $(document);
	$document.on('redtailSyncChanged', refreshTaskList);

	function refreshTasksCache() {
		tasksCache = ajax.Get(endpoint);
	}

	function refreshTaskList() {
		tasksPopoverContainer.html('<ul class="list-unstyled"><li class="text-muted">Loading tasks...</li></ul>');
		refreshTasksCache();
		updateTaskList();
	}

	function updateTaskList() {
		tasksCache.done(function (tasks) {
			tasks.Tasks.forEach(function (task) {
				task.Subject = Encoder.decodeHTML(task.Subject);
				task.Text = Encoder.decodeHTML(task.Text);
			});
			tasksPopoverContainer.html(Handlebars.templates['TasksPopover']({
				Tasks: tasks.Tasks,
				ShowRedtailOptions: tasks.ShowRedtailOptions,
				TaskAndNoteSyncValueForAdvisor: tasks.TaskAndNoteSyncValueForAdvisor
				}));
			tasksTitle.html(Handlebars.templates['TasksPopoverTitle']({
				ApplicationPath: emaApplicationPath,
				CanAdd: tasks.CanAdd,
				TaskSource: tasks.TaskSource
			}));

			$(document).trigger('emaTaskCountUpdated', tasks.TaskCount);
			if (!tasks.CanAdd)
				triggerTaskError();

			tasksPopoverContainer.find('li').each(function () {
				var $li = $(this),
					$textWrapper = $li.find('.text-wrapper'),
					showExpandButton = parseInt($textWrapper.css('max-width')) <= $textWrapper.innerWidth(),
					$expandBtn = $('<button class="pull-left btn-expand btn btn-default btn-xs"><strong>...</strong></button>')

				if (showExpandButton) {
					$expandBtn.one('click', function (e) {
						$textWrapper.addClass('expand-wrapper');
						$expandBtn.remove();
						e.stopPropagation();
					});

					$textWrapper.after($expandBtn);
				}
			});
		})
			.fail(function (jqXHR) {
				$('.js-popover-tasks').popover('hide');

				if (jqXHR.status !== 0)
					triggerTaskError();
			});
	}

	function triggerTaskError() {
		$(document).trigger('emaTaskError');
	}

	$(document).on('emaTaskCompleted emaTaskDeleted', function (e, taskID, dueDate) {
		var taskElement = tasksPopoverContainer.find('[data-task=' + taskID + '][data-date="' + dueDate + '"]').closest('li');
		tasksPopoverContainer.find('ul').append(loadingElementMarkup);

		refreshTasksCache();

		taskElement.on('hidden.bs.collapse', function () {
			taskElement.remove();
			updateTaskList();
		});
		taskElement.collapse({ toggle: true });
	});

	$(document).on('emaTaskAdded emaTaskReopened', refreshTaskList);

	$(document).on('click', '.js-redtail-advisor-sync', function () {
		var $this = $(this),
			currentValue = $this.attr('value'),
			redtailSyncValue = currentValue !== 'true',
			data = { redtailSyncValue: redtailSyncValue };

		var request = function () {
			return ajax.Post(data, emaApplicationPath + 'Advisor/Services/SetRedtailIntegrationOptionsForClients')
				.done(function () {
					var successMessage = redtailSyncValue ?
						"Your clients' Notes and Tasks are now synced with Redtail." :
						"Your clients' Notes and Tasks are no longer synced with Redtail.";

					showSuccess('Success!', successMessage);
					$document.trigger('redtailSyncChanged');
				})
				.fail(function () {
					showFailure('There was a problem', 'Your changes were not saved. Please try again.');
				});
		};

		var confirmationModalMessage =
			"Are you sure you want to change Redtail synchronization settings for all clients?";

		$this.closest('.form-group').hide();
		$this.closest('.popover').popover('hide');
		showConfirmModal({ Message: confirmationModalMessage }, request);
	});

	if ($('.js-popover-tasks').length > 0) {
		refreshTaskList();
	}

	$('.js-popover-tasks').popover({
		placement: 'bottom',
		title: tasksTitle,
		html: true,
		content: tasksPopoverContainer
	}).on('hidden.bs.popover', function () {
		// replace to tooltip
		$tooltip.tooltip();
	}).on('show.bs.popover', function () {
		// temporarily kill the tasks tooltip
		$tooltip.tooltip('destroy');
		tasksPopoverContainer.html('<ul class="list-unstyled"><li class="text-muted">Loading tasks...</li></ul>');
		updateTaskList();
	});
});
;﻿var FidelityTaskDeepLinkLogger = (function () {

	var onClickHandler = function (deepLinkAction) {
		var eventProperties = {		
			"Integration Partner": "Fidelity",
			"Source": "Tasks"
		};
	
		window.eventLogger.logEvent('Brokerage', deepLinkAction, eventProperties);
	};

	return {
		OnClickHandler: onClickHandler
	};
﻿}());