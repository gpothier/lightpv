var request = Meteor.npmRequire("request");
var fs = Meteor.npmRequire("fs");
var mkdirp = Meteor.npmRequire("mkdirp");
var os = Meteor.npmRequire("os");
var md5 = Meteor.npmRequire("MD5");

LighTPV = {};

Meteor.startup(function () {
	console.log("Hostname: "+os.hostname());
	
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
		console.log("Adding initial admin data");
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
	
	setParameter("currentTime", new Date());
	Meteor.setInterval(function() {
		setParameter("currentTime", new Date());
	}, 10*1000);
	
	// On the client we must have a single Client object
	LighTPV.client = getParameter("client");
	
	LighTPV.updateAll();
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
	
	createSale: function (items, discount, total, paymentMethod) {
		if (! Meteor.userId()) throw new Meteor.Error("No autenticado");
		if (discount > 15) throw new Meteor.Error("Invalid discount");

		var total_ref = 0;

		items.forEach(function(item) {
			var product = Products.findOne(item.product);
			if (item.price != product.price) throw new Meteor.Error("Invalid item price");
			var subtotal = item.qty * item.price;
			total_ref += subtotal;
		});
		total_ref = Math.round(total_ref * (100-discount)/100);
		if (total_ref != total) throw new Meteor.Error("Totals do not match: "+total+" != "+total_ref);

		var ts = new Date();
		var sale = {
			user: Meteor.userId(),
			client: LighTPV.client ? LighTPV.client._id : null,
			store: getParameter("store"),
			timestamp: ts,
			items: items,
			discount: discount,
			total: total,
			paymentMethod: paymentMethod};
		console.log("Adding sale: "+JSON.stringify(sale));

		Sales.insert(sale);
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
		if (currentUserId) console.log("WARNING: client already open by "+currentUserId);
		setParameter("currentUserId", Meteor.userId());
		
		console.log("Adding event: "+JSON.stringify(event));
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
		if (! currentUserId) console.log("WARNING: client not open");
		if (currentUserId && currentUserId != Meteor.userId()) console.log("WARNING: client open by other user: "+currentUserId);
		setParameter("currentUserId", null);

		console.log("Adding event: "+JSON.stringify(event));
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
		if (! currentUserId) console.log("WARNING: client not open");
		if (currentUserId && currentUserId != Meteor.userId()) console.log("WARNING: client open by other user: "+currentUserId);

		console.log("Adding event: "+JSON.stringify(event));
	}
});


LighTPV.updateAll = function() {
	LighTPV.migrate();
	LighTPV.pushPending();
	LighTPV.updateStores();
	LighTPV.updateUsers();
	LighTPV.updateProducts();
};

LighTPV.migrate = function() {
	try {
		Migrations.migrateTo("latest");
	} catch (e) {
		console.log("Migration failed: "+e);
		Migrations._collection.update({_id:"control"}, {$set:{"locked":false}});
	}
};

LighTPV.pushPending = function() {
	if (! LighTPV.client) {
		console.log("Client not associated, skipping pushPending ");
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
				console.log("Assigning current store to incomplete sale");
				sale.store = storeId;
			}
			if (! sale.client) {
				console.log("Assigning current client to incomplete sale");
				sale.client = LighTPV.client._id;
			}
		}
		
		var events = ClientEvents.find(
			{ $or: [{"pushed": false }, {"pushed": {"$exists": false}}] },
			{sort: {timestamp: 1}}).fetch();
		
		// Push even if no pending sales, so that the server knows the client is alive
		console.log("Pushing "+sales.length+" sales and "+events.length+" events.");
		
		var result = LighTPV.serverConnection.call(
			"push", 
			LighTPV.client._id, 
			LighTPV.client.token,
			getParameter("store"), 
			sales, 
			events);
			
		var pushedSales = result.sales;
		var pushedEvents = result.events;
		
		console.log("Successfully pushed "+pushedSales.length+" sales and "+pushedEvents.length+" events.");
		
		for(var i=0;i<pushedSales.length;i++) {
			Sales.update(pushedSales[i], {$set: {pushed: true}});
		}
		for(var i=0;i<pushedEvents.length;i++) {
			ClientEvents.update(pushedEvents[i], {$set: {pushed: true}});
		}
		
		setParameter("lastPush", new Date());
	} catch(e) {
		console.log("Error while pushing sales and events: "+e);
	}
	// Reschedule push (not using setInterval to avoid overlapping calls)
	LighTPV._pushPendingTimeout = Meteor.setTimeout(LighTPV.pushPending, 10*1000);
};

LighTPV.updateStores = function() {
	if (! LighTPV.client) {
		console.log("Client not associated, skipping store update");
		return;
	}
	LighTPV.serverConnection.call("getStores", LighTPV.client._id, LighTPV.client.token, function(error, result) {
		if (error) {
			console.log("Error while getting stores: "+error);
			return;
		} 
		
		console.log("Updating "+result.length+" stores");
		
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
		console.log("Client not associated, skipping users update");
		return;
	}
	var localUsers = [];
	Meteor.users.find().forEach(function(user) {
		if (! Roles.userIsInRole(user, "admin")) localUsers.push(user);
	});
	
	LighTPV.serverConnection.call("updateUsers", LighTPV.client._id, LighTPV.client.token, localUsers, function(error, result) {
		if (error) {
			console.log("Error while updating users: "+error);
			return;
		} 
		
		console.log("Updating "+result.length+" users");
		
		for(var i=0;i<result.length;i++) {
			var user = result[i];
			if (Roles.userIsInRole(user, "admin")) throw new Meteor.Error("Attempting to add admin user");
			
			var id = user._id;
			delete user["_id"];

			Meteor.users.update(id, {$set: user}, {upsert: true});
		}
	});
};

LighTPV.updateProducts = function() {
	if (LighTPV._updateProductsTimeout) Meteor.clearTimeout(LighTPV._updateProductsTimeout);
	try {
		var localCatalogVersion = getParameter("catalogVersion");
		if (!localCatalogVersion) localCatalogVersion = 0;
		var remoteCatalogVersion = LighTPV.serverConnection.call("getCatalogVersion");
		
		if (remoteCatalogVersion > localCatalogVersion) {
			console.log("Updating catalog (remote version: "+remoteCatalogVersion+", local version: "+localCatalogVersion+")");
			
			var catalog = LighTPV.serverConnection.call("getCatalog");
			var products = catalog.products;
			
			Products.update({}, { $set: { marked: true } }, { multi: true });
			
			for(var i=0;i<products.length;i++) {
				var product = products[i];
				var id = product._id;
				delete product["_id"];
				
				Products.update(id, {$set: product, $unset: { marked: "" }}, {upsert: true});
			}
			
			var toRemove = Products.find({marked: true}).fetch();
			console.log("Removing "+toRemove.length+" products");
			toRemove.forEach(function(product) {
				console.log("    "+JSON.stringify(product));
			});
			Products.remove({marked: true});
			
			setParameter("catalogVersion", catalog.version);
			console.log("Updated catalog to version "+catalog.version);
			
			Meteor.setTimeout(LighTPV.updateImages, 0);
		} else {
			console.log("Not updating catalog, already at latest version: "+localCatalogVersion);
		}
	} catch(e) {
		console.log("Error while updating catalog: "+e);
	}
	
	// Reschedule push (not using setInterval to avoid overlapping calls)
	LighTPV._updateProductsTimeout = Meteor.setTimeout(LighTPV.updateProducts, 60*1000);
};


LighTPV.updateImages = function() {
	console.log("Updating images...");

	var count = Products.find().count();
	
	function countDown() {
		count -= 1;
		if (count == 0) console.log("Done updating images.");
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
						console.log(e);
					}
				}
			});
		} else countDown();
	});
};

