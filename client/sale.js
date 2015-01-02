Meteor.startup(function() {
	Session.set("discount", 0);
});


saleSubtotal = function() {
	var result = 0;
	CartItems.find().forEach(function(item) {
		result += item.total();
	});
	return result;
}; 

currentCartPromotion = function() {
	return appliedPromotions(Session.get("cartStartTime"), CartItems.find().fetch());
};

promotionsTotal = function() {
	var total = 0;
	var ap = currentCartPromotion();
	for(var i=0;i<ap.length;i++) total += ap[i].discountValue;
	return total;
};

discountTotal = function() {
	return (saleSubtotal()-promotionsTotal()) * Session.get("discount")/100;
};

saleTotal = function() {
	var subtotal = saleSubtotal();
	var promos = promotionsTotal();
	var discount = discountTotal();
	return Math.round(subtotal - promos - discount);
};


Template.sale.helpers({
	subtotal: saleSubtotal,
	discount: discountTotal,
	promotions: currentCartPromotion,
	promotionsTotal: promotionsTotal,
	total: saleTotal
});

Template.sale.events({
	"click button#confirm-sale-cash": function (event) {
		confirmCashSale();
	},
	"click button#confirm-sale-card": function (event) {
		confirmCardSale();
	},
	"click button#cancel-sale": function (event) {
		confirmCancelSale();
	},
	"change #discount-selector": function(event) {
		var discount = parseInt($(event.target).val());
		Session.set("discount", discount);
	}
});

function confirmCardSale() {
	var modal = AntiModals.confirm({
		modal: true,
		title: "Confirmar venta con  tarjeta",
		message: "Se aprobó la transacción?",
		ok: "Confirmar",
		cancel: "Anular",
	}, function (error, data) {
		if (data) saveSale("card");
	});
}

function confirmCancelSale() {
	AntiModals.confirm({
		modal: true,
		title: "Confirmar anulación",
		message: "Seguro de vaciar el carro?",
		ok: "Confirmar",
		cancel: "Anular",
	}, function (error, data) {
		if (data) cancelSale();
	});
}

saveSale = function(paymentMethod) {
	if (Session.get("savingSale")) return;
	
	var total = saleTotal();
	if (total == 0) {
		alert("Carro vacío!");
		return;
	}
	
	var items = CartItems.find().map(function(item) {
		return {product: item.product._id, price: item.product.price, qty: item.qty, timestamp: item.timestamp};
	});
	var discount = Session.get("discount");
	var promotions = currentCartPromotion().map(function(ap) {
		return {promotionId: ap.promotion._id, timesApplied: ap.timesApplied, discountValue: ap.discountValue};
	});

	Session.set("savingSale", true);
	Meteor.call("createSale", Session.get("cartStartTime"), items, promotions, discount, total, paymentMethod, function(error, result) {
		if (error) {
			alert("No se pudo confirmar la venta: "+error);
		} else {
			resetCart();
		}
		Session.set("savingSale", false);
	});
};

cancelSale = function() {
	resetCart();
};

