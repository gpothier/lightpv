var request = Meteor.npmRequire("request");
var fs = Meteor.npmRequire("fs");
var mkdirp = Meteor.npmRequire("mkdirp");
var os = Meteor.npmRequire("os");
var md5 = Meteor.npmRequire("MD5");
var winston = Meteor.npmRequire("winston");

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

var logger = new (winston.Logger)({
	transports: [new (winston.transports.Console)({ timestamp: true })]
});

LighTPV = {};

Meteor.startup(function () {
	logger.info("Hostname: "+os.hostname());
	
	mkdirp(IMAGES_DIR);
	
	LighTPV.config = {
		"server": "http://localhost:3002",
		"hostname": os.hostname()
	};
	
	if (process.env.LIGHTPV_SERVER) {
		LighTPV.config.server = process.env.LIGHTPV_SERVER;
	}
		
	Meteor.publish("stores", function () {
		return Stores.find();
	});
	
	if (Meteor.users.find().count() === 0) {
		logger.info("Adding initial admin data");
		var id = Accounts.createUser({
			username:"admin",
			email:"admin@luki.cl",
			password:"admin2550",
			admin: true,
			profile: {name:"Administrator"}});
		Roles.addUsersToRoles(id, ["admin", "manage-users"]);
	}
	
	LighTPV.serverConnection = DDP.connect(LighTPV.config.server); 

	Meteor.publish("products", function () {
		return Products.find();
	});
	
	Meteor.publish("daySales", function (date) {
		if (! date) return null;
	
		date.setHours(0, 0, 0, 0);
		return Sales.find({user: this.userId, timestamp: {$gte: date}});
	});
	
	Meteor.publish("parameters", function() {
		return Parameters.find();
	});
	
	Meteor.publish("promotions", function () {
		return Promotions.find();
	});
	
	setParameter("currentTime", new Date());
	Meteor.setInterval(function() {
		setParameter("currentTime", new Date());
	}, 10*1000);
	
	// On the client we must have a single Client object
	LighTPV.client = getParameter("client");
	
	Meteor.setTimeout(LighTPV.updateAll, 0);
});

function checkLocalPassword(password) {
	if (md5(password) != "b439391e3488ab91764613a54df64423") throw new Meteor.Error("Invalid password");
}

Meteor.methods({
	setParameter: function(name, value) {
		setParameter(name, value);
	},
	
	registerClient: function(password) {
		if (! Roles.userIsInRole(Meteor.user(), "admin")) throw new Meteor.Error("No autenticado");
		var client = LighTPV.serverConnection.call("registerClientOnServer", LighTPV.config.hostname, password);
		LighTPV.client = client;
		setParameter("client", LighTPV.client);
		LighTPV.updateAll();
	},
	
	createSale: function (timestamp, items, promotions, discount, total, paymentMethod) {
		if (! Meteor.userId()) throw new Meteor.Error("No autenticado");
		if (discount > 15) throw new Meteor.Error("Invalid discount");

		var total_ref = 0;

		items.forEach(function(item) {
			var product = Products.findOne(item.product);
			if (item.price != product.price) throw new Meteor.Error("Invalid item price");
			var subtotal = item.qty * item.price;
			total_ref += subtotal;
		});
		
		var promotions_ref = appliedPromotions(timestamp, items);
		if (promotions_ref.length != promotions.length) throw new Meteor.Error("Number of promotions do not match");
		
		for (var i=0;i<promotions_ref.length;i++) {
			var promo_ref = promotions_ref[i];
			var promo = promotions[i];
			if (promo_ref.promotion._id != promo.promotionId) 
				throw new Meteor.Error("Promotion id mismatch: expected "+promo_ref.promotion._id+", got: "+promo.promotionId);
			if (promo_ref.timesApplied != promo.timesApplied) 
				throw new Meteor.Error("Promotion timesApplied mismatch: expected: "+promo_ref.timesApplied+", got: "+promo.timesApplied);
			if (promo_ref.discountValue != promo.discountValue) 
				throw new Meteor.Error("Promotion discountValue mismatch: expected: "+promo_ref.discountValue+", got: "+promo.discountValue);
			total_ref -= promo_ref.discountValue;
		}
		
		total_ref = Math.round(total_ref * (100-discount)/100);
		if (total_ref != total) throw new Meteor.Error("Totals do not match: "+total+" != "+total_ref);

		var sale = {
			user: Meteor.userId(),
			client: LighTPV.client ? LighTPV.client._id : null,
			store: getParameter("store"),
			timestamp: timestamp,
			items: items,
			discount: discount,
			promotions: promotions,
			total: total,
			paymentMethod: paymentMethod};
		logger.info("Adding sale", sale);

		Sales.insert(sale);
		return true;
	},
	
	createStockUpdate: function (timestamp, comment, items) {
		if (! Meteor.userId()) throw new Meteor.Error("No autenticado");

		var update = {
			user: Meteor.userId(),
			client: LighTPV.client ? LighTPV.client._id : null,
			store: getParameter("store"),
			comment: comment,
			timestamp: timestamp,
			items: items
		};
		logger.info("Adding stock update", update);

		StockUpdates.insert(update);
		return true;
	},
	
	openClient: function(cash) {
		if (! Meteor.userId()) throw new Meteor.Error("No autenticado");
		if (! LighTPV.client) throw new Meteor.Error("Cliente no asociado");
		
		var event = {
			clientId: LighTPV.client._id,
			userId: Meteor.userId(),
			timestamp: new Date(),
			event: "opening",
			cash: cash
		};
		ClientEvents.insert(event);
		var currentUserId = getParameter("currentUserId");
		if (currentUserId) logger.warn("WARNING: client already open by "+currentUserId);
		setParameter("currentUserId", Meteor.userId());
		
		logger.info("Adding event", event);
	},
	
	closeClient: function(cash) {
		if (! Meteor.userId()) throw new Meteor.Error("No autenticado");
		if (! LighTPV.client) throw new Meteor.Error("Cliente no asociado");
		
		var event = {
			clientId: LighTPV.client._id,
			userId: Meteor.userId(),
			timestamp: new Date(),
			event: "closing",
			cash: cash
		};
		ClientEvents.insert(event);
		var currentUserId = getParameter("currentUserId");
		if (! currentUserId) logger.warn("Client not open");
		if (currentUserId && currentUserId != Meteor.userId()) logger.warn("Client open by other user: "+currentUserId);
		setParameter("currentUserId", null);

		logger.info("Adding event", event);
	},
	
	withdrawCash: function(cash, password) {
		checkLocalPassword(password);
		if (! Meteor.userId()) throw new Meteor.Error("No autenticado");
		if (! LighTPV.client) throw new Meteor.Error("Cliente no asociado");
		
		var event = {
			clientId: LighTPV.client._id,
			userId: Meteor.userId(),
			timestamp: new Date(),
			event: "withdrawal",
			cash: cash
		};
		ClientEvents.insert(event);
		var currentUserId = getParameter("currentUserId");
		if (! currentUserId) logger.warn("Client not open");
		if (currentUserId && currentUserId != Meteor.userId()) logger.warn("Client open by other user: "+currentUserId);

		logger.info("Adding event", event);
	}
});


LighTPV.updateAll = function() {
	LighTPV.migrate();
	LighTPV.pushPending();
	LighTPV.updateStores();
	LighTPV.updateUsers();
	LighTPV.updateRemoteCollections();
};

LighTPV.migrate = function() {
	try {
		Migrations.migrateTo("latest");
	} catch (e) {
		logger.error("Migration failed: "+e);
		Migrations._collection.update({_id:"control"}, {$set:{"locked":false}});
	}
};

LighTPV.pushPending = function() {
	if (! LighTPV.client) {
		logger.info("Client not associated, skipping pushPending ");
		return;
	}
	
	if (LighTPV._pushPendingTimeout) Meteor.clearTimeout(LighTPV._pushPendingTimeout);
	
	try {
		var sales = Sales.find(
			{ $or: [{"pushed": false }, {"pushed": {"$exists": false}}] },
			{sort: {timestamp: 1}}).fetch();
		
		// Check that all sales have a store and a client
		var storeId = getParameter("store");
		for (var i=0;i<sales.length;i++) {
			var sale = sales[i];
			if (! sale.store) {
				if (! storeId) throw new Meteor.Error("Some sales have no store, must set global store");
				logger.warn("Assigning current store to incomplete sale");
				sale.store = storeId;
			}
			if (! sale.client) {
				logger.warn("Assigning current client to incomplete sale");
				sale.client = LighTPV.client._id;
			}
		}
		
		var events = ClientEvents.find(
			{ $or: [{"pushed": false }, {"pushed": {"$exists": false}}] },
			{sort: {timestamp: 1}}).fetch();
		
		var stockUpdates = StockUpdates.find(
				{ $or: [{"pushed": false }, {"pushed": {"$exists": false}}] },
				{sort: {timestamp: 1}}).fetch();
			
		// Push even if no pending sales, so that the server knows the client is alive
		logger.debug("Push: "+sales.length+" sales, "
				+events.length+" events, "
				+stockUpdates.length+" stock updates");
		
		var result = LighTPV.serverConnection.call(
			"push", 
			LighTPV.client._id, 
			LighTPV.client.token,
			getParameter("store"), 
			sales, 
			events,
			stockUpdates);
			
		var pushedSales = result.sales;
		var pushedEvents = result.events;
		var pushedStockUpdates = result.stockUpdates;
		
		logger.debug("Successfully pushed: "+pushedSales.length+" sales, "
				+pushedEvents.length+" events, "
				+pushedStockUpdates.length+" stock updates");
		
		for(var i=0;i<pushedSales.length;i++) {
			Sales.update(pushedSales[i], {$set: {pushed: true}});
		}
		for(var i=0;i<pushedEvents.length;i++) {
			ClientEvents.update(pushedEvents[i], {$set: {pushed: true}});
		}
		for(var i=0;i<pushedStockUpdates.length;i++) {
			StockUpdates.update(pushedStockUpdates[i], {$set: {pushed: true}});
		}
		
		setParameter("lastPush", new Date());
	} catch(e) {
		logger.error("Error while pushing sales and events: "+e);
	}
	// Reschedule push (not using setInterval to avoid overlapping calls)
	LighTPV._pushPendingTimeout = Meteor.setTimeout(LighTPV.pushPending, 10*1000);
};

LighTPV.updateStores = function() {
	if (! LighTPV.client) {
		logger.warn("Client not associated, skipping store update");
		return;
	}
	LighTPV.serverConnection.call("getStores", LighTPV.client._id, LighTPV.client.token, function(error, result) {
		if (error) {
			logger.error("Error while getting stores: "+error);
			return;
		} 
		
		logger.info("Updating "+result.length+" stores");
		
		for(var i=0;i<result.length;i++) {
			var store = result[i];
			var id = store._id;
			delete store["_id"];
			
			Stores.update(id, {$set: store}, {upsert: true});
		}
	});
};

LighTPV.updateUsers = function() {
	if (! LighTPV.client) {
		logger.warn("Client not associated, skipping users update");
		return;
	}
	var localUsers = [];
	Meteor.users.find().forEach(function(user) {
		if (! Roles.userIsInRole(user, "admin")) localUsers.push(user);
	});
	
	LighTPV.serverConnection.call("updateUsers", LighTPV.client._id, LighTPV.client.token, localUsers, function(error, result) {
		if (error) {
			logger.error("Error while updating users: "+error);
			return;
		} 
		
		logger.info("Updating "+result.length+" users");
		
		for(var i=0;i<result.length;i++) {
			var user = result[i];
			if (Roles.userIsInRole(user, "admin")) throw new Meteor.Error("Attempting to add admin user");
			
			var id = user._id;
			delete user["_id"];

			Meteor.users.update(id, {$set: user}, {upsert: true});
		}
	});
};

LighTPV.updateRemoteCollections = function() {
	if (LighTPV._updateRemoteCollectionsTimeout) Meteor.clearTimeout(LighTPV._updateRemoteCollectionsTimeout);
	try {
		var remoteCollectionsVersion = LighTPV.serverConnection.call("getCollectionsVersions", LighTPV.client._id, LighTPV.client.token);
		
		logger.info("Remote collections versions: "+JSON.stringify(remoteCollectionsVersion));
		
		if (remoteCollectionsVersion["products"] > getParameter("productsVersion", 0)) 
			LighTPV.updateProducts();
			
		if (remoteCollectionsVersion["promotions"] > getParameter("promotionsVersion", 0)) 
			LighTPV.updatePromotions();
			
			
	} catch(e) {
		logger.error("Error while updating collections: "+e);
	}
	
	// Reschedule update (not using setInterval to avoid overlapping calls)
	LighTPV._updateRemoteCollectionsTimeout = Meteor.setTimeout(LighTPV.updateRemoteCollections, 60*1000);
};

LighTPV.updateProducts = function() {
	try {
		logger.info("Updating products...");
		
		var coll = LighTPV.serverConnection.call("getProductsCollections", LighTPV.client._id, LighTPV.client.token);
		var products = coll.products;
		logger.info("    Received "+products.length+" products");
		
		Products.update({}, { $set: { marked: true } }, { multi: true });
		
		for(var i=0;i<products.length;i++) {
			var product = products[i];
			var id = product._id;
			delete product["_id"];
			
			Products.update(id, {$set: product, $unset: { marked: "" }}, {upsert: true});
		}
		
		var toRemove = Products.find({marked: true}).fetch();
		logger.info("    Removing "+toRemove.length+" products", toRemove);
		Products.remove({marked: true});
		
		setParameter("productsVersion", coll.version);
		logger.info("    Updated products to version "+coll.version);
		
		Meteor.setTimeout(LighTPV.updateImages, 0);
	} catch(e) {
		logger.error("Error while updating products: "+e);
	}
};


LighTPV.updateImages = function() {
	logger.info("Updating images...");

	var count = Products.find().count();
	
	function countDown() {
		count -= 1;
		if (count == 0) logger.info("    Done updating images.");
	}
	 
	Products.find().forEach(function(product) {
		if (product.image_url) {
			request.get(product.image_url,
				{ "auth": {"user": key, "pass": "", "sendImmediately": false },
				"encoding": null },
				function(error, response, body) {
					
				countDown();
				if (!error && response.statusCode == 200) {
					try {
						fs.writeFile(IMAGES_DIR+"/"+product._id+".jpg", body);
					} catch(e) {
						logger.error(e);
					}
				}
			});
		} else countDown();
	});
};

LighTPV.updatePromotions = function() {
	try {
		logger.info("Updating promotions...");
		
		var coll = LighTPV.serverConnection.call("getPromotionsCollection", LighTPV.client._id, LighTPV.client.token);
		var promotions = coll.promotions;
		logger.info("    Received "+promotions.length+" promotions");
		
		Promotions.update({}, { $set: { marked: true } }, { multi: true });
		
		for(var i=0;i<promotions.length;i++) {
			var promo = promotions[i];
			var id = promo._id;
			delete promo["_id"];
			
			Promotions.update(id, {$set: promo, $unset: { marked: "" }}, {upsert: true});
		}
		
		var toRemove = Promotions.find({marked: true}).fetch();
		logger.info("    Removing "+toRemove.length+" promotions", toRemove);
		Promotions.remove({marked: true});
		
		setParameter("promotionsVersion", coll.version);
		logger.info("    Updated promotions to version "+coll.version);
	} catch(e) {
		logger.error("Error while updating promotions: "+e);
	}
};
