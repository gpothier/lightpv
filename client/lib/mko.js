mko = {};

function isMko(field) {
	return field ? field["_mko"] : null;
}

// We need to redefine these so that our custom observables can be used in bindings.
var ko_isObservable = ko.isObservable;
ko.isObservable = function(obj) {
	return ko_isObservable(obj) || isMko(obj);
};

var ko_isWriteableObservable = ko.isWriteableObservable;
ko.isWriteableObservable = function(obj) {
	return ko_isWriteableObservable(obj) || isMko(obj);
};

mko.paramObservable = function(name) {
	var observable = ko.observableArray();
	
	Meteor.autorun(function() {
		var value = getParameter(name);
		observable(value);
	});
	
	var set = function(value) {
		setParameter(name, value);
	};
	
	var wrapper = function() {
		if (arguments.length > 0) {
			var value = arguments[0];
			set(value);
		} else {
			return observable();
		}
	};
		
	wrapper.peek = observable.peek;
	
	wrapper._mko = true;
	
	return wrapper;
};



mko.collectionObservable = function(collection, query) {
	var observable = ko.observableArray();
	
	Meteor.autorun(function() {
		var items = collection.find(query).fetch();
		observable(items);
	});
	
	var set = function(value) {
		throw new Meteor.Error("Not supported yet");
	};
	
	var wrapper = function() {
		if (arguments.length > 0) {
			var value = arguments[0];
			set(value);
		} else {
			return observable();
		}
	};
	
	wrapper.indexOf = function(value) {
		return observable.indexOf(value);
	};

	wrapper.push = function(value) {
		throw new Meteor.Error("Not supported yet");
	};
	
	wrapper.remove = function(value) {
		throw new Meteor.Error("Not supported yet");
	};
		
	wrapper.peek = observable.peek;
	
	wrapper._mko = true;
	
	return wrapper;
};

