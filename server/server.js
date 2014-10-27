LighTPV = {};

Meteor.startup(function () {
	var os = Meteor.npmRequire("os");
	console.log("Hostname: "+os.hostname());
	
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
		console.log("Setting current time");
		setParameter("currentTime", new Date());
	}, 10*1000);
	
	// On the client we must have a single Client object
	LighTPV.client = getParameter("client");
	
	Meteor.methods({
		setParameter: function(name, value) {
			setParameter(name, value);
		},
		registerClient: function(password) {
			if (! Roles.userIsInRole(Meteor.user(), "admin")) throw new Meteor.Error("No autenticado.");
			var client = LighTPV.serverConnection.call("registerClientOnServer", LighTPV.config.hostname, password);
			LighTPV.client = client;
			setParameter("client", LighTPV.client);
			LighTPV.migrate();
		},
		createSale: function (items, discount, total, paymentMethod) {
			if (! Meteor.userId()) throw new Meteor.Error("No autenticado.");
			if (discount > 10) throw new Meteor.Error("Invalid discount");
	
			var total_ref = 0;
	
			items.forEach(function(item) {
				var product = Products.find(item.product).fetch()[0];
				var subtotal = item.qty * product.price;
				total_ref += subtotal;
			});
			total_ref = Math.round(total_ref * (100-discount)/100);
			if (total_ref != total) throw new Meteor.Error("Totals do not match: "+total+" != "+total_ref);
	
			var ts = new Date();
			console.log("Adding sale ("+ts+"): $"+total+"("+paymentMethod+") ["+Meteor.user().username+"], "+discount+"% - "+JSON.stringify(items));
	
			Sales.insert({
				user: Meteor.userId(),
				client: LighTPV.client ? LighTPV.client._id : null,
				store: getParameter("store"),
				timestamp: ts,
				items: items,
				discount: discount,
				paymentMethod: paymentMethod});
			return true;
		}
	});
	
	LighTPV.migrate();
	LighTPV.pushPendingSales();
	LighTPV.updateStores();
	LighTPV.updateUsers();
});

LighTPV.migrate = function() {
	try {
		Migrations.migrateTo("latest");
	} catch (e) {
		console.log("Migration failed: "+e);
		Migrations._collection.update({_id:"control"}, {$set:{"locked":false}});
	}
};

LighTPV.pushPendingSales = function() {
	if (! LighTPV.client) {
		console.log("Client not associated, skipping push pending sales");
		return;
	}
	var sales = Sales.find({ $or: [{"pushed": false }, {"pushed": {"$exists": false}}] }).fetch();
	
	// Check that all sales have a store and a client
	var storeId = getParameter("store");
	for (var i=0;i<sales.length;i++) {
		var sale = sales[i];
		if (! sale.store) {
			if (! storeId) {
				console.log("Some sales have no store, must set global store");
				return;
			} else {
				console.log("Assigning current store to incomplete sale");
			}
			sale.store = storeId;
		}
		if (! sale.client) {
			console.log("Assigning current client to incomplete sale");
			sale.client = LighTPV.client;
		}
	}
	
	// Push even if no pending sales, so that the server knows the client is alive
	console.log("Pushing "+sales.length+" sales");
	
	LighTPV.serverConnection.call("pushSales", LighTPV.client._id, LighTPV.client.token, sales, function(error, result) {
		if (error) {
			console.log("Error while pushing sales: "+error);
		} else {
			console.log("Successfully pushed sales: "+result.length);
			for(var i=0;i<result.length;i++) {
				Sales.update(result[i], {$set: {pushed: true}});
			}
			
			setParameter("lastPush", new Date());
		}
		
		// Reschedule push (not using setInterval to avoid overlapping calls)
		Meteor.setTimeout(function() {
			LighTPV.pushPendingSales();
		}, 10*1000);
	});
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