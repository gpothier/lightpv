Meteor.startup(function() {
	Session.set("scannerInput", "");
	Session.set("enableScanner", false);
	Meteor.subscribe("parameters");
	Meteor.subscribe("clients");
});

Accounts.ui.config({
	 passwordSignupFields: "USERNAME_ONLY"
});

filters = {};
filters.admin = function(pause) {
	if (! Roles.userIsInRole(Meteor.user(), "admin")) {
		this.render("forbidden");
		pause();
	}
};	

Router.configure({
	loadingTemplate: "loading",
	layoutTemplate: "lightpv-layout"	
});

Router.onBeforeAction(function(pause) {
	if (!this.ready()) {
		this.render("loading");
		pause();
	}
});

Router.map(function () {
	this.route("home", {
		path: "/"
	});

	this.route("admin", {
		path: "/admin",
		onBeforeAction: filters.admin,
		waitOn: function () {
			return Meteor.subscribe("stores");
		}
	});
});

Template.body.rendered = function() {
	$("body").on("keydown",function(event) {
		if (! Session.get("enableScanner")) {
			Session.set("scannerInput", "");
			return;
		}

		var d = getDigit(event);
		if (d >= 0 && d <= 9) {
			Session.set("scannerInput", Session.get("scannerInput") + d);
		} else if (d == 13) {
			event.preventDefault();
			var code = Session.get("scannerInput");
			if (code) addToCartByEan13(code);
			Session.set("scannerInput", "");
			var sb = $("#search");
			if (sb.is(":focus")) sb.val("");
		}
		else Session.set("scannerInput", "");
	});
};

Template.cart.rendered = function() {
	Session.set("enableScanner", true);
};

Template.cart.destroyed = function() {
	Session.set("enableScanner", false);
};


function getDigit(event) {
	var c = event.keyCode|event.charCode;
	if (c >= 48 && c <= 57) return c-48;
	else if (c >= 96 && c <= 105) return c-96;
	else if (c == 13) return 13;
	else return -1;
}
