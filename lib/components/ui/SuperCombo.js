'use strict';

/**
 * MLSuperCombo
 * A combo select list with intelligent scrolling of super large lists.
 */

var Component = require('../c_class')
	, componentsRegistry = require('../c_registry')
	, _ = require('mol-proto')
	, doT = require('dot');


var COMBO_CHANGE_MESSAGE = 'mlsupercombochange';

var OPTIONS_TEMPLATE = '{{~ it.comboOptions :option:index }}\
							<div {{? option.selected}}class="selected" {{?}}data-value="{{= index }}">{{= option.label }}</div>\
						{{~}}';

var MAX_RENDERED = 100;
var BUFFER = 25;
var DEFAULT_ELEMENT_HEIGHT = 20;

var MLSuperCombo = Component.createComponentClass('MLSuperCombo', {
	events: {
		messages: {
			'mouseleave': {subscriber: onMouseLeave, context: 'owner'}
		}
	},
	data: {
		get: MLSuperCombo_get,
		set: MLSuperCombo_set,
		del: MLSuperCombo_del,
		splice: undefined,
		event: COMBO_CHANGE_MESSAGE
	},
	dom: {
		cls: 'ml-ui-supercombo'
	},
	template: {
		template: '<input ml-bind="[data, events]:input" class="form-control ml-ui-input">\
		           <button ml-bind="[events]:openBtn" class="btn btn-default ml-ui-button">Add</button>\
		           <div ml-bind="[dom, events]:list" class="ml-ui-supercombo-dropdown">\
		               <div ml-bind="[dom]:before"></div>\
		               <div ml-bind="[template, dom, events]:options" class="ml-ui-supercombo-options"></div>\
		               <div ml-bind="[dom]:after"></div>\
		           </div>'
	},
	container: undefined
});

componentsRegistry.add(MLSuperCombo);

module.exports = MLSuperCombo;

/**
 * Public Api
 */
_.extendProto(MLSuperCombo, {
	init: MLSuperCombo$init,
	showOptions: MLSuperCombo$showOptions,
	hideOptions: MLSuperCombo$hideOptions,
	toggleOptions: MLSuperCombo$toggleOptions,
	setOptions: MLSuperCombo$setOptions,
	setFilteredOptions: MLSuperCombo$setFilteredOptions,
	update: MLSuperCombo$update
});


/**
 * Component instance method
 * Initialise the component, wait for childrenbound, setup empty options arrays.
 */
function MLSuperCombo$init() {
	Component.prototype.init.apply(this, arguments);
	
	this.on('childrenbound', onChildrenBound);
	
	_.defineProperties(this, {
		_optionsData: [],
		_filteredOptionsData: []
	}, _.WRIT);
}

/**
 * Handler for init childrenbound listener. Renders template.
 */
function onChildrenBound() {
	this.off('childrenbound', onChildrenBound);
	this.template.render().binder();
	componentSetup.call(this);
}


/**
 * Define instance properties, get subcomponents, call setup sub-tasks
 */
function componentSetup() {
	_.defineProperties(this, {
		'_comboInput': this.container.scope.input,
		'_comboList': this.container.scope.list,
		'_comboOptions': this.container.scope.options,
		'_comboBefore': this.container.scope.before,
		'_comboAfter': this.container.scope.after,
		'_comboOpenBtn': this.container.scope.openBtn,
		'_optionTemplate': doT.compile(OPTIONS_TEMPLATE)
	});

	_.defineProperties(this, {
		'_startIndex': 0,
		'_endIndex': MAX_RENDERED,
		'_hidden': false,
		'_elementHeight': 0,
		'_total': 0,
		'_optionsHeight': 200,
		'_lastScrollPos': 0,
		'_currentValue': null,
		'_selected': null
	}, _.WRIT);

	// Component Setup
	this.dom.setStyles({ position: 'relative' });
	setupComboList(this._comboList, this._comboOptions, this);
	setupComboInput(this._comboInput, this);
	setupComboBtn(this._comboOpenBtn, this);

	this.events.on('keydown', { subscriber: changeSelected, context: this});
}

/**
 * Component instance method
 * Shows or hides option list.
 * 
 * @param {Boolean} show true to show, false to hide
 */
function MLSuperCombo$toggleOptions(show) {
	this._hidden = !show;
	this._comboList.dom.toggle(show);
}

/**
 * Component instance method
 * Shows options list
 */
function MLSuperCombo$showOptions() {
	this._hidden = false;
	this._comboList.dom.toggle(true);
}

/**
 * Component instance method
 * Hides options list
 */
function MLSuperCombo$hideOptions() {
	this._hidden = true;
	this._comboList.dom.toggle(false);
}

/**
 * Component instance method
 * Sets the options of the dropdown
 * 
 * @param {Array[Object]} arr the options to set with label and value pairs. Value can be an object.
 */
function MLSuperCombo$setOptions(arr) {
	this._optionsData = arr;
	this.setFilteredOptions(arr);
}

/**
 * Component instance method
 * Sets the filtered options, which is a subset of normal options
 * 
 * @param {[type]} arr The options to set
 */
function MLSuperCombo$setFilteredOptions(arr) {
	this._filteredOptionsData = arr;
	this._total = arr.length;
	this.update();
}

/**
 * Component instance method
 * Updates the list. This is used on scroll, and makes use of the filteredOptions to 
 * intelligently show a subset of the filtered list at a time.
 */
function MLSuperCombo$update() {
	var wasHidden = this._hidden;
	if (wasHidden)
		this.showOptions();

	var arrToShow = this._filteredOptionsData.slice(this._startIndex, this._endIndex);

	this._comboOptions.template.render({
		comboOptions: arrToShow
	});

	this._elementHeight = this._elementHeight || DEFAULT_ELEMENT_HEIGHT;

	if (wasHidden)
		this.hideOptions();

	var beforeHeight = this._startIndex * this._elementHeight;
	var afterHeight = (this._total - this._endIndex) * this._elementHeight;
	this._comboBefore.el.style.height = beforeHeight + 'px';
	this._comboAfter.el.style.height = afterHeight > 0 ? afterHeight + 'px' : '0px';
}

/**
 * Setup the combo list
 * 				
 * @param  {Component} list
 * @param  {Array} options
 * @param  {Component} self
 */
function setupComboList(list, options, self) {
	options.template.set(OPTIONS_TEMPLATE);
	
	list.dom.setStyles({
		overflow: 'scroll',
		height: self._optionsHeight + 'px',
		width: '100%',
		position: 'absolute',
		zIndex: 10
		// top: yPos + 'px',
		// left: xPos + 'px',
	});

	self.hideOptions();
	list.events.onMessages({
		'click': {subscriber: onListClick, context: self},
		'scroll': {subscriber: onListScroll, context: self}
	});
}

/**
 * Setup the input component
 * 
 * @param  {Component} input
 * @param  {Component} self
 */
function setupComboInput(input, self) {
	input.data.on('', { subscriber: onDataChange, context: self });
	input.events.on('click', {subscriber: onInputClick, context: self });
	input.events.on('keydown', {subscriber: onEnterKey, context: self });
}

/**
 * Setup the button
 * @param  {Component} btn
 * @param  {Component} self
 */
function setupComboBtn(btn, self) {
	btn.events.on('click', { subscriber: onAddBtn, context: self });
}


/**
 * Custom data facet get method
 */
function MLSuperCombo_get() {
	return this._currentValue;
}

/**
 * Custom data facet set method
 * @param {Variable} obj
 */
function MLSuperCombo_set(obj) {
	this._currentValue = obj;
	this._comboInput.data.set(obj.label);
}

/**
 * Custom data facet del method
 */
function MLSuperCombo_del() {
	this._currentValue = null;
	this._comboInput.data.set('');
}


/**
 * Input data change handler
 * When the input data changes, this method filters the optionsData, and sets the first element
 * to be selected. 
 * @param  {String} msg
 * @param  {Objext} data
 */
function onDataChange(msg, data) {
	var text = data.newValue;
	var filteredArr = _.filter(this._optionsData, function(option) {
		delete option.selected;
		var label = option.label ? option.label.toLowerCase() : null;
		text = text.toLowerCase();
		return label ? label.indexOf(text) != -1 : false;
	});
	if (filteredArr.length)
		filteredArr[0].selected = true;
	
	this.showOptions();
	this.setFilteredOptions(filteredArr);
	this._comboList.el.scrollTop = 0;
}

/**
 * A map of keyCodes to directions
 * @type {Object}
 */
var directionMap = { '40': 1, '38': -1 };

/**
 * List keydown handler
 * Changes the selected list item by finding the adjacent item and setting it to selected.
 * 
 * @param  {string} type
 * @param  {Event} event
 */
function changeSelected(type, event) {
	// TODO: refactor and tidy up, looks like some code duplication.
	var direction = directionMap[event.keyCode];

	if (direction) {
		var selected = this.el.querySelectorAll('.selected')[0]
			, scrollPos = this._comboList.el.scrollTop
			, selectedPos = selected ? selected.offsetTop : 0
			, relativePos = selectedPos - scrollPos;
		
		if (selected) {
			var index = _getDataValueFromElement.call(this, selected),
			thisItem = this._filteredOptionsData[index],
			adjItem = this._filteredOptionsData[index + direction];
			
			if (adjItem) {
				delete thisItem.selected;
				adjItem.selected = true;
				this._selected = adjItem;
				this.update();
			}
		} else {
			if (this._filteredOptionsData[0]) {
				this._filteredOptionsData[0].selected = true;
				this.update();
			}
		}

		if (relativePos > this._optionsHeight - this._elementHeight*2 && direction === 1)
			this._comboList.el.scrollTop += this._elementHeight*direction;

		if (relativePos < this._elementHeight && direction === -1)
			this._comboList.el.scrollTop += this._elementHeight*direction;
	}
}

/**
 * Mouse leave handler
 * 
 * @param  {String} type
 * @param  {Event} event
 */
function onMouseLeave(type, event) {
	this.hideOptions();
}


/**
 * Input click handler
 * 
 * @param  {String} type
 * @param  {Event} event
 */
function onInputClick(type, event) {
	this.showOptions();
}


/**
 * Enter key handler
 * 
 * @param  {String} type
 * @param  {Event} event
 */
function onEnterKey(type, event) {
	if (event.keyCode == 13)
		if (this._selected)
			_setData.call(this);
}

/**
 * Add button handler
 * 
 * @param  {String} type
 * @param  {Event} event
 */
function onAddBtn (type, event) {
	
}

/**
 * List click handler
 * 
 * @param  {String} type
 * @param  {Event} event
 */
function onListClick (type, event) {
	var index = _getDataValueFromElement.call(this, event.target);
	var data = this._filteredOptionsData[index];

	this._selected = data;
	_setData.call(this);
	this.update();
}


/**
 * List scroll handler
 * 
 * @param  {String} type
 * @param  {Event} event
 */
function onListScroll (type, event) {
	var scrollPos = event.target.scrollTop
		, direction = scrollPos > this._lastScrollPos ? 'down' : 'up'
		, firstChild = this._comboOptions.el.lastChild
		, lastChild = this._comboOptions.el.firstChild
		, lastElPosition = firstChild ? firstChild.offsetTop : 0
		, firstElPosition = lastChild ? lastChild.offsetTop : 0
		, distFromLastEl = lastElPosition - scrollPos - this._optionsHeight + this._elementHeight
		, distFromFirstEl = scrollPos - firstElPosition
		, elsFromStart = Math.floor(distFromFirstEl / this._elementHeight)
		, elsToTheEnd = Math.floor(distFromLastEl / this._elementHeight)
		, totalElementsBefore = Math.floor(scrollPos / this._elementHeight) - BUFFER;
		
		this._startIndex = totalElementsBefore > 0 ? totalElementsBefore : 0;
		this._endIndex = totalElementsBefore + MAX_RENDERED;

	if ((direction == 'down' && elsToTheEnd < BUFFER) 
	 	 || (direction == 'up' && elsFromStart < BUFFER)) {
		this._elementHeight = firstChild.style.height;
		this.update();
	}
	this._lastScrollPos = scrollPos;
}


/**
 * Private method
 * Retrieves the data-value attribute value from the element and returns it as an index of
 * the filteredOptions
 * 
 * @param  {Element} el
 * @return {Number}
 */
function _getDataValueFromElement(el) {
	return Number(el.getAttribute('data-value')) + this._startIndex;
}

/**
 * Private method
 * Sets the data of the SuperCombo, taking care to reset some things and temporarily
 * unsubscribe data listeners.
 */
function _setData() {
	delete this._selected.selected;
	this.hideOptions();
	this._comboInput.data.off('', { subscriber: onDataChange, context: this });
	this.data.set(this._selected);
	this.data.getMessageSource().dispatchMessage(COMBO_CHANGE_MESSAGE);
	this._comboInput.data.on('', { subscriber: onDataChange, context: this });
	this._selected = null;
	this.setFilteredOptions(this._optionsData);
}