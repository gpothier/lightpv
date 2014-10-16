Meteor.startup(function() {
    Session.set("handedCash", 0);
});

confirmCashSale = function() {
	Session.set("handedCash", 0);
	Session.set("disableScanner", true);
	AntiModals.overlay("confirmCash", {
		modal: true,
	});
	$("#handed-cash").focus();
};

Template.confirmCash.change = function() {
    return Session.get("handedCash") - Template.sale.total();
};
 
Template.confirmCash.events({
    "keyup #handed-cash": function (event) {
        var value = $(event.target).val();
        Session.set("handedCash", parseInt(value));
    },
     
    "click #confirm-cash-cancel": function(event) {
        AntiModals.dismissOverlay(event.target, null, null);
        Session.set("disableScanner", false);
    },
     
    "click #confirm-cash-ok": function (event) {
        AntiModals.dismissOverlay(event.target, null, null);
        Session.set("disableScanner", false);
        saveSale("cash");
    }
});