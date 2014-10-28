Meteor.startup(function() {
    Session.set("handedCash", 0);
});

confirmCashSale = function() {
	Session.set("handedCash", 0);
	Session.set("enableScanner", false);
	AntiModals.overlay("confirmCash", {
		modal: true,
	});
	$("#handed-cash").focus();
};

Template.confirmCash.helpers({
	change: function() {
	    return Session.get("handedCash") - saleTotal();
	}
});
 
Template.confirmCash.events({
    "keyup #handed-cash": function (event) {
        var value = $(event.target).val();
        Session.set("handedCash", parseInt(value));
    },
     
    "click #confirm-cash-cancel": function(event) {
        AntiModals.dismissOverlay(event.target, null, null);
        Session.set("enableScanner", true);
    },
     
    "click #confirm-cash-ok": function (event) {
        AntiModals.dismissOverlay(event.target, null, null);
        Session.set("enableScanner", true);
        saveSale("cash");
    }
});