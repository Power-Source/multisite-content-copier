document.addEventListener('DOMContentLoaded', function () {
	'use strict';

	var input = document.getElementById('autocomplete');
	if (!input) {
		return;
	}

	var cache = {};
	var results = [];
	var activeIndex = -1;
	var requestController = null;
	var requestTimer = null;
	var type = input.dataset.type;
	var listId = 'mcc-autocomplete-results';
	var wrapper = document.createElement('div');
	var list = document.createElement('ul');

	wrapper.className = 'mcc-autocomplete';
	input.parentNode.insertBefore(wrapper, input);
	wrapper.appendChild(input);

	list.id = listId;
	list.className = 'mcc-autocomplete__results';
	list.setAttribute('role', 'listbox');
	list.hidden = true;
	wrapper.appendChild(list);

	input.setAttribute('role', 'combobox');
	input.setAttribute('aria-autocomplete', 'list');
	input.setAttribute('aria-controls', listId);
	input.setAttribute('aria-expanded', 'false');
	input.setAttribute('autocomplete', 'off');

	function getItemLabel(item) {
		if (type === 'sites') {
			return item.path + ' [' + item.blog_name + ']';
		}
		if (type === 'posts') {
			return item.the_title + ' [' + item.the_id + ']';
		}
		return item.username + ' [' + item.user_id + ']';
	}

	function getItemValue(item) {
		if (type === 'sites') {
			return item.blog_name;
		}
		if (type === 'posts') {
			return item.the_title;
		}
		return item.username;
	}

	function closeResults() {
		activeIndex = -1;
		list.hidden = true;
		input.setAttribute('aria-expanded', 'false');
		input.removeAttribute('aria-activedescendant');
	}

	function setActiveItem(index) {
		var options = list.querySelectorAll('[role="option"]');
		if (!options.length) {
			return;
		}

		activeIndex = (index + options.length) % options.length;
		options.forEach(function (option, optionIndex) {
			option.setAttribute('aria-selected', optionIndex === activeIndex ? 'true' : 'false');
		});
		input.setAttribute('aria-activedescendant', options[activeIndex].id);
		options[activeIndex].scrollIntoView({block: 'nearest'});
	}

	function selectItem(item) {
		var targetIds = {
			sites: ['blog_id', 'blog_id'],
			posts: ['post_id', 'the_id'],
			users: ['user_id', 'user_id']
		};
		var target = document.getElementById(targetIds[type][0]);

		input.value = getItemValue(item);
		if (target) {
			target.value = item[targetIds[type][1]];
		}
		closeResults();
		input.dispatchEvent(new Event('change', {bubbles: true}));
	}

	function renderResults(items) {
		results = Array.isArray(items) ? items : [];
		list.replaceChildren();

		results.forEach(function (item, index) {
			var option = document.createElement('li');
			option.id = listId + '-' + index;
			option.className = 'mcc-autocomplete__option';
			option.setAttribute('role', 'option');
			option.setAttribute('aria-selected', 'false');
			option.textContent = getItemLabel(item);
			option.addEventListener('mousedown', function (event) {
				event.preventDefault();
				selectItem(item);
			});
			list.appendChild(option);
		});

		list.hidden = results.length === 0;
		input.setAttribute('aria-expanded', results.length ? 'true' : 'false');
		activeIndex = -1;
	}

	function fetchResults(term) {
		if (cache[term]) {
			renderResults(cache[term]);
			return;
		}

		if (requestController) {
			requestController.abort();
		}
		requestController = new AbortController();

		var params = new URLSearchParams({
			action: 'mcc_get_' + type + '_search',
			term: term
		});
		if (type === 'posts' || type === 'users') {
			var sourceBlog = document.getElementById('src_blog_id');
			params.set('blog_id', sourceBlog ? sourceBlog.value : '');
		}

		fetch(window.ajaxurl, {
			method: 'POST',
			credentials: 'same-origin',
			headers: {'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'},
			body: params.toString(),
			signal: requestController.signal
		})
			.then(function (response) {
				if (!response.ok) {
					throw new Error('Autocomplete request failed');
				}
				return response.json();
			})
			.then(function (items) {
				cache[term] = items;
				renderResults(items);
			})
			.catch(function (error) {
				if (error.name !== 'AbortError') {
					closeResults();
				}
			});
	}

	input.addEventListener('input', function () {
		window.clearTimeout(requestTimer);
		if (input.value.trim().length < 2) {
			closeResults();
			return;
		}
		requestTimer = window.setTimeout(function () {
			fetchResults(input.value.trim());
		}, 180);
	});

	input.addEventListener('keydown', function (event) {
		if (list.hidden || !results.length) {
			return;
		}
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			setActiveItem(activeIndex + 1);
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			setActiveItem(activeIndex - 1);
		} else if (event.key === 'Enter' && activeIndex >= 0) {
			event.preventDefault();
			selectItem(results[activeIndex]);
		} else if (event.key === 'Escape') {
			closeResults();
		}
	});

	input.addEventListener('blur', function () {
		window.setTimeout(closeResults, 100);
	});
});