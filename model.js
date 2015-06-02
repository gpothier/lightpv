
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
	ClientEvents
	--------
	Represents events that occur at the TPV, such as opening or closing
	
	clientId: client id
	userId: id of the user that generated the event
	timestamp 
	event: opening|closing|withdrawal
	cash: amount of cash of the event
	pushed: boolean that indicates if the event has been pushed to the server
 */
ClientEvents = new Mongo.Collection("clientEvents");

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
	promotions: [(promotionId, timesApplied, discountValue), ...]
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
StockUpdate
----
store: store id
client: client id
user: user id
timestamp
serverTimestamp
items[]
	product: product id
	qty
pushed: boolean that indicates if the update has been pushed to the server
*/
StockUpdates = new Mongo.Collection("stockUpdate");


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

/*
 * See doc in lightpv-server
 */
Promotions = new Mongo.Collection("promotions");