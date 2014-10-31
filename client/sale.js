Meteor.startup(function() {
	Session.set("discount", 0);
	Meteor.autorun(function() {
		var t = getParameter("currentTime");
		Meteor.subscribe("daySales", t);
	});
});

/*
	SaleItem
	--------
	timestamp
	product
	qty
*/
CartItem = function (doc) {
	_.extend(this, doc);
};
_.extend(CartItem.prototype, {
	total: function () {
		return this.product.price * this.qty;
	}
});

CartItems = new Mongo.Collection(null, {
	transform: function (doc) { return new CartItem(doc); }
});

Template.cart.helpers({
	items: function () {
		return CartItems.find({}, {sort: {timestamp: -1}});
	}
});

Template.cart.events({
	"click .dec button": function (event) {
		incItemQty(this, -1);
	},
	"click .inc button": function (event) {
		incItemQty(this, 1);
	},
	"click .remove button": function (event) {
		removeItem(this);
	}
});

addToCart = function(product) {
	var item = findItemByProduct(product);
	if (item) {
		incItemQty(item, 1);
	} else {
		CartItems.insert({product: product, qty: 1, timestamp: new Date()});
	}
};

function findItemByProduct(product) {
	var result = null;
	CartItems.find().forEach(function(item) {
		if (item.product._id == product._id) result = item;
	});
	return result;
}

addToCartByEan13 = function(ean13) {
	console.log("Trying to add: "+ean13);
	var product = findProductByEan13(ean13);
	if (product) {
		addToCart(product);
		playSound("beep-07.mp3");
	} else {
		playSound("beep-03.mp3");
	}
};

function findProductByEan13(ean13) {
	if (ean13.length < 8) return null;
	var result = null;
	Products.find().forEach(function(product) {
		if (product.ean13 == ean13) result = product;
	});
	return result;
}

incItemQty = function(item, amount) {
	if (item.qty + amount < 1) return;
	CartItems.update(item, {$inc: {qty: amount}, $set: {timestamp: new Date()}});
};

removeItem = function(item) {
	CartItems.remove(item);
};

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

Template.daySales.helpers({
	dayTotal: function(paymentMethod) {
		var filter = paymentMethod ? {paymentMethod: paymentMethod} : {};
		var total = 0;
		Sales.find(filter).forEach(function(sale) {
			total += sale.total
		});
		return total;
	},
	sales: function () {
		return Sales.find({}, {sort: {timestamp: -1}});
	}
});
