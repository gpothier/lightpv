Meteor.startup(function() {
    Session.set("handedCash", 0);
});
 
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
    },
     
    "click #confirm-cash-ok": function (event) {
        AntiModals.dismissOverlay(event.target, null, null);
        saveSale("cash");
    }
});