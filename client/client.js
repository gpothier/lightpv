Meteor.startup(function() {
	Session.set("scannerInput", "");
	Session.set("disableScanner", false);
	Meteor.subscribe("parameters");
});

Accounts.ui.config({
	 passwordSignupFields: "USERNAME_ONLY"
});

Template.body.rendered = function() {
	$("body").on("keydown",function(event) {
		if (Session.get("disableScanner")) {
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
