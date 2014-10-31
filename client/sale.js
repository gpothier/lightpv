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

saleTotal = function() {
	return Math.round(saleSubtotal() * (100-Session.get("discount"))/100);
};

Template.sale.helpers({
	subtotal: saleSubtotal,
	discount: function() {
		return Session.get("discount");
	},
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
	var total = 0;
	var items = CartItems.find().map(function(item) {
		total += item.total();
		return {product: item.product._id, price: item.product.price, qty: item.qty, timestamp: item.timestamp};
	});
	var discount = Session.get("discount");
	total = Math.round(total * (100-discount)/100);
	
	if (total == 0) {
		alert("Carro vacío!");
		return;
	}

	Meteor.call("createSale", items, discount, total, paymentMethod, function(error, result) {
		if (error) {
			alert("No se pudo confirmar la venta: "+error);
		} else {
			resetCart({});
		}
	});
};

cancelSale = function() {
	resetCart();
};

function resetCart() {
	CartItems.remove({});
	$("#discount-selector").val("0");
	Session.set("discount", 0);
}
