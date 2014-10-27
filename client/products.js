Meteor.startup(function() {
	Session.set("loading", true);
	Meteor.subscribe("products", function() {
		Session.set("loading", false);
	});
});

Template.products.helpers({
	products: function () {
		return Products.find();
	},
	searchString: function () {
		return Session.get("searchString");
	},
	matches: function (text) {
		if (! text) return false;
		var s = Session.get("searchString");
		if (! s || s.length < 2) return false;
	
		s = removeDiacritics(s).toUpperCase().split(" ");
		if (s.length == 0) return false;
	
		text = removeDiacritics(text).toUpperCase();
		for(var i=0;i<s.length;i++) {
			var t = s[i];
			if (t.length > 0 && text.indexOf(t) == -1) return false;
		}
		return true;
	}
});

Template.products.events({
	"keyup #search": function (event) {
		var value = $(event.target).val();
		Session.set("searchString", value);
	},
	"click .product": function (event) {
		addToCart(this);
	}
});

