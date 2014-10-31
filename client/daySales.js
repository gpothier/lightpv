Meteor.startup(function() {
	Meteor.autorun(function() {
		var t = getParameter("currentTime");
		Meteor.subscribe("daySales", t);
	});
});



Template.daySales.helpers({
	dayTotal: function(paymentMethod) {
		var filter = paymentMethod ? {paymentMethod: paymentMethod} : {};
		var total = 0;
		Sales.find(filter).forEach(function(sale) {
			total += sale.total();
		});
		return total;
	},
	sales: function () {
		return Sales.find({}, {sort: {timestamp: -1}});
	}
});