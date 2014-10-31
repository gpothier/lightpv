Template.cart.rendered = function() {
	Session.set("enableScanner", true);
};

Template.cart.destroyed = function() {
	Session.set("enableScanner", false);
};

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
