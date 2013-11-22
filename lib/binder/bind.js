'use strict';

var componentsRegistry = require('../components/c_registry')
	, Component = componentsRegistry.get('Component')
	, Attribute = require('./attribute')
	, BindError = require('./error')
	, _ = require('proto')
	, check = require('../check')
	, Match =  check.Match;


var opts = {
	BIND_ATTR: 'ml-bind'
}

module.exports = bind;

function bind(scopeEl) {
	var scopeEl = scopeEl || document.body
		, components = {};

	// iterate children of scopeEl
	Array.prototype.forEach.call(scopeEl.children, bindElement);

	return components;

	function bindElement(el){
		var attr = new Attribute(el, opts.BIND_ATTR);

		var aComponent = createComponent(el, attr);

		// bind inner elements to components
		var innerComponents = bind(el);

		// attach inner components to the current one (create a new scope) ...
		if (typeof aComponent != 'undefined' && aComponent.container)
			aComponent.container.add(innerComponents);
		else // or keep them in the current scope
			_.eachKey(innerComponents, storeComponent);

		if (aComponent)
			storeComponent(aComponent, attr.name);
	}

	function createComponent(el, attr) {
		if (attr.node) { // element will be bound to a component
			attr.parse().validate();
		
			// get component class from registry and validate
			var ComponentClass = componentsRegistry.get(attr.compClass);
			if (! ComponentClass)
				throw new BindError('class ' + attr.compClass + ' is not registered');
			console.log(ComponentClass);
			check(ComponentClass, Match.Subclass(Component, true));
	
			// create new component
			return new ComponentClass({}, el);
		}
	}


	function storeComponent(aComponent, name) {
		if (components[name])
			throw new BindError('duplicate component name: ' + name);

		components[name] = aComponent;
	}
}


bind.config = function(options) {
	opts.extend(options);
};