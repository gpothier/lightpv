
/*
	Products
	--------
	ps_id: prestashop product id
	name: product name
	ean13: EAN13 code of the product
	price: product price
*/
Products = new Mongo.Collection("products");

/*
	Stores
	--------
	name
	users[]: ids of allowed users
 */
Stores = new Mongo.Collection("stores");

/*
	Sale
	----
	store: store id
	client: client id
	user: user id
	timestamp
	items[]
		product: product id
		qty
	discount: discount percentage
	slip: number of the sales slip
	pushed: boolean that indicates if the sale has been pushed to the server
*/
Sale = function (doc) {
	_.extend(this, doc);
};
_.extend(Sale.prototype, {
	total: function () {
		var total = 0;
		this.items.forEach(function(item) {
			var product = Products.findOne(item.product);
			total += item.qty * product.price;
		});
		return Math.round(total * (100-this.discount)/100);
	}
});

Sales = new Mongo.Collection("sales", {
	transform: function (doc) { return new Sale(doc); }
});

/*
	Parameter
	---------
	Used to store key-value pairs.
	
	name
	value
*/
Parameters = new Mongo.Collection("parameters");

getParameter = function(name) {
	var p = Parameters.find({name: name}).fetch();
	return p.length > 0 ? p[0].value : null;
};

setParameter = function(name, value) {
	console.log("Setting parameter "+name+" = "+JSON.stringify(value));
	if (Meteor.isServer) {
		Parameters.update(
					{name: name},
					{$set: {value: value}},
					{upsert: true});
	} else {
		Meteor.call("setParameter", name, value);
	}
};
