Meteor.startup(function() {
	Session.set("scannerInput", "");
	Session.set("enableScanner", false);
	Meteor.subscribe("parameters");
	Meteor.subscribe("clients");
	Meteor.subscribe("promotions");
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

filters.loggedin = function(pause) {
	if (! Meteor.userId()) {
		this.render("login");
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
		path: "/",
		onBeforeAction: filters.loggedin,
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


function getDigit(event) {
	var c = event.keyCode|event.charCode;
	if (c >= 48 && c <= 57) return c-48;
	else if (c >= 96 && c <= 105) return c-96;
	else if (c == 13) return 13;
	else return -1;
}


function ClientViewModel() {
	this.currentUserId = mko.paramObservable("currentUserId");
	this.currentUser = ko.computed(function() {
		return this.currentUserId() ? Meteor.users.findOne(this.currentUserId()) : null;
	}.bind(this));
	
	this.loggedInUserId = ko.observable();
	Meteor.autorun(function() {
		this.loggedInUserId(Meteor.userId());
	}.bind(this));
	
	// Flag that indicates if the logged in user us the current user
	// of the client
	this.openByCurrentUser = ko.computed(function() {
		return this.currentUserId() && 
			this.currentUserId() == this.loggedInUserId();
	}.bind(this));
	
	this.openClient = function() {
		openClientDialog();
	}.bind(this);
	
	this.closeClient = function() {
		closeClientDialog();
	}.bind(this);
	
	this.withdraw = function() {
		withdrawDialog();
	}.bind(this);
}

Meteor.startup(function() {
	clientViewModel = new ClientViewModel();

	Template.home.rendered = function() {
		ko.applyBindings(clientViewModel, $("#home")[0]);
	};
	Template.home.destroyed = function() {
		ko.cleanNode($("#home")[0]); 
	};
});	
