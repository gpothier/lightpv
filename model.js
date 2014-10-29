
/*
	Products
	--------
	(_id: prestashop product id)
	name: product name
	ean13: EAN13 code of the product
	price: product price
*/
Product = function (doc) {
	_.extend(this, doc);
	this.localImageUrl = "/files/"+this._id;
};
_.extend(Product.prototype, {
	
});

Products = new Mongo.Collection("products", {
	transform: function (doc) { return new Product(doc); }
});

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
		price: price of the product at the time the order was taken
		qty
	discount: discount percentage
	total: total value of the sale (should match items+discount)
	slip: number of the sales slip
	pushed: boolean that indicates if the sale has been pushed to the server
*/
Sale = function (doc) {
	_.extend(this, doc);
};
_.extend(Sale.prototype, {
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
	var p = Parameters.findOne({name: name});
	return p ? p.value : null;
};

setParameter = function(name, value) {
	if (Meteor.isServer) {
		Parameters.update(
					{name: name},
					{$set: {value: value}},
					{upsert: true});
	} else {
		Meteor.call("setParameter", name, value);
	}
};
