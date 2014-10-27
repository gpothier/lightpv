Template.admin.helpers({
	client: function () {
		return getParameter("client");
	}
}); 

Template.admin.events({
	"click #associate": function (event) {
		var pw = $("#associate-password").val();
		Meteor.call("registerClient", pw, function(error, result) {
			if (error) {
				alert("No se pudo registrar: "+error);
				return;
			}
		});
	},
	"click #dissociate": function (event) {
		setParameter("client", null);
	}
});

function AdminViewModel() {
	this.currentStore = mko.paramObservable("store");
	this.stores = mko.collectionObservable(Stores, {});
}

Template.admin.rendered = function() {
	var adminViewModel = new AdminViewModel();
	ko.applyBindings(adminViewModel, $("#admin")[0]);
};
